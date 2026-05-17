#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const args = new Set(process.argv.slice(2));
const shouldWriteEvidence = args.has("--write-evidence") && !args.has("--no-evidence");
const shouldPrintJson = args.has("--json");
const useStaged = args.has("--staged");
const defaultEvidenceDir = "docs/reviews";
const defaultBlockOn = ["Critical", "High"];
const defaultReviewsToSkills = {
  plan: "saana-plan",
  guard: "saana-guard",
};
const projectMapRelativePath = "docs/architecture/project-map.json";
const projectMapAbsolutePath = path.join(repoRoot, projectMapRelativePath);

function loadIntegrityConfig() {
  const configPath = path.join(repoRoot, "authtoolkit.integrity.json");
  const stat = statSync(configPath, { throwIfNoEntry: false });

  if (!stat?.isFile()) {
    console.warn(
      "Warning: authtoolkit.integrity.json not found; using built-in Dev Integrity defaults."
    );
    return {
      config: null,
      configFileUsed: false,
      configPath: null,
    };
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    return {
      config,
      configFileUsed: true,
      configPath: path.relative(repoRoot, configPath),
    };
  } catch (error) {
    console.warn(
      `Warning: failed to read authtoolkit.integrity.json; using built-in Dev Integrity defaults. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      config: null,
      configFileUsed: false,
      configPath: null,
    };
  }
}

const {
  config: integrityConfig,
  configFileUsed,
  configPath: integrityConfigPath,
} = loadIntegrityConfig();
const project = typeof integrityConfig?.project === "string" ? integrityConfig.project : null;
const stack = typeof integrityConfig?.stack === "string" ? integrityConfig.stack : null;
const evidenceDir =
  typeof integrityConfig?.evidence?.path === "string" &&
  integrityConfig.evidence.path.trim()
    ? integrityConfig.evidence.path.trim()
    : defaultEvidenceDir;
const blockOn =
  Array.isArray(integrityConfig?.blockOn) && integrityConfig.blockOn.length
    ? integrityConfig.blockOn.map((value) => String(value))
    : defaultBlockOn;
const configuredDefaultReviewSkills =
  Array.isArray(integrityConfig?.defaultReviews) && integrityConfig.defaultReviews.length
    ? integrityConfig.defaultReviews
        .map((review) => defaultReviewsToSkills[String(review)])
        .filter(Boolean)
    : [];
const defaultReviewSkills = configuredDefaultReviewSkills.length
  ? configuredDefaultReviewSkills
  : ["saana-plan", "saana-guard"];

function loadProjectMap() {
  const stat = statSync(projectMapAbsolutePath, { throwIfNoEntry: false });

  if (!stat?.isFile()) {
    return {
      projectMap: null,
      projectMapUsed: false,
      projectMapPath: null,
    };
  }

  try {
    const projectMap = JSON.parse(readFileSync(projectMapAbsolutePath, "utf8"));
    return {
      projectMap,
      projectMapUsed: true,
      projectMapPath: projectMapRelativePath,
    };
  } catch (error) {
    console.warn(
      `Warning: failed to read ${projectMapRelativePath}; continuing without architecture context. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      projectMap: null,
      projectMapUsed: false,
      projectMapPath: null,
    };
  }
}

const {
  projectMap,
  projectMapUsed,
  projectMapPath,
} = loadProjectMap();

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function parseStatusPaths(statusOutput) {
  if (!statusOutput) return [];

  return statusOutput
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(2).trim();
      const renameParts = rawPath.split(" -> ");
      return renameParts[renameParts.length - 1];
    });
}

function parseNameStatusPaths(nameStatusOutput) {
  if (!nameStatusOutput) return [];

  return nameStatusOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return parts[parts.length - 1];
    });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function listFilesRecursive(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = statSync(absolutePath, { throwIfNoEntry: false });

  if (!stat) return [relativePath];
  if (stat.isFile()) return [relativePath];
  if (!stat.isDirectory()) return [relativePath];

  const ignored = new Set([".git", "node_modules"]);
  const files = [];
  const entries = readdirSync(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;

    const childRelativePath = path.posix.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(childRelativePath));
    } else if (entry.isFile()) {
      files.push(childRelativePath);
    }
  }

  return files.length ? files : [relativePath];
}

function expandChangedPaths(paths) {
  return paths.flatMap((changedPath) => {
    if (changedPath.endsWith("/")) {
      return listFilesRecursive(changedPath.replace(/\/+$/, ""));
    }

    return [changedPath];
  });
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pattern.test(file));
}

const defaultSkillReasons = {
  "saana-plan": "All changes require planning and closure checks.",
  "saana-guard": "All changes require guardrail review before commit/deploy.",
};

const defaultReviewRules = defaultReviewSkills.map((skill) => ({
  skill,
  reason: defaultSkillReasons[skill] || "Default review from integrity config.",
  matches: () => true,
}));

