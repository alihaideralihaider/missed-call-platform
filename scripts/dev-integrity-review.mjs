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

const skillRules = [
  {
    skill: "saana-plan",
    reason: "All changes require planning and closure checks.",
    matches: () => true,
  },
  {
    skill: "saana-guard",
    reason: "All changes require guardrail review before commit/deploy.",
    matches: () => true,
  },
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

function getConfidence(changedFiles) {
  let score = 0.9;
  const adjustments = [];

  for (const rule of confidenceRules) {
    if (changedFiles.some(rule.matches)) {
      score -= rule.amount;
      adjustments.push(`-${rule.amount.toFixed(2)} ${rule.label}`);
    }
  }

  if (changedFiles.length > 10) {
    score -= 0.1;
    adjustments.push("-0.10 more than 10 files changed");
  }

  score = Math.max(0.1, Math.min(1, score));
  return { score, adjustments };
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

function runSmsComplianceRunner(files, diffAddedLines) {
  const findings = [];

  for (const file of files) {
    const content = readChangedFile(file);
    if (content === null) continue;

    const isMessagingFile = /(twilio|sms|consent|ivr|messaging|messages?)/i.test(file);
    if (!isMessagingFile) continue;

    if (/(send|message|sms|twilio)/i.test(content) && !/(STOP|HELP)/.test(content)) {
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
      file !== "scripts/dev-integrity-review.mjs" &&
      !file.startsWith("docs/reviews/")
  );
}

const statusOutput = runGit(["status", "--short"]);
const diffNameOutput = runGit(["diff", "--name-only"]);
const diffUnifiedOutput = runGit(["diff", "--unified=0"]);
const diffAddedLines = parseDiffAddedLines(diffUnifiedOutput);
const changedFiles = unique([
  ...expandChangedPaths(parseStatusPaths(statusOutput)),
  ...diffNameOutput.split("\n").filter(Boolean),
]);

const selected = [];
for (const rule of skillRules) {
  const matchedFiles = changedFiles.filter(rule.matches);
  if (changedFiles.length > 0 && matchedFiles.length > 0) {
    selected.push({
      skill: rule.skill,
      reason: rule.reason,
      files: matchedFiles,
    });
  }
}

const suggestedReviewOrder = [
  "saana-plan",
  "saana-guard",
  "saana-security-review",
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
  ["Critical", "High"].includes(finding.severity)
);
const { score, adjustments } = getConfidence(changedFiles);
const confidence = Number(score.toFixed(2));
const interpretation = interpretConfidence(confidence);
const riskyDetected = adjustments.length > 0;
const timestamp = new Date().toISOString();
const date = timestamp.slice(0, 10);
const evidencePath = path.join(
  repoRoot,
  "docs",
  "reviews",
  `${date}-dev-integrity-review.md`
);

const routingReasons = selected.map((entry) => {
  return `- ${entry.skill}: ${entry.reason}\n  Files: ${entry.files.join(", ")}`;
});

const evidence = `# Dev Integrity Review

Timestamp: ${timestamp}

## Changed Files

${markdownList(changedFiles)}

## Selected Skills

${markdownList(selected.map((entry) => entry.skill))}

## Routing Reasons

${routingReasons.length ? routingReasons.join("\n") : "- None"}

## Confidence

- Score: ${confidence.toFixed(2)}
- Interpretation: ${interpretation}
- Adjustments:
${adjustments.length ? adjustments.map((item) => `  - ${item}`).join("\n") : "  - None"}

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

mkdirSync(path.dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, evidence);

console.log("Dev Integrity Review");
console.log("====================");
console.log("");
console.log("Git status --short:");
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
console.log(`Evidence written: ${path.relative(repoRoot, evidencePath)}`);

if (blockingFindings.length || (riskyDetected && confidence < 0.7)) {
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