const builtInProjectSkillRules = [
  {
    skill: "saana-security-review",
    reason: "Auth, login, admin, API, Supabase, or webhook paths changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)(auth|login|admin|api|supabase|webhooks?)(\/|\.|-|$)/i,
      ]),
  },
  {
    skill: "saana-sms-compliance-review",
    reason: "Twilio, SMS, consent, IVR, or messaging paths changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)(twilio|sms|consent|ivr|messaging|messages?)(\/|\.|-|$)/i,
      ]),
  },
  {
    skill: "saana-payment-review",
    reason: "Stripe, billing, checkout, payment, or pricing paths changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)(stripe|billing|checkout|payment|payments|pricing)(\/|\.|-|$)/i,
      ]),
  },
  {
    skill: "saana-restaurant-ux-review",
    reason: "Restaurant, hub, cart, menu, orders, kitchen, or admin UI paths changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)app\/r\//i,
        /(^|\/)(hub|cart|menu|orders|kitchen)(\/|\.|-|$)/i,
        /(^|\/)app\/admin\//i,
        /(^|\/)components\/.*admin/i,
      ]),
  },
  {
    skill: "saana-browser-qa",
    reason: "UI, route, form, or page files changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)(app|pages|routes|forms?)(\/|$)/i,
        /\.(tsx|jsx)$/i,
      ]),
  },
  {
    skill: "saana-post-deploy-canary",
    reason: "Wrangler, Cloudflare, environment, or deploy paths changed.",
    matches: (file) =>
      matchesAny(file, [
        /(^|\/)(wrangler|cloudflare|deploy|deployment|env)(\/|\.|-|$)/i,
        /(^|\/)\.env/i,
        /wrangler\.(toml|jsonc?)$/i,
      ]),
  },
];

function getConfiguredRoutingRules() {
  if (!Array.isArray(integrityConfig?.routing) || integrityConfig.routing.length === 0) {
    return null;
  }

  const rules = integrityConfig.routing
    .map((route) => {
      const skill = typeof route?.skill === "string" ? route.skill.trim() : "";
      const reason =
        typeof route?.reason === "string"
          ? route.reason.trim()
          : "Configured path routing rule matched.";
      const matchTerms = Array.isArray(route?.match)
        ? route.match.map((term) => String(term)).filter(Boolean)
        : [];

      if (!skill || matchTerms.length === 0) return null;

      return {
        skill,
        reason,
        matches: (file) => matchTerms.some((term) => matchTerm(file, term)),
      };
    })
    .filter(Boolean);

  if (!rules.length) return null;
  return rules;
}

function getProjectSkillRules() {
  const configuredRoutingRules = getConfiguredRoutingRules();

  if (configuredRoutingRules) {
    return configuredRoutingRules;
  }

  console.warn(
    "Warning: config routing missing or invalid; using built-in SaanaOS routing defaults."
  );
  return builtInProjectSkillRules;
}

const skillRules = [...defaultReviewRules, ...getProjectSkillRules()];

const confidenceRules = [
  {
    label: "auth/session/tenant/security files",
    amount: 0.2,
    matches: (file) =>
      matchesAny(file, [
        /(auth|login|session|tenant|security|admin|webhooks?)/i,
      ]),
  },
  {
    label: "payment/pricing files",
    amount: 0.2,
    matches: (file) => matchesAny(file, [/(stripe|billing|checkout|payment|pricing)/i]),
  },
  {
    label: "SMS/compliance files",
    amount: 0.2,
    matches: (file) => matchesAny(file, [/(twilio|sms|consent|ivr|messaging|compliance)/i]),
  },
  {
    label: "Supabase/service-role/RLS files",
    amount: 0.15,
    matches: (file) => matchesAny(file, [/(supabase|service-role|service_role|rls)/i]),
  },
  {
    label: "deployment/env files",
    amount: 0.15,
    matches: (file) =>
      matchesAny(file, [/(wrangler|cloudflare|deploy|deployment|env|\.env)/i]),
  },
];

function matchTerm(file, term) {
  const normalizedFile = file.toLowerCase();
  const normalizedTerm = String(term || "").toLowerCase();

  if (!normalizedTerm) return false;

  if (
    normalizedTerm.includes("/") ||
    normalizedTerm.startsWith(".") ||
    normalizedTerm.includes("[")
  ) {
    return normalizedFile.includes(normalizedTerm);
  }

  const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\/._-])${escapedTerm}($|[\\/._-])`).test(
    normalizedFile
  );
}

function getConfiguredConfidenceRules() {
  const configuredDeductions = integrityConfig?.confidence?.deductions;

  if (!Array.isArray(configuredDeductions) || configuredDeductions.length === 0) {
    return null;
  }

  return configuredDeductions
    .map((deduction) => {
      const amount = Number(deduction?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;

      const matchTerms = Array.isArray(deduction?.match)
        ? deduction.match.map((term) => String(term)).filter(Boolean)
        : [];
      const condition =
        typeof deduction?.condition === "string" ? deduction.condition : "";
      const label = String(deduction?.reason || "configured confidence deduction");

      return {
        label,
        amount,
        matches: (file) => matchTerms.some((term) => matchTerm(file, term)),
        condition,
      };
    })
    .filter(Boolean);
}

function getConfidence(changedFiles) {
  let score = 0.9;
  const adjustments = [];
  const configuredConfidenceRules = getConfiguredConfidenceRules();
  const activeConfidenceRules = configuredConfidenceRules || confidenceRules;

  for (const rule of activeConfidenceRules) {
    const matchTriggered = changedFiles.some(rule.matches);
    const conditionTriggered =
      rule.condition === "changedFiles.length > 10" && changedFiles.length > 10;

    if (matchTriggered || conditionTriggered) {
      score -= rule.amount;
      adjustments.push(`-${rule.amount.toFixed(2)} ${rule.label}`);
    }
  }

  if (!configuredConfidenceRules && changedFiles.length > 10) {
    score -= 0.1;
    adjustments.push("-0.10 more than 10 files changed");
  }

  score = Math.min(1, score);
  return { score, adjustments };
}

// Future: make architecture confidence deductions configurable in authtoolkit.integrity.json.
const architectureConfidenceRules = [
  {
    key: "risk:tenant-boundary",
    label: "architecture risk tag tenant-boundary",
    amount: 0.15,
    matches: (context) => context.risk_tags.includes("tenant-boundary"),
  },
  {
    key: "risk:service-role",
    label: "architecture risk tag service-role",
    amount: 0.15,
    matches: (context) => context.risk_tags.includes("service-role"),
  },
  {
    key: "risk:customer-data",
    label: "architecture risk tag customer-data",
    amount: 0.1,
    matches: (context) => context.risk_tags.includes("customer-data"),
  },
  {
    key: "risk:payment",
    label: "architecture risk tag payment",
    amount: 0.15,
    matches: (context) => context.risk_tags.includes("payment"),
  },
  {
    key: "risk:webhook",
    label: "architecture risk tag webhook",
    amount: 0.1,
    matches: (context) => context.risk_tags.includes("webhook"),
  },
  {
    key: "risk:sms-consent",
    label: "architecture risk tag sms-consent",
    amount: 0.1,
    matches: (context) => context.risk_tags.includes("sms-consent"),
  },
  {
    key: "risk:secrets",
    label: "architecture risk tag secrets",
    amount: 0.15,
    matches: (context) => context.risk_tags.includes("secrets"),
  },
  {
    key: "risk:session-cookie",
    label: "architecture risk tag session-cookie",
    amount: 0.1,
    matches: (context) => context.risk_tags.includes("session-cookie"),
  },
  {
    key: "risk:file-upload",
    label: "architecture risk tag file-upload",
    amount: 0.1,
    matches: (context) => context.risk_tags.includes("file-upload"),
  },
  {
    key: "trust:tenant_admin",
    label: "architecture trust boundary tenant_admin",
    amount: 0.1,
    matches: (context) => context.trust_boundary === "tenant_admin",
  },
  {
    key: "trust:service_role",
    label: "architecture trust boundary service_role",
    amount: 0.15,
    matches: (context) => context.trust_boundary === "service_role",
  },
  {
    key: "status:needs_review",
    label: "architecture node status needs_review",
    amount: 0.15,
    matches: (context) => context.status === "needs_review",
  },
  {
    key: "status:partial",
    label: "architecture node status partial",
    amount: 0.05,
    matches: (context) => context.status === "partial",
  },
  {
    key: "confidence:below_70",
    label: "architecture node confidence below 70",
    amount: 0.1,
    matches: (context) => Number.isFinite(context.confidence) && context.confidence < 70,
  },
];

function getArchitectureConfidenceAdjustments(contexts) {
  if (!projectMapUsed || !contexts.length) return [];

  // Dev Integrity tooling may contain scanner keywords that describe risks; those
  // keywords should not be treated as app runtime exposure.
  const runtimeContexts = contexts.filter((context) => !isDevIntegrityToolingOrDocs(context.file));
  if (!runtimeContexts.length) return [];

  const applied = new Set();
  const adjustments = [];

  for (const rule of architectureConfidenceRules) {
    if (applied.has(rule.key)) continue;

    if (runtimeContexts.some(rule.matches)) {
      applied.add(rule.key);
      adjustments.push(`-${rule.amount.toFixed(2)} ${rule.label}`);
    }
  }

  return adjustments;
}

function getAdjustmentTotal(adjustments) {
  return adjustments.reduce((total, adjustment) => {
    const match = adjustment.match(/^-([0-9.]+)/);
    return total + (match ? Number(match[1]) : 0);
  }, 0);
}

function interpretConfidence(score) {
  if (score >= 0.9) return "safe auto-fix candidate";
  if (score >= 0.7) return "propose fix/review before applying";
  if (score >= 0.4) return "block auto-fix";
  return "block and escalate";
}

function markdownList(values) {
  if (!values.length) return "- None";
  return values.map((value) => `- ${value}`).join("\n");
}

function parseDiffAddedLines(diffOutput) {
  const byFile = new Map();
  let currentFile = null;
  let newLine = null;

  for (const rawLine of diffOutput.split("\n")) {
    if (rawLine.startsWith("diff --git ")) {
      currentFile = null;
      newLine = null;
      continue;
    }

    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice("+++ b/".length);
      if (!byFile.has(currentFile)) byFile.set(currentFile, []);
      continue;
    }

    if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/\+(\d+)(?:,(\d+))?/);
      newLine = match ? Number(match[1]) : null;
      continue;
    }

    if (!currentFile || newLine === null) continue;

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      byFile.get(currentFile).push({
        file: currentFile,
        line: newLine,
        text: rawLine.slice(1),
      });
      newLine += 1;
      continue;
    }

    if (rawLine.startsWith("-")) continue;

    if (!rawLine.startsWith("\\")) {
      newLine += 1;
    }
  }

  return byFile;
}

function hasSkill(selectedSkills, skill) {
  return selectedSkills.some((entry) => entry.skill === skill);
}

function getProjectMapNodeByPath(file) {
  if (!projectMapUsed || !Array.isArray(projectMap?.nodes)) return null;

  return projectMap.nodes.find((node) => node?.path === file) || null;
}

function getArchitectureContext(file) {
  const node = getProjectMapNodeByPath(file);
  if (!node) return null;

  return {
    file,
    classification: node.classification || "unknown",
    trust_boundary: node.trust_boundary || "unknown",
    access_level: node.access_level || "unknown",
    risk_tags: Array.isArray(node.risk_tags) ? node.risk_tags : [],
    review_packs: Array.isArray(node.review_packs) ? node.review_packs : [],
    external_services: Array.isArray(node.external_services) ? node.external_services : [],
    env_vars: Array.isArray(node.env_vars) ? node.env_vars : [],
    confidence: Number.isFinite(Number(node.confidence)) ? Number(node.confidence) : null,
    status: node.status || "unknown",
  };
}

function mergeSelectedSkill(selectedSkills, skill, reason, files) {
  const matchedFiles = unique(files);
  if (!matchedFiles.length) return;

  const existing = selectedSkills.find((entry) => entry.skill === skill);

  if (existing) {
    if (!existing.reason.includes(reason)) {
      existing.reason = `${existing.reason} ${reason}`;
    }
    existing.files = unique([...existing.files, ...matchedFiles]);
    return;
  }

  selectedSkills.push({
    skill,
    reason,
    files: matchedFiles,
  });
}

function isRouteOrPageArchitectureContext(context) {
  const node = getProjectMapNodeByPath(context.file);
  return ["page_route", "api_route", "webhook_route"].includes(node?.type);
}

function getArchitectureSkillsForContext(context) {
  const skills = new Set();
  const riskTags = new Set(context.risk_tags);
  const isPaymentRelated =
    riskTags.has("payment") ||
    context.classification === "payment_route" ||
    context.external_services.includes("stripe");

  for (const tag of riskTags) {
    if (
      [
        "auth",
        "tenant-boundary",
        "api-exposure",
        "secrets",
        "service-role",
        "customer-data",
        "session-cookie",
        "file-upload",
        "admin",
      ].includes(tag)
    ) {
      skills.add("saana-security-review");
    }

    if (tag === "payment") {
      skills.add("saana-payment-review");
    }

    if (tag === "webhook") {
      skills.add("saana-security-review");
      if (isPaymentRelated) skills.add("saana-payment-review");
    }

    if (tag === "sms-consent") {
      skills.add("saana-sms-compliance-review");
    }

    if (tag === "public" && isRouteOrPageArchitectureContext(context)) {
      skills.add("saana-browser-qa");
    }

    if (tag === "production-deploy") {
      skills.add("saana-post-deploy-canary");
    }

    if (tag === "vault" || tag === "secrets" || tag === "service-role") {
      skills.add("vault-integrity-review");
    }

    if (tag === "runtime-binding") {
      skills.add("runtime-binding-review");
    }

    if (tag === "recovery") {
      skills.add("vault-recovery-review");
    }
  }

  return [...skills].sort();
}

function architectureReasonForContext(context) {
  return `Project map marks this file as ${context.classification} with ${context.risk_tags.join(", ") || "no"} risk tags.`;
}

function isDevIntegrityToolingOrDocs(file) {
  return (
    /^scripts\/dev-integrity-/i.test(file) ||
    /^docs\/products\//i.test(file) ||
    /^docs\/agents\//i.test(file) ||
    /^docs\/reviews\//i.test(file) ||
    file === "docs/architecture/project-map.json" ||
    file === "docs/architecture/project-map-summary.md" ||
    file === "authtoolkit.integrity.json"
  );
}

function readChangedFile(file) {
  const absolutePath = path.join(repoRoot, file);
  const stat = statSync(absolutePath, { throwIfNoEntry: false });

  if (!stat?.isFile()) return null;

  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

function scanLines(file, content, callback) {
  if (content === null) return [];

  return content.split("\n").flatMap((line, index) => {
    const finding = callback(line, index + 1);
    return finding ? [{ file, line: index + 1, ...finding }] : [];
  });
}

function getDiffLinesForFile(file, diffAddedLines) {
  const diffLines = diffAddedLines.get(file);
  if (diffLines?.length) return diffLines;

  const content = readChangedFile(file);
  if (content === null) return [];

  return content.split("\n").map((text, index) => ({
    file,
    line: index + 1,
    text,
    fallback: true,
  }));
}

function isServerOrHelperFile(file) {
  return (
    /(^|\/)(app\/api|lib\/supabase|server|route\.ts|route\.tsx)(\/|$|\.)/i.test(file) ||
    /\.server\.(ts|tsx|js|jsx)$/i.test(file)
  );
}

function createFinding({
  runner,
  severity,
  file,
  line,
  scope,
  message,
  suggestedAction,
}) {
  return {
    runner,
    severity,
    file,
    line: line ?? null,
    scope,
    message,
    suggestedAction,
  };
}

function runSecurityRunner(files, diffAddedLines) {
  const findings = [];

  for (const file of files) {
    const content = readChangedFile(file);
    if (content === null) continue;

    for (const diffLine of getDiffLinesForFile(file, diffAddedLines)) {
      const line = diffLine.text;
      const scope = diffLine.fallback ? "file-level" : "diff-line";

      if (
        /NextResponse\.json\s*\([^)]*error\s*:\s*[^)]*error\.message/i.test(line) ||
        /Response\.json\s*\([^)]*error\s*:\s*[^)]*error\.message/i.test(line) ||
        /error\s*:\s*error\.message/i.test(line)
      ) {
        findings.push(
          createFinding({
            runner: "security",
            severity: "High",
            file,
            line: diffLine.line,
            scope,
            message: "API response appears to return raw error.message.",
            suggestedAction:
              "Return a generic client-safe error and keep detailed error context in server logs.",
          })
        );
      }

      if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|KEY|PASSWORD|PRIVATE)/.test(line)) {
        findings.push(
          createFinding({
            runner: "security",
            severity: "Critical",
            file,
            line: diffLine.line,
            scope,
            message: "NEXT_PUBLIC variable name appears secret-like.",
            suggestedAction:
              "Move secret-like values to server-only environment variables and keep them out of client bundles.",
          })
        );
      }

      if (
        /(redirect|redirectTo|returnUrl|callbackUrl).*(searchParams|get\(|query|req\.url|URLSearchParams)/i.test(
          line
        )
      ) {
        findings.push(
          createFinding({
            runner: "security",
            severity: "High",
            file,
            line: diffLine.line,
            scope,
            message: "Redirect logic may use user-controlled URL input.",
            suggestedAction:
              "Validate redirect destinations against an allowlist or convert to safe internal paths.",
          })
        );
      }

      if (
        /console\.log/i.test(line) &&
        /(token|secret|password|payload|phone|payment|card|customer|authorization)/i.test(line)
      ) {
        findings.push(
          createFinding({
            runner: "security",
            severity: "High",
            file,
            line: diffLine.line,
            scope,
            message:
              "console.log appears to include sensitive token/secret/payload/phone/payment/customer data.",
            suggestedAction:
              "Remove the log or redact sensitive fields before logging.",
          })
        );
      }
    }

    if (/SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i.test(content) && !isServerOrHelperFile(file)) {
      findings.push(
        createFinding({
          runner: "security",
          severity: "Critical",
          file,
          scope: "file-level",
          message: "Service-role usage appears outside a server/helper file.",
          suggestedAction:
            "Move service-role access behind a server-only helper/API route and keep it out of client-reachable code.",
        })
      );
    }
  }

  return findings;
}

function runPaymentRunner(files, diffAddedLines) {
  const findings = [];
  const pricingConstantPattern =
    /\b(?:PRICE|PRICING|PLAN|SETUP_FEE|MONTHLY|SUBSCRIPTION|AMOUNT|TOTAL)_?[A-Z0-9_]*\s*=\s*\d+/;

  for (const file of files) {
    const content = readChangedFile(file);
    if (content === null) continue;

    const lowerFile = file.toLowerCase();
    const isWebhook = lowerFile.includes("webhook");
    const isPaymentFile = /(stripe|billing|checkout|payment|pricing)/i.test(file);

    if (isWebhook && /stripe/i.test(content) && !/signature|constructEvent|webhookSecret/i.test(content)) {
      findings.push(
        createFinding({
          runner: "payment",
          severity: "Critical",
          file,
          scope: "file-level",
          message: "Stripe webhook-related file changed without signature verification keyword.",
          suggestedAction:
            "Verify Stripe webhook signatures before trusting event payloads.",
        })
      );
    }

    if (isPaymentFile && !/idempotency|idempotent/i.test(content)) {
      findings.push(
        createFinding({
          runner: "payment",
          severity: "Medium",
          file,
          scope: "file-level",
          message: "Checkout/payment file changed without idempotency keyword.",
          suggestedAction:
            "Confirm provider calls and state transitions are idempotent or document why not applicable.",
        })
      );
    }

    for (const diffLine of getDiffLinesForFile(file, diffAddedLines)) {
      const line = diffLine.text;
      const scope = diffLine.fallback ? "file-level" : "diff-line";

      if (
        pricingConstantPattern.test(line) &&
        !/^docs\/pricing\//i.test(file) &&
        !/(pricing|price).*\.(json|ts|js|mjs|md)$/i.test(path.basename(file))
      ) {
        findings.push(
          createFinding({
            runner: "payment",
            severity: "Medium",
            file,
            line: diffLine.line,
            scope,
            message: "Pricing-like numeric constant changed outside docs/pricing or pricing config.",
            suggestedAction:
              "Move pricing to a pricing config/source of truth or document why the constant is not pricing.",
          })
        );
      }

      if (
        /(success page|success redirect|redirect success|payment.*complete|mark.*paid)/i.test(line) &&
        !/(webhook|provider confirmation|confirmed by provider)/i.test(line)
      ) {
        findings.push(
          createFinding({
            runner: "payment",
            severity: "High",
            file,
            line: diffLine.line,
            scope,
            message:
              "Payment success language may rely on redirect/success page rather than trusted provider confirmation.",
            suggestedAction:
              "Ensure payment completion is based on trusted provider webhook/confirmation, not browser redirect alone.",
          })
        );
      }
    }
  }

  return findings;
}

function isTwilioVerifyOtpTransportOnly(file, content) {
  const hasVerifyPath = /twilio-verify/i.test(file);
  const usesTwilioVerifyApi = /verify\.twilio\.com/i.test(content);
  const usesVerifyEndpoint = /VerificationCheck|Verifications/i.test(content);
  const sendsSmsChannel =
    /Channel\s*:\s*["']sms["']/i.test(content) ||
    /Channel\s*=\s*["']sms["']/i.test(content);
  const definesCustomerMessageCopy =
    /\bBody\s*:/.test(content) ||
    /\b(messageBody|smsBody|bodyText|template)\b/i.test(content) ||
    /(marketing copy|missed-call copy|missed_call copy)/i.test(content);

  return (
    hasVerifyPath &&
    usesTwilioVerifyApi &&
    usesVerifyEndpoint &&
    sendsSmsChannel &&
    !definesCustomerMessageCopy
  );
}

function runSmsComplianceRunner(files, diffAddedLines) {
  const findings = [];

  for (const file of files) {
    const content = readChangedFile(file);
    if (content === null) continue;

    const isMessagingFile = /(twilio|sms|consent|ivr|messaging|messages?)/i.test(file);
    if (!isMessagingFile) continue;

    const isOtpTransportOnly = isTwilioVerifyOtpTransportOnly(file, content);

    // Twilio Verify OTP transport helpers do not necessarily contain
    // app-authored STOP/HELP copy, so transport-only helper changes should not
    // be treated as customer-facing SMS copy changes.
    if (isOtpTransportOnly) {
      findings.push(
        createFinding({
          runner: "sms-compliance",
          severity: "Low",
          file,
          scope: "file-level",
          message:
            "Twilio Verify OTP helper changed. Confirm OTP/transactional messaging expectations and provider configuration.",
          suggestedAction:
            "Verify Twilio Verify service configuration and confirm this helper does not define app-authored customer SMS copy.",
        })
      );
    }

    if (
      !isOtpTransportOnly &&
      /(send|message|sms|twilio)/i.test(content) &&
      !/(STOP|HELP)/.test(content)
    ) {
      findings.push(
        createFinding({
          runner: "sms-compliance",
          severity: "High",
          file,
          message: "SMS/Twilio/message flow changed without STOP/HELP language.",
          suggestedAction:
            "Confirm required STOP/HELP language exists in customer-facing SMS copy or document why not applicable.",
        })
      );
    }

    for (const diffLine of getDiffLinesForFile(file, diffAddedLines)) {
      const line = diffLine.text;
      const scope = diffLine.fallback ? "file-level" : "diff-line";

      if (/(checked|defaultChecked)\s*=\s*[{]?true/i.test(line)) {
        findings.push(
          createFinding({
            runner: "sms-compliance",
            severity: "Critical",
            file,
            line: diffLine.line,
            scope,
            message: "Opt-in checkbox appears default checked.",
            suggestedAction:
              "Ensure consent opt-in is affirmative and not preselected.",
          })
        );
      }

      if (/consent/i.test(line) && !/(frequency|message frequency|data rates|message rates|msg rates)/i.test(content)) {
        findings.push(
          createFinding({
            runner: "sms-compliance",
            severity: "Medium",
            file,
            line: diffLine.line,
            scope,
            message:
              "Consent language changed without message frequency/data rates language nearby.",
            suggestedAction:
              "Confirm message frequency and data/message rates disclosures are present where required.",
          })
        );
      }

      if (/marketing/i.test(line) && /transactional/i.test(content)) {
        findings.push(
          createFinding({
            runner: "sms-compliance",
            severity: "High",
            file,
            line: diffLine.line,
            scope,
            message:
              "Marketing and transactional language appear in the same messaging flow.",
            suggestedAction:
              "Separate marketing and transactional messaging paths or document the boundary clearly.",
          })
        );
      }
    }
  }

  return findings;
}

function runBrowserQaRunner(files) {
  const routes = [];

  for (const file of files) {
    if (/app\/login/i.test(file)) {
      routes.push({
        route: "/login",
        reason: "Login page changed.",
      });
    }

    if (/app\/r\//i.test(file) || /(^|\/)hub(\/|\.|-|$)/i.test(file)) {
      routes.push({
        route: "/r/[slug]/hub",
        reason: "Restaurant public route or hub path changed.",
      });
    }

    if (/(checkout|cart)/i.test(file)) {
      routes.push({
        route: "/r/[slug]/checkout",
        reason: "Checkout/cart path changed.",
      });
    }

    if (/app\/admin/i.test(file)) {
      routes.push({
        route: "/admin",
        reason: "Admin route path changed.",
      });
    }
  }

  return unique(routes.map((entry) => `${entry.route}: ${entry.reason}`)).map(
    (message) =>
      createFinding({
        runner: "browser-qa",
        severity: "Low",
        file: "route-suggestion",
        scope: "file-level",
        message,
        suggestedAction:
          "No browser launched in v3. Manually run Browser QA for this likely affected route.",
      })
  );
}

function runDeterministicRunners(selectedSkills, changedFiles, diffAddedLines) {
  const findings = [];

  if (hasSkill(selectedSkills, "saana-security-review")) {
    findings.push(...runSecurityRunner(changedFiles, diffAddedLines));
  }

  if (hasSkill(selectedSkills, "saana-payment-review")) {
    findings.push(...runPaymentRunner(changedFiles, diffAddedLines));
  }

  if (hasSkill(selectedSkills, "saana-sms-compliance-review")) {
    findings.push(...runSmsComplianceRunner(changedFiles, diffAddedLines));
  }

  if (hasSkill(selectedSkills, "saana-browser-qa")) {
    findings.push(...runBrowserQaRunner(changedFiles));
  }

  return findings;
}

function formatFinding(finding) {
  const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
  return `- ${finding.runner} | ${finding.severity} | ${finding.scope} | ${location}: ${finding.message}\n  Suggested action: ${finding.suggestedAction}`;
}

function runnerScanFiles(files) {
  return files.filter(
    (file) =>
      file !== "authtoolkit.integrity.json" &&
      !/^scripts\/dev-integrity-/i.test(file) &&
      !file.startsWith("docs/reviews/")
  );
}

const statusOutput = useStaged
  ? runGit(["diff", "--cached", "--name-status"])
  : runGit(["status", "--short"]);
const diffNameOutput = useStaged
  ? runGit(["diff", "--cached", "--name-only"])
  : runGit(["diff", "--name-only"]);
const diffUnifiedOutput = useStaged
  ? runGit(["diff", "--cached", "--unified=0"])
  : runGit(["diff", "--unified=0"]);
const diffAddedLines = parseDiffAddedLines(diffUnifiedOutput);
const statusPaths = useStaged
  ? parseNameStatusPaths(statusOutput)
  : parseStatusPaths(statusOutput);
const changedFiles = unique([
  ...expandChangedPaths(statusPaths),
  ...diffNameOutput.split("\n").filter(Boolean),
]);
const changedFileArchitectureContext = changedFiles
  .map(getArchitectureContext)
  .filter(Boolean);

const selected = [];
for (const rule of skillRules) {
  const matchedFiles = changedFiles.filter(rule.matches);
  if (changedFiles.length > 0 && matchedFiles.length > 0) {
    const existing = selected.find((entry) => entry.skill === rule.skill);

    if (existing) {
      if (!existing.reason.includes(rule.reason)) {
        existing.reason = `${existing.reason} ${rule.reason}`;
      }
      existing.files = unique([...existing.files, ...matchedFiles]);
    } else {
      selected.push({
        skill: rule.skill,
        reason: rule.reason,
        files: matchedFiles,
      });
    }
  }
}

for (const context of changedFileArchitectureContext) {
  if (isDevIntegrityToolingOrDocs(context.file)) continue;

  const architectureSkills = getArchitectureSkillsForContext(context);
  const reason = architectureReasonForContext(context);

  for (const skill of architectureSkills) {
    mergeSelectedSkill(selected, skill, reason, [context.file]);
  }
}

const suggestedReviewOrder = [
  "saana-plan",
  "saana-guard",
  "saana-security-review",
  "vault-integrity-review",
  "runtime-binding-review",
  "vault-recovery-review",
  "saana-sms-compliance-review",
  "saana-payment-review",
  "saana-restaurant-ux-review",
  "saana-browser-qa",
  "saana-post-deploy-canary",
].filter((skill) => selected.some((entry) => entry.skill === skill));

const deterministicFindings = runDeterministicRunners(
  selected,
  runnerScanFiles(changedFiles),
  diffAddedLines
);
const blockingFindings = deterministicFindings.filter((finding) =>
  blockOn.includes(finding.severity)
);
const { score, adjustments } = getConfidence(changedFiles);
const architectureConfidenceAdjustments = getArchitectureConfidenceAdjustments(
  changedFileArchitectureContext
);
const architectureConfidenceDeduction = getAdjustmentTotal(architectureConfidenceAdjustments);
const confidence = Number(Math.max(0.1, Math.min(1, score - architectureConfidenceDeduction)).toFixed(2));
const interpretation = interpretConfidence(confidence);
const riskyDetected = adjustments.length > 0 || architectureConfidenceAdjustments.length > 0;
const timestamp = new Date().toISOString();
const date = timestamp.slice(0, 10);
const evidencePath = path.join(
  repoRoot,
  evidenceDir,
  `${date}-dev-integrity-review.md`
);
let writtenEvidencePath = null;

const routingReasons = selected.map((entry) => {
  return `- ${entry.skill}: ${entry.reason}\n  Files: ${entry.files.join(", ")}`;
});

const evidence = `# Dev Integrity Review

Timestamp: ${timestamp}

## Config

- Project: ${project || "unknown"}
- Stack: ${stack || "unknown"}
- Config file used: ${configFileUsed ? "true" : "false"}
- Config path: ${integrityConfigPath || "none"}
- Project map used: ${projectMapUsed ? "true" : "false"}
- Project map path: ${projectMapPath || "none"}
- Architecture confidence: ${projectMap?.summary?.architecture_confidence ?? "unknown"}
- Architecture snapshot ID: ${projectMap?.snapshot_id ?? "unknown"}

## Changed Files

${markdownList(changedFiles)}

## Changed File Architecture Context

${changedFileArchitectureContext.length ? changedFileArchitectureContext.map((context) => {
  return `- ${context.file}
  - classification: ${context.classification}
  - trust boundary: ${context.trust_boundary}
  - access level: ${context.access_level}
  - risk tags: ${context.risk_tags.join(", ") || "none"}
  - review packs: ${context.review_packs.join(", ") || "none"}
  - external services: ${context.external_services.join(", ") || "none"}
  - env vars: ${context.env_vars.join(", ") || "none"}
  - confidence: ${context.confidence ?? "unknown"}
  - status: ${context.status}`;
}).join("\n") : "- None"}

## Selected Skills

${markdownList(selected.map((entry) => entry.skill))}

## Routing Reasons

${routingReasons.length ? routingReasons.join("\n") : "- None"}

## Confidence

- Score: ${confidence.toFixed(2)}
- Interpretation: ${interpretation}
- Path/config adjustments:
${adjustments.length ? adjustments.map((item) => `  - ${item}`).join("\n") : "  - None"}
- Architecture confidence adjustments:
${architectureConfidenceAdjustments.length ? architectureConfidenceAdjustments.map((item) => `  - ${item}`).join("\n") : "  - None"}

## Suggested Review Order

${markdownList(suggestedReviewOrder)}

## Deterministic Runner Findings

${deterministicFindings.length ? deterministicFindings.map(formatFinding).join("\n") : "- None"}

Notes:

- Diff-line findings are likely introduced or touched by this change.
- File-level findings may require review because the changed file belongs to a risky area.

## Notes

- This v3 script does not run AI review.
- This v3 script does not apply fixes.
- Manual/agent review is required for any blocked or high-risk result.
`;

const exitReasons = [];

if (blockingFindings.length) {
  exitReasons.push("Critical/High deterministic findings exist");
}

if (riskyDetected && confidence < 0.7) {
  exitReasons.push("confidence is below 0.70");
}

if (shouldWriteEvidence) {
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, evidence);
  writtenEvidencePath = path.relative(repoRoot, evidencePath);
}

const jsonSummary = {
  project,
  stack,
  configFileUsed,
  ...(integrityConfigPath ? { configPath: integrityConfigPath } : {}),
  projectMapUsed,
  ...(projectMapPath ? { projectMapPath } : {}),
  ...(projectMap?.summary?.architecture_confidence !== undefined
    ? { architectureConfidence: projectMap.summary.architecture_confidence }
    : {}),
  ...(projectMap?.snapshot_id ? { architectureSnapshotId: projectMap.snapshot_id } : {}),
  changedFiles,
  changedFileArchitectureContext,
  selectedSkills: selected.map((entry) => entry.skill),
  routingReasons: selected.map((entry) => ({
    skill: entry.skill,
    reason: entry.reason,
    files: entry.files,
  })),
  confidenceScore: confidence,
  confidenceInterpretation: interpretation,
  confidenceAdjustments: adjustments,
  architectureConfidenceAdjustments,
  deterministicFindings,
  suggestedReviewOrder,
  exitReason: exitReasons.length ? exitReasons.join("; ") : "passed",
  ...(writtenEvidencePath ? { evidencePath: writtenEvidencePath } : {}),
};

if (shouldPrintJson) {
  console.log(JSON.stringify(jsonSummary, null, 2));

  if (exitReasons.length) {
    process.exit(1);
  }

  process.exit(0);
}

console.log("Dev Integrity Review");
console.log("====================");
console.log("");
console.log(`Mode: ${useStaged ? "staged" : "working tree"}`);
console.log(`Evidence: ${shouldWriteEvidence ? "write" : "not written"}`);
console.log(`Config: ${configFileUsed ? integrityConfigPath : "built-in defaults"}`);
if (project || stack) {
  console.log(`Project: ${project || "unknown"}${stack ? ` (${stack})` : ""}`);
}
console.log("");
console.log(useStaged ? "Git staged name-status:" : "Git status --short:");
console.log(statusOutput || "(clean)");
console.log("");
console.log("Changed files:");
console.log(markdownList(changedFiles));
console.log("");
console.log("Selected skills:");
for (const entry of selected) {
  console.log(`- ${entry.skill}: ${entry.reason}`);
}
if (!selected.length) console.log("- None");
console.log("");
console.log("Suggested review order:");
console.log(markdownList(suggestedReviewOrder));
console.log("");
console.log(`Confidence score: ${confidence.toFixed(2)}`);
console.log(`Interpretation: ${interpretation}`);
if (adjustments.length) {
  console.log("Adjustments:");
  for (const item of adjustments) console.log(`- ${item}`);
}
console.log("");
console.log("Deterministic runner findings:");
if (deterministicFindings.length) {
  for (const finding of deterministicFindings) console.log(formatFinding(finding));
} else {
  console.log("- None");
}
console.log("");
if (writtenEvidencePath) {
  console.log(`Evidence written: ${writtenEvidencePath}`);
} else {
  console.log("Evidence not written. Use --write-evidence to create docs/reviews output.");
}

if (exitReasons.length) {
  if (blockingFindings.length) {
    console.error(
      "Manual/agent review is required before commit because Critical/High deterministic findings exist."
    );
  }

  if (riskyDetected && confidence < 0.7) {
    console.error(
      "Manual/agent review is required before commit because confidence is below 0.70."
    );
  }

  process.exit(1);
}

process.exit(0);
