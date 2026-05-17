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
const outputPath = path.join(repoRoot, "docs", "architecture", "project-map.json");
const summaryOutputPath = path.join(repoRoot, "docs", "architecture", "project-map-summary.md");
const secretInventoryRelativePath = "docs/agents/inventories/saanaos-secret-inventory.md";
const secretInventoryPath = path.join(repoRoot, secretInventoryRelativePath);
const schemaVersion = "0.1";

const ignoredPathParts = new Set([
  ".git",
  "node_modules",
  ".next",
  ".open-next",
  ".wrangler",
  "dist",
  "build",
  "coverage",
  "output",
]);

const ignoredExactFiles = new Set(["package-lock.json", "project-map.json", "project-map-summary.md"]);
const ignoredPrefixes = ["docs/reviews/"];
const binaryExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".sqlite",
  ".sqlite-shm",
  ".sqlite-wal",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const routeParamPatterns = [
  "[slug]",
  "[restaurantId]",
  "[accountId]",
  "[tenantId]",
  "[workspaceId]",
];

const webhookKeywords = ["webhook", "twilio", "stripe", "resend", "inbound", "callback"];
const tenantGuardKeywords = [
  "tenant",
  "restaurantmembership",
  "restaurant_membership",
  "membership",
  "assertrestaurant",
  "requiretenant",
  "requireadmin",
  "authoriz",
  "getplatformsession",
];
const webhookTrustKeywords = ["signature", "webhook_secret", "validate", "verify", "constructevent"];
const paymentStateKeywords = ["webhook", "idempot", "payment_intent", "checkout.session", "constructevent"];
const fileUploadKeywords = ["upload", "multipart", "formdata", "blob", "storage"];
const authKeywords = ["auth", "login", "logout", "signout", "session", "otp", "callback"];
const customerDataKeywords = [
  "customer",
  "order",
  "phone",
  "email",
  "address",
  "lead",
  "restaurant",
  "reservation",
];

const serviceDefinitions = [
  {
    id: "service_supabase",
    provider: "Supabase",
    purpose: "database, auth, storage",
    patterns: [/supabase/i, /SUPABASE_/],
    riskTags: ["database", "auth"],
    failureImpact: "Database, auth, storage, or service-role backed workflows may fail.",
  },
  {
    id: "service_stripe",
    provider: "Stripe",
    purpose: "payment processing",
    patterns: [/stripe/i, /STRIPE_/],
    riskTags: ["payment", "webhook"],
    failureImpact: "Checkout, billing, subscription, or payment confirmation may fail.",
  },
  {
    id: "service_twilio",
    provider: "Twilio",
    purpose: "SMS, phone, and missed-call workflows",
    patterns: [/twilio/i, /TWILIO_/],
    riskTags: ["webhook", "sms-consent"],
    failureImpact: "Phone, SMS, missed-call, or consent workflows may fail.",
  },
  {
    id: "service_resend",
    provider: "Resend",
    purpose: "transactional email",
    patterns: [/resend/i, /RESEND_/],
    riskTags: ["messaging"],
    failureImpact: "Transactional email delivery may fail.",
  },
  {
    id: "service_cloudflare",
    provider: "Cloudflare",
    purpose: "hosting, workers, DNS, or deployment",
    patterns: [/cloudflare/i, /wrangler/i, /CLOUDFLARE_/],
    riskTags: ["production-deploy"],
    failureImpact: "Hosting, deployment, or edge runtime behavior may fail.",
  },
  {
    id: "service_openai",
    provider: "OpenAI",
    purpose: "AI model or agent features",
    patterns: [/openai/i, /OPENAI_/],
    riskTags: ["external-service"],
    failureImpact: "AI-assisted product features may fail.",
  },
  {
    id: "service_meta_whatsapp",
    provider: "Meta/WhatsApp",
    purpose: "WhatsApp or Meta messaging integrations",
    patterns: [/whatsapp/i, /meta/i, /WHATSAPP_/, /META_/],
    riskTags: ["messaging", "external-service"],
    failureImpact: "WhatsApp or Meta messaging workflows may fail.",
  },
  {
    id: "service_google",
    provider: "Google",
    purpose: "Google APIs, maps, analytics, or identity",
    patterns: [/google/i, /GOOGLE_/],
    riskTags: ["external-service"],
    failureImpact: "Google-backed integrations may fail.",
  },
  {
    id: "service_firebase",
    provider: "Firebase",
    purpose: "Firebase app services",
    patterns: [/firebase/i, /FIREBASE_/],
    riskTags: ["external-service"],
    failureImpact: "Firebase-backed app services may fail.",
  },
  {
    id: "service_github",
    provider: "GitHub",
    purpose: "repository, checks, or deployment integrations",
    patterns: [/github/i, /GITHUB_/],
    riskTags: ["external-service"],
    failureImpact: "Repository or GitHub integration workflows may fail.",
  },
  {
    id: "service_analytics_tracking",
    provider: "analytics/tracking",
    purpose: "analytics and tracking",
    patterns: [/analytics/i, /tracking/i, /segment/i, /posthog/i, /gtag/i],
    riskTags: ["external-service"],
    failureImpact: "Analytics or tracking data may be incomplete.",
  },
];

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

function makeNodeId(prefix, value) {
  const slug = slugify(value) || "root";
  let hash = 0;
  const text = `${prefix}:${value}`;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return `${prefix}_${slug}_${hash.toString(16)}`;
}

function loadIntegrityConfig() {
  const configPath = path.join(repoRoot, "authtoolkit.integrity.json");
  const stat = statSync(configPath, { throwIfNoEntry: false });

  if (!stat?.isFile()) {
    return {
      config: null,
      found: false,
    };
  }

  try {
    return {
      config: JSON.parse(readFileSync(configPath, "utf8")),
      found: true,
    };
  } catch (error) {
    console.warn(
      `Warning: failed to read authtoolkit.integrity.json. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      config: null,
      found: false,
    };
  }
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function shouldIgnore(relativePath, dirent) {
  const normalized = toPosixPath(relativePath);
  const baseName = path.posix.basename(normalized);

  if (ignoredPathParts.has(baseName)) return true;
  if (ignoredExactFiles.has(baseName)) return true;
  if (ignoredPrefixes.some((prefix) => normalized.startsWith(prefix))) return true;
  if (dirent?.isFile() && binaryExtensions.has(path.posix.extname(normalized).toLowerCase())) {
    return true;
  }

  return false;
}

function walkRepo() {
  const files = [];
  const folders = new Set(["."]);

  function walk(relativeDir) {
    const absoluteDir = path.join(repoRoot, relativeDir);
    const entries = readdirSync(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = toPosixPath(path.join(relativeDir, entry.name));
      if (shouldIgnore(relativePath, entry)) continue;

      if (entry.isDirectory()) {
        folders.add(relativePath);
        walk(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  walk(".");

  return {
    folders: [...folders].sort(),
    files: files.sort(),
  };
}

function readTextFile(relativePath) {
  try {
    const absolutePath = path.join(repoRoot, relativePath);
    const stat = statSync(absolutePath, { throwIfNoEntry: false });
    if (!stat?.isFile() || stat.size > 1_500_000) return "";
    return readFileSync(absolutePath, "utf8");
  } catch {
    return "";
  }
}

function isNextPageRoute(file) {
  return /(^|\/)app\/.*\/page\.tsx$/.test(file) || /(^|\/)app\/page\.tsx$/.test(file);
}

function isNextApiRoute(file) {
  return /(^|\/)app\/api\/.*\/route\.ts$/.test(file);
}

function isWebhookRoute(file) {
  const lower = file.toLowerCase();
  return isNextApiRoute(file) && webhookKeywords.some((keyword) => lower.includes(keyword));
}

function deriveRoutePath(file) {
  const appIndex = file.indexOf("/app/");
  if (appIndex === -1) return null;

  const appRelative = file.slice(appIndex + "/app/".length);
  if (appRelative.endsWith("/page.tsx")) {
    const route = appRelative.replace(/\/page\.tsx$/, "");
    return route === "" ? "/" : `/${route}`;
  }

  if (appRelative.startsWith("api/") && appRelative.endsWith("/route.ts")) {
    return `/${appRelative.replace(/\/route\.ts$/, "")}`;
  }

  return null;
}

function hasAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function detectEnvVars(content) {
  const envVars = new Set();
  const processEnvPattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const publicEnvPattern = /\b(NEXT_PUBLIC_[A-Z0-9_]+)\b/g;

  for (const match of content.matchAll(processEnvPattern)) {
    envVars.add(match[1]);
  }

  for (const match of content.matchAll(publicEnvPattern)) {
    envVars.add(match[1]);
  }

  return [...envVars].sort();
}

function detectEnvVarsForFile(file, content) {
  if (path.posix.extname(file).toLowerCase() === ".md") return [];
  return detectEnvVars(content);
}

function isSecretLike(name) {
  return /SECRET|TOKEN|KEY|PASSWORD|PRIVATE|SERVICE_ROLE/i.test(name);
}

function shouldUseContentForServiceDetection(file) {
  const extension = path.posix.extname(file).toLowerCase();
  const baseName = path.posix.basename(file);

  if ([".md", ".txt"].includes(extension)) return false;
  if (baseName === ".gitignore") return false;
  if (file.endsWith(".tsbuildinfo")) return false;
  if (file === "worker/package-lock.json.bak") return false;
  if (file.startsWith("scripts/dev-integrity-")) return false;

  return true;
}

function detectServices(file, content, envVars) {
  const serviceContent = shouldUseContentForServiceDetection(file) ? content : "";
  const haystack = `${file}\n${serviceContent}\n${envVars.join("\n")}`;
  return serviceDefinitions
    .filter((service) => service.patterns.some((pattern) => pattern.test(haystack)))
    .map((service) => service.provider);
}

function detectRiskTags(file, content, envVars, services) {
  const tags = new Set();
  const lowerPath = file.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (hasAny(`${file}\n${content}`, authKeywords)) tags.add("auth");
  if (routeParamPatterns.some((param) => file.includes(param))) tags.add("tenant-boundary");
  if (isNextApiRoute(file)) tags.add("api-exposure");
  if (envVars.some(isSecretLike) || /secret|token|password|private/i.test(content)) tags.add("secrets");
  if (/service[_-]?role/i.test(`${file}\n${content}\n${envVars.join("\n")}`)) tags.add("service-role");
  if (
    envVars.length ||
    /(^|\/)\.env/i.test(file) ||
    /secret|secrets|token|credential|credentials|service[_-]?role/i.test(`${file}\n${content}`)
  ) {
    tags.add("vault");
  }
  if (/wrangler|cloudflare|opennext|open-next|binding|bindings|worker|routes?|callback|queue|r2|d1|kv|bucket|durable/i.test(`${file}\n${content}`)) {
    tags.add("runtime-binding");
  }
  if (/bootstrap|setup|local|vault|password[_-]?manager|recovery|onboarding|deploy|deployment|runbook/i.test(`${file}\n${content}`)) {
    tags.add("recovery");
  }
  if (hasAny(`${file}\n${content}`, customerDataKeywords)) tags.add("customer-data");
  if (/stripe|checkout|billing|payment|subscription/i.test(`${file}\n${content}`)) tags.add("payment");
  if (isWebhookRoute(file) || lowerPath.includes("webhook")) tags.add("webhook");
  if (/twilio|sms|consent|missed-call|missed_call/i.test(`${file}\n${content}`)) tags.add("sms-consent");
  if (/session|cookie|cookies/i.test(`${file}\n${content}`)) tags.add("session-cookie");
  if (hasAny(`${file}\n${content}`, fileUploadKeywords)) tags.add("file-upload");
  if (lowerPath.includes("/admin/") || lowerPath.includes("/api/admin/")) tags.add("admin");
  if (isNextPageRoute(file) && !lowerPath.includes("/admin/")) tags.add("public");
  if (/wrangler|cloudflare|deploy|deployment|production/i.test(`${file}\n${content}`)) tags.add("production-deploy");

  for (const service of services) {
    const definition = serviceDefinitions.find((item) => item.provider === service);
    for (const tag of definition?.riskTags || []) tags.add(tag);
  }

  return [...tags].sort();
}

function detectType(file) {
  if (isWebhookRoute(file)) return "webhook_route";
  if (isNextApiRoute(file)) return "api_route";
  if (isNextPageRoute(file)) return "page_route";
  if (/\.(env|env\.example)$/.test(file) || path.posix.basename(file).startsWith(".env")) return "env_var";
  if (/\/components?\//.test(file) || /component/i.test(file)) return "component";
  if (/\/lib\/|\/utils?\/|\/helpers?\//.test(file)) return "library";
  if (/schema\.sql$|\/database\/|\/db\//.test(file)) return "database";
  if (/\/migrations?\//.test(file)) return "migration";
  if (/(^|\/)(package\.json|tsconfig\.json|next\.config|wrangler|eslint|postcss|tailwind|authtoolkit\.integrity\.json)/i.test(file)) return "config";
  if (/^scripts\/|\/scripts\//.test(file)) return "script";
  return "file";
}

function detectClassification(file, type, riskTags, content) {
  const lowerPath = file.toLowerCase();

  if (type === "webhook_route") return "provider_webhook";
  if (lowerPath.includes("auth") || lowerPath.includes("login") || lowerPath.includes("otp")) return "auth_route";
  if (/checkout|billing|stripe|payment|subscription/.test(lowerPath)) return "payment_route";
  if (/twilio|sms|message|messaging|resend|email/.test(lowerPath)) return "messaging_route";
  if (/service[_-]?role/i.test(`${file}\n${content}`)) return "service_role_helper";
  if (type === "database" || /supabase|db|database/i.test(file)) return "database_helper";
  if (type === "config") {
    return /wrangler|cloudflare|deploy|deployment/i.test(file) ? "deployment_file" : "config_file";
  }
  if (type === "page_route") {
    if (lowerPath.includes("/admin/")) return "admin_page";
    if (/session|getserver|middleware|requireauth|redirect\(["']\/login/i.test(content)) {
      return "protected_page";
    }
    return "public_page";
  }
  if (type === "api_route") {
    const tenantScoped = riskTags.includes("tenant-boundary");
    const admin = lowerPath.includes("/api/admin/");
    if (tenantScoped && admin) return "tenant_scoped_admin_api";
    if (tenantScoped) return "tenant_scoped_api";
    if (/session|getserver|requireauth|authorization|bearer|auth/i.test(content)) {
      return "protected_api";
    }
    return "public_api";
  }

  return "unknown";
}

function detectTrustBoundary(file, classification, riskTags, content) {
  if (classification === "provider_webhook") return "provider_webhook";
  if (classification === "tenant_scoped_admin_api") return "tenant_admin";
  if (classification === "tenant_scoped_api") return "authenticated";
  if (classification === "admin_page" || riskTags.includes("admin")) return "admin";
  if (classification === "service_role_helper" || riskTags.includes("service-role")) return "service_role";
  if (classification === "public_page" || classification === "public_api") return "public";
  if (classification === "protected_page" || classification === "protected_api") return "authenticated";
  if (/internal|cron/i.test(`${file}\n${content}`)) return "internal";
  if (riskTags.includes("external-service")) return "external";
  return "unknown";
}

function detectAccessLevel(trustBoundary) {
  const accessLevels = {
    public: "public",
    authenticated: "authenticated_user",
    admin: "authenticated_admin",
    tenant_admin: "authenticated_tenant_admin",
    service_role: "server_only_privileged",
    provider_webhook: "provider_signed_or_verified",
    internal: "internal_only",
    external: "external_service",
    unknown: "unknown",
  };

  return accessLevels[trustBoundary] || "unknown";
}

function detectReviewPacks(riskTags, classification) {
  const packs = new Set();
  if (riskTags.includes("auth") || riskTags.includes("secrets") || riskTags.includes("webhook")) packs.add("security");
  if (riskTags.includes("vault") || riskTags.includes("secrets") || riskTags.includes("service-role")) packs.add("vault-integrity");
  if (riskTags.includes("runtime-binding")) packs.add("runtime-binding");
  if (riskTags.includes("recovery")) packs.add("vault-recovery");
  if (riskTags.includes("tenant-boundary")) packs.add("tenant-boundary");
  if (riskTags.includes("api-exposure") || classification.endsWith("_api")) packs.add("api-exposure");
  if (riskTags.includes("payment")) packs.add("payments");
  if (riskTags.includes("sms-consent")) packs.add("sms-compliance");
  if (riskTags.includes("public") || riskTags.includes("customer-data")) packs.add("restaurant-ux");
  if (riskTags.includes("production-deploy")) packs.add("deploy-canary");
  return [...packs].sort();
}

function confidenceForNode(type, classification, trustBoundary, riskTags, content) {
  let confidence = 80;
  if (type === "folder") confidence = 95;
  if (classification === "unknown" || trustBoundary === "unknown") confidence -= 25;
  if (riskTags.includes("service-role") && !hasAny(content, tenantGuardKeywords)) confidence -= 15;
  if (riskTags.includes("webhook") && !hasAny(content, webhookTrustKeywords)) confidence -= 15;
  if (riskTags.includes("payment") && !hasAny(content, paymentStateKeywords)) confidence -= 10;
  return Math.max(0, Math.min(100, confidence));
}

function statusForNode(confidence, riskTags) {
  if (confidence < 45) return "needs_review";
  if (riskTags.includes("service-role") || riskTags.includes("webhook")) return "partial";
  return "mapped";
}

function routeMetadata(file, type, content) {
  const methods = unique(
    [...content.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(
      (match) => match[1]
    )
  );
  const route = deriveRoutePath(file);
  const metadata = {};

  if (route) metadata.route = route;
  if (type === "page_route" || type === "api_route" || type === "webhook_route") {
    metadata.framework = "nextjs";
  }
  if (methods.length) metadata.methods = methods;
  if (/service[_-]?role/i.test(content)) metadata.uses_service_role = true;
  if (hasAny(content, tenantGuardKeywords)) metadata.uses_tenant_guard = true;
  if (routeParamPatterns.some((param) => file.includes(param))) metadata.uses_route_param = true;

  return metadata;
}

function buildFolderNode(folder) {
  const nodeId = makeNodeId("node_folder", folder);
  const name = folder === "." ? "." : path.posix.basename(folder);

  return {
    node_id: nodeId,
    type: "folder",
    name,
    path: folder,
    classification: "unknown",
    trust_boundary: "unknown",
    access_level: "unknown",
    risk_tags: [],
    review_packs: [],
    external_services: [],
    env_vars: [],
    metadata: {},
    confidence: 95,
    status: "mapped",
  };
}

function buildFileNode(file, content) {
  const type = detectType(file);
  const envVars = detectEnvVarsForFile(file, content);
  const services = detectServices(file, content, envVars);
  const riskTags = detectRiskTags(file, content, envVars, services);
  const classification = detectClassification(file, type, riskTags, content);
  const trustBoundary = detectTrustBoundary(file, classification, riskTags, content);
  const confidence = confidenceForNode(type, classification, trustBoundary, riskTags, content);

  return {
    node_id: makeNodeId("node_file", file),
    type,
    name: path.posix.basename(file),
    path: file,
    classification,
    trust_boundary: trustBoundary,
    access_level: detectAccessLevel(trustBoundary),
    risk_tags: riskTags,
    review_packs: detectReviewPacks(riskTags, classification),
    external_services: services.map((service) => service.toLowerCase()),
    env_vars: envVars,
    metadata: routeMetadata(file, type, content),
    confidence,
    status: statusForNode(confidence, riskTags),
  };
}

function buildEnvVars(fileRecords) {
  const envMap = new Map();

  for (const record of fileRecords) {
    for (const envName of record.envVars) {
      if (!envMap.has(envName)) {
        envMap.set(envName, {
          name: envName,
          exposure: envName.startsWith("NEXT_PUBLIC_") ? "client_public" : "server_only",
          secret_like: isSecretLike(envName),
          files: [],
          services: [],
          risk_tags: [],
          warnings: [],
        });
      }

      const envVar = envMap.get(envName);
      envVar.files.push(record.file);
      envVar.services.push(...record.services);

      if (envVar.secret_like) envVar.risk_tags.push("secret");
      if (/SERVICE_ROLE/i.test(envName)) envVar.risk_tags.push("service-role");
      if (envName.startsWith("NEXT_PUBLIC_") && envVar.secret_like) {
        envVar.warnings.push("NEXT_PUBLIC secret-like env var may expose sensitive data to clients.");
      }
    }
  }

  return [...envMap.values()].map((envVar) => ({
    ...envVar,
    files: unique(envVar.files),
    services: unique(envVar.services),
    risk_tags: unique(envVar.risk_tags),
    warnings: unique(envVar.warnings),
  }));
}

function buildExternalServices(fileRecords, envVars) {
  const serviceMap = new Map();

  for (const definition of serviceDefinitions) {
    serviceMap.set(definition.provider, {
      service_id: definition.id,
      provider: definition.provider,
      purpose: definition.purpose,
      files: [],
      routes: [],
      env_vars: [],
      webhooks: [],
      risk_tags: [...definition.riskTags],
      failure_impact: definition.failureImpact,
    });
  }

  for (const record of fileRecords) {
    for (const serviceName of record.services) {
      const service = serviceMap.get(serviceName);
      if (!service) continue;

      service.files.push(record.file);
      service.env_vars.push(...record.envVars.filter((envName) => {
        const definition = serviceDefinitions.find((item) => item.provider === serviceName);
        return definition?.patterns.some((pattern) => pattern.test(envName));
      }));
      service.risk_tags.push(...record.riskTags.filter((tag) => tag !== "public"));

      if (record.node.type === "api_route" || record.node.type === "webhook_route") {
        service.routes.push(record.file);
      }
      if (record.node.type === "webhook_route") {
        service.webhooks.push(record.file);
      }
    }
  }

  for (const envVar of envVars) {
    for (const serviceName of envVar.services) {
      const service = serviceMap.get(serviceName);
      if (service) service.env_vars.push(envVar.name);
    }
  }

  return [...serviceMap.values()]
    .map((service) => ({
      ...service,
      files: unique(service.files),
      routes: unique(service.routes),
      env_vars: unique(service.env_vars),
      webhooks: unique(service.webhooks),
      risk_tags: unique(service.risk_tags),
    }))
    .filter(
      (service) =>
        service.files.length || service.routes.length || service.env_vars.length || service.webhooks.length
    );
}

function buildEnvNodes(envVars) {
  return envVars.map((envVar) => ({
    node_id: makeNodeId("node_env", envVar.name),
    type: "env_var",
    name: envVar.name,
    path: null,
    classification: "config_file",
    trust_boundary: envVar.exposure === "client_public" ? "public" : "internal",
    access_level: envVar.exposure,
    risk_tags: envVar.risk_tags,
    review_packs: envVar.risk_tags.length ? ["security"] : [],
    external_services: envVar.services.map((service) => service.toLowerCase()),
    env_vars: [envVar.name],
    metadata: {
      exposure: envVar.exposure,
      secret_like: envVar.secret_like,
      warnings: envVar.warnings,
    },
    confidence: envVar.exposure === "unknown" ? 45 : 90,
    status: envVar.warnings.length ? "needs_review" : "mapped",
  }));
}

function buildServiceNodes(externalServices) {
  return externalServices.map((service) => ({
    node_id: makeNodeId("node_service", service.provider),
    type: "external_service",
    name: service.provider,
    path: null,
    classification: "unknown",
    trust_boundary: "external",
    access_level: "external_service",
    risk_tags: service.risk_tags,
    review_packs: detectReviewPacks(service.risk_tags, "unknown"),
    external_services: [service.provider.toLowerCase()],
    env_vars: service.env_vars,
    metadata: {
      purpose: service.purpose,
      failure_impact: service.failure_impact,
    },
    confidence: 85,
    status: "mapped",
  }));
}

function buildEdges(fileRecords, envVars, externalServices) {
  const edges = [];
  const envNodeIds = new Map(envVars.map((envVar) => [envVar.name, makeNodeId("node_env", envVar.name)]));
  const serviceNodeIds = new Map(
    externalServices.map((service) => [service.provider, makeNodeId("node_service", service.provider)])
  );

  for (const record of fileRecords) {
    for (const envName of record.envVars) {
      edges.push({
        edge_id: makeNodeId("edge", `${record.node.node_id}:uses_env:${envName}`),
        source_node_id: record.node.node_id,
        target_node_id: envNodeIds.get(envName),
        relationship_type: "uses_env",
        label: `uses env var ${envName}`,
        risk_tags: isSecretLike(envName) ? ["secrets"] : [],
        confidence: 90,
        metadata: {},
      });
    }

    for (const serviceName of record.services) {
      const relationshipType =
        record.node.type === "webhook_route" ? "receives_from" : "uses_service";
      const serviceRiskTags =
        serviceDefinitions.find((service) => service.provider === serviceName)?.riskTags || [];

      edges.push({
        edge_id: makeNodeId("edge", `${record.node.node_id}:${relationshipType}:${serviceName}`),
        source_node_id: record.node.node_id,
        target_node_id: serviceNodeIds.get(serviceName),
        relationship_type: relationshipType,
        label:
          relationshipType === "receives_from"
            ? `receives webhook or callback from ${serviceName}`
            : `uses external service ${serviceName}`,
        risk_tags: unique([...record.riskTags, ...serviceRiskTags]),
        confidence: record.node.type === "api_route" || record.node.type === "webhook_route" ? 80 : 70,
        metadata: {},
      });
    }
  }

  return edges.filter((edge) => edge.target_node_id);
}

function nodesForFlow(fileRecords, matcher) {
  return fileRecords.filter((record) => matcher(record)).map((record) => record.node.node_id);
}

function buildFlows(fileRecords) {
  const flowDefinitions = [
    {
      flow_id: "flow_login_session",
      name: "login/session flow",
      match: (record) => /auth|login|logout|signout|session|otp|callback/i.test(record.file),
      risk_tags: ["auth", "session-cookie"],
      unknown: "Runtime session and cookie behavior needs verification.",
    },
    {
      flow_id: "flow_admin_tenant_access",
      name: "admin tenant access flow",
      match: (record) => /\/admin\/|\/api\/admin\/|\[slug\]|\[restaurantId\]|\[tenantId\]/i.test(record.file),
      risk_tags: ["admin", "tenant-boundary"],
      unknown: "Runtime two-tenant proof has not been inferred by static scanning.",
    },
    {
      flow_id: "flow_customer_order",
      name: "customer order flow",
      match: (record) => /order|cart|menu|checkout|\/r\/\[slug\]/i.test(record.file),
      risk_tags: ["customer-data", "tenant-boundary"],
      unknown: "Runtime order state transitions need verification.",
    },
    {
      flow_id: "flow_checkout_payment",
      name: "checkout/payment flow",
      match: (record) => /checkout|stripe|payment|billing|subscription/i.test(record.file),
      risk_tags: ["payment", "webhook"],
      unknown: "Payment state, webhook handling, and idempotency need verification.",
    },
    {
      flow_id: "flow_webhook_confirmation",
      name: "webhook confirmation flow",
      match: (record) => record.node.type === "webhook_route" || /webhook|callback|inbound/i.test(record.file),
      risk_tags: ["webhook"],
      unknown: "Provider signature or webhook trust proof may need runtime verification.",
    },
    {
      flow_id: "flow_sms_missed_call",
      name: "SMS/missed-call flow",
      match: (record) => /twilio|sms|missed-call|consent|voice/i.test(record.file),
      risk_tags: ["sms-consent", "webhook"],
      unknown: "SMS consent and provider callback behavior need verification.",
    },
    {
      flow_id: "flow_qr_hub_scan",
      name: "QR/hub scan flow",
      match: (record) => /qr|\/r\/\[slug\]\/hub|hub/i.test(record.file),
      risk_tags: ["public", "customer-data"],
      unknown: "Runtime QR-to-hub path should be verified in browser QA.",
    },
    {
      flow_id: "flow_file_upload",
      name: "file upload flow",
      match: (record) => /upload|asset|storage|multipart|formdata/i.test(`${record.file}\n${record.content}`),
      risk_tags: ["file-upload", "customer-data"],
      unknown: "File upload access and storage permissions need verification.",
    },
    {
      flow_id: "flow_deployment",
      name: "deployment flow",
      match: (record) => /wrangler|cloudflare|deploy|deployment|opennext/i.test(`${record.file}\n${record.content}`),
      risk_tags: ["production-deploy"],
      unknown: "Production deployment environment should be checked before release.",
    },
  ];

  return flowDefinitions
    .map((definition) => {
      const nodes = unique(nodesForFlow(fileRecords, definition.match));
      return {
        flow_id: definition.flow_id,
        name: definition.name,
        description: `${definition.name} inferred from file paths and local source text.`,
        nodes,
        edges: [],
        risk_tags: definition.risk_tags,
        status: nodes.length ? "partial" : "unknown",
        confidence: nodes.length ? 60 : 20,
        unknowns: [definition.unknown],
      };
    })
    .filter((flow) => flow.nodes.length);
}

function buildUnknown(type, message, relatedNodes, suggestedAction) {
  return {
    type,
    message,
    related_nodes: unique(relatedNodes),
    suggested_action: suggestedAction,
  };
}

function buildRiskSummaryAndUnknowns(fileRecords, envVars, configFound) {
  const riskSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    risk_tags: {},
    high_risk_nodes: [],
  };
  const unknowns = [];
  const unclassifiedRoutes = [];
  const unknownAuthBoundary = [];
  const unknownWebhookTrust = [];
  let hasUnguardedServiceRolePath = false;

  for (const record of fileRecords) {
    for (const tag of record.riskTags) {
      riskSummary.risk_tags[tag] = (riskSummary.risk_tags[tag] || 0) + 1;
    }

    const isRoute = ["page_route", "api_route", "webhook_route"].includes(record.node.type);
    if (isRoute && record.node.classification === "unknown") {
      unclassifiedRoutes.push(record.node.node_id);
    }

    const content = record.content;
    const isAdminApi = record.node.type === "api_route" && record.file.toLowerCase().includes("/api/admin/");
    const hasServiceRole = record.riskTags.includes("service-role");
    const hasTenantGuard = hasAny(content, tenantGuardKeywords);
    const isPublicCustomerApi =
      record.node.classification === "public_api" && record.riskTags.includes("customer-data");
    const isTenantScoped = record.riskTags.includes("tenant-boundary");

    if (hasServiceRole && isAdminApi && !hasTenantGuard) {
      hasUnguardedServiceRolePath = true;
      riskSummary.high += 1;
      riskSummary.high_risk_nodes.push(record.file);
      unknownAuthBoundary.push(record.node.node_id);
    } else if (isPublicCustomerApi) {
      riskSummary.high += 1;
      riskSummary.high_risk_nodes.push(record.file);
      unknownAuthBoundary.push(record.node.node_id);
    } else if (isTenantScoped && !hasTenantGuard) {
      riskSummary.medium += 1;
      unknownAuthBoundary.push(record.node.node_id);
    } else if (record.riskTags.length) {
      riskSummary.low += 1;
    }

    if (record.node.type === "webhook_route" && !hasAny(content, webhookTrustKeywords)) {
      riskSummary.high += 1;
      riskSummary.high_risk_nodes.push(record.file);
      unknownWebhookTrust.push(record.node.node_id);
    }

    if (record.riskTags.includes("payment") && !hasAny(content, paymentStateKeywords)) {
      riskSummary.medium += 1;
      unknowns.push(
        buildUnknown(
          "unknown_payment_state",
          `Payment-related file ${record.file} lacks obvious webhook or idempotency markers.`,
          [record.node.node_id],
          "Review payment state transitions, webhook handling, and idempotency."
        )
      );
    }

    if (record.riskTags.includes("file-upload")) {
      unknowns.push(
        buildUnknown(
          "unknown_file_upload_access",
          `File-upload-related file ${record.file} needs access and storage permission verification.`,
          [record.node.node_id],
          "Verify file upload authorization and storage permissions."
        )
      );
    }
  }

  for (const envVar of envVars) {
    if (envVar.exposure === "unknown") {
      unknowns.push(
        buildUnknown(
          "unknown_env_exposure",
          `Exposure for ${envVar.name} could not be inferred.`,
          [],
          "Classify env var exposure as client_public or server_only."
        )
      );
    }
    if (envVar.exposure === "client_public" && envVar.secret_like) {
      riskSummary.critical += 1;
      unknowns.push(
        buildUnknown(
          "unknown_env_exposure",
          `Client-exposed env var ${envVar.name} looks secret-like.`,
          [],
          "Rename, remove, or move the value to a server-only env var before production use."
        )
      );
    }
  }

  if (unclassifiedRoutes.length) {
    unknowns.push(
      buildUnknown(
        "unclassified_route",
        "One or more routes could not be classified confidently.",
        unclassifiedRoutes,
        "Review route purpose and expected access level."
      )
    );
  }

  if (unknownAuthBoundary.length) {
    unknowns.push(
      buildUnknown(
        "unknown_auth_boundary",
        "One or more sensitive routes need explicit authorization verification.",
        unknownAuthBoundary,
        "Confirm auth, admin, and tenant membership checks before production deploy."
      )
    );
  }

  if (unknownWebhookTrust.length) {
    unknowns.push(
      buildUnknown(
        "unknown_webhook_trust",
        "One or more webhook routes lack obvious signature or verification markers.",
        unknownWebhookTrust,
        "Verify provider signature validation and replay protection."
      )
    );
  }

  if (fileRecords.some((record) => record.riskTags.includes("tenant-boundary"))) {
    unknowns.push(
      buildUnknown(
        "runtime_proof_missing",
        "Static scan cannot prove tenant isolation at runtime.",
        fileRecords
          .filter((record) => record.riskTags.includes("tenant-boundary"))
          .map((record) => record.node.node_id),
        "Run a live two-tenant proof before production deploy."
      )
    );
  }

  return {
    riskSummary: {
      ...riskSummary,
      risk_tags: Object.fromEntries(Object.entries(riskSummary.risk_tags).sort()),
      high_risk_nodes: unique(riskSummary.high_risk_nodes),
    },
    unknowns,
    hasUnguardedServiceRolePath,
    unclassifiedRoutesCount: unclassifiedRoutes.length,
    unknownAuthBoundaryCount: unknownAuthBoundary.length,
    unknownEnvExposureCount: envVars.filter((envVar) => envVar.exposure === "unknown").length,
    unknownWebhookTrustCount: unknownWebhookTrust.length,
    configFound,
  };
}

function cleanInventoryCell(value) {
  return String(value || "")
    .replace(/`/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}

function parseSecretInventory(content) {
  const rows = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map(cleanInventoryCell);

    if (cells.length < 12) continue;
    if (cells[0].toLowerCase() === "project") continue;
    if (cells.every((cell) => /^-+$/.test(cell))) continue;

    const secretName = cells[2];
    if (!/^[A-Z][A-Z0-9_]*$/.test(secretName)) continue;

    rows.push({
      project: cells[0],
      environment: cells[1],
      secret_name: secretName,
      purpose: cells[3],
      secret_type: cells[4],
      source_of_truth: cells[5],
      runtime_consumers: cells[6],
      ci_consumers: cells[7],
      rotation_cadence: cells[8],
      last_rotated: cells[9],
      status: cells[10].toLowerCase() || "unknown",
      recovery_notes: cells[11],
    });
  }

  return rows;
}

function calculateVaultScore({
  inventoryFound,
  usedNotInInventory,
  inventoriedNotUsed,
  secretLikePublicEnv,
  requiredUnknownStatus,
}) {
  let score = 100;

  if (!inventoryFound) score -= 10;
  score -= Math.min(30, usedNotInInventory.length * 5);
  score -= Math.min(30, secretLikePublicEnv.length * 10);
  score -= Math.min(15, requiredUnknownStatus.length * 3);
  score -= Math.min(10, inventoriedNotUsed.length);

  return Math.max(0, score);
}

function buildVaultAudit(envVars) {
  const inventoryStat = statSync(secretInventoryPath, { throwIfNoEntry: false });
  const detectedEnvNames = unique(envVars.map((envVar) => envVar.name));

  if (!inventoryStat?.isFile()) {
    return {
      vaultAudit: {
        inventory_path: secretInventoryRelativePath,
        inventory_found: false,
        inventoried_secret_names_count: 0,
        detected_env_vars_count: detectedEnvNames.length,
        used_not_in_inventory: detectedEnvNames,
        inventoried_not_used: [],
        secret_like_public_env: envVars
          .filter((envVar) => envVar.exposure === "client_public" && envVar.secret_like)
          .map((envVar) => envVar.name),
        required_unknown_status: [],
        vault_score: calculateVaultScore({
          inventoryFound: false,
          usedNotInInventory: detectedEnvNames,
          inventoriedNotUsed: [],
          secretLikePublicEnv: [],
          requiredUnknownStatus: [],
        }),
      },
      unknowns: [
        buildUnknown(
          "secret_inventory_missing",
          "Secret inventory document is missing.",
          [],
          `Create ${secretInventoryRelativePath}.`
        ),
      ],
    };
  }

  const inventoryRows = parseSecretInventory(readFileSync(secretInventoryPath, "utf8"));
  const inventoryNames = unique(inventoryRows.map((row) => row.secret_name));
  const inventoryNameSet = new Set(inventoryNames);
  const detectedNameSet = new Set(detectedEnvNames);
  const usedNotInInventory = detectedEnvNames.filter((name) => !inventoryNameSet.has(name));
  const inventoriedNotUsed = inventoryNames.filter((name) => !detectedNameSet.has(name));
  const secretLikePublicEnv = envVars
    .filter((envVar) => envVar.exposure === "client_public" && envVar.secret_like)
    .map((envVar) => envVar.name);
  const requiredUnknownStatus = unique(
    inventoryRows
      .filter((row) => row.status === "unknown" && detectedNameSet.has(row.secret_name))
      .map((row) => row.secret_name)
  );

  return {
    vaultAudit: {
      inventory_path: secretInventoryRelativePath,
      inventory_found: true,
      inventoried_secret_names_count: inventoryNames.length,
      detected_env_vars_count: detectedEnvNames.length,
      used_not_in_inventory: usedNotInInventory,
      inventoried_not_used: inventoriedNotUsed,
      secret_like_public_env: secretLikePublicEnv,
      required_unknown_status: requiredUnknownStatus,
      vault_score: calculateVaultScore({
        inventoryFound: true,
        usedNotInInventory,
        inventoriedNotUsed,
        secretLikePublicEnv,
        requiredUnknownStatus,
      }),
    },
    unknowns: [],
  };
}

function calculateArchitectureConfidence(riskContext) {
  let confidence = 100;
  confidence -= Math.min(riskContext.unclassifiedRoutesCount * 5, 20);
  confidence -= Math.min(riskContext.unknownAuthBoundaryCount * 5, 20);
  confidence -= Math.min(riskContext.unknownEnvExposureCount * 5, 15);
  confidence -= Math.min(riskContext.unknownWebhookTrustCount * 5, 15);
  if (riskContext.hasUnguardedServiceRolePath) confidence -= 10;
  if (!riskContext.configFound) confidence -= 10;
  return Math.max(0, confidence);
}

function formatList(values) {
  return values?.length ? values.join(", ") : "none";
}

function markdownList(values) {
  return values?.length ? values.map((value) => `- ${value}`).join("\n") : "- none";
}

function routeLabel(node) {
  return node.metadata?.route || "n/a";
}

function methodLabel(node) {
  return node.metadata?.methods?.length ? node.metadata.methods.join(", ") : "n/a";
}

function nodeByPath(projectMap, nodePath) {
  return projectMap.nodes.find((node) => node.path === nodePath);
}

function appendLimitedSection(lines, title, rows, limit, formatter) {
  lines.push(`### ${title}`, "");

  if (!rows.length) {
    lines.push("- none", "");
    return;
  }

  for (const row of rows.slice(0, limit)) {
    lines.push(formatter(row));
  }

  if (rows.length > limit) {
    lines.push(`- ${rows.length - limit} more not shown.`);
  }

  lines.push("");
}

function groupBy(values, keyFn) {
  const grouped = new Map();

  for (const value of values) {
    const key = keyFn(value);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(value);
  }

  return grouped;
}

function buildSuggestedChecks(projectMap) {
  const checks = [];
  const riskTags = projectMap.risk_summary.risk_tags || {};
  const unknownTypes = new Set(projectMap.unknowns.map((unknown) => unknown.type));
  const clientPublicSecretWarnings = projectMap.env_vars.some(
    (envVar) => envVar.exposure === "client_public" && envVar.secret_like
  );

  if (riskTags["tenant-boundary"]) {
    checks.push("Run two-tenant runtime proof.");
  }
  if (unknownTypes.has("unknown_webhook_trust")) {
    checks.push("Verify provider signature validation.");
  }
  if (unknownTypes.has("unknown_payment_state")) {
    checks.push("Run payment/webhook review.");
  }
  if (clientPublicSecretWarnings) {
    checks.push("Fix env exposure for secret-like NEXT_PUBLIC variables.");
  }
  if (projectMap.summary.service_role_paths_count > 0) {
    checks.push("Verify service-role usage is server-only and guarded by tenant authorization where needed.");
  }
  if (projectMap.summary.architecture_confidence < 70) {
    checks.push("Review unknowns before production deploy.");
  }
  if (projectMap.vault_audit?.used_not_in_inventory?.length) {
    checks.push("Update SaanaOS secret inventory for env vars used in code.");
  }
  if (projectMap.vault_audit?.inventoried_not_used?.length) {
    checks.push("Review whether inventoried secrets are provider-only, future, or removable.");
  }
  if (projectMap.vault_audit?.secret_like_public_env?.length) {
    checks.push("Move secret-like public env vars to server-only names.");
  }
  if (projectMap.vault_audit?.required_unknown_status?.length) {
    checks.push("Clarify required/optional/future status in secret inventory.");
  }

  return checks;
}

function buildMarkdownSummary(projectMap) {
  const lines = [];
  const routeNodes = projectMap.nodes.filter((node) =>
    ["page_route", "api_route", "webhook_route"].includes(node.type)
  );
  const publicRoutes = routeNodes.filter((node) => node.trust_boundary === "public");
  const protectedRoutes = routeNodes.filter((node) =>
    ["authenticated", "admin", "tenant_admin"].includes(node.trust_boundary)
  );
  const apiRoutes = routeNodes.filter((node) => node.type === "api_route");
  const webhookRoutes = routeNodes.filter((node) => node.type === "webhook_route");
  const topRiskTags = Object.entries(projectMap.risk_summary.risk_tags || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);
  const highRiskNodes = projectMap.risk_summary.high_risk_nodes
    .map((nodePath) => nodeByPath(projectMap, nodePath))
    .filter(Boolean)
    .slice(0, 25);
  const envGroups = groupBy(projectMap.env_vars, (envVar) => envVar.exposure || "unknown");
  const unknownGroups = groupBy(projectMap.unknowns, (unknown) => unknown.type);
  const unknownOrder = [
    "runtime_proof_missing",
    "unknown_auth_boundary",
    "unknown_webhook_trust",
    "unknown_payment_state",
    "unknown_env_exposure",
    "unknown_file_upload_access",
    "unclassified_route",
  ];
  const suggestedChecks = buildSuggestedChecks(projectMap);
  const vaultAudit = projectMap.vault_audit || {
    inventory_path: secretInventoryRelativePath,
    inventory_found: false,
    inventoried_secret_names_count: 0,
    detected_env_vars_count: 0,
    used_not_in_inventory: [],
    inventoried_not_used: [],
    secret_like_public_env: [],
    required_unknown_status: [],
    vault_score: 0,
  };

  lines.push("# Architecture Project Map Summary", "");
  lines.push("## Project", "");
  lines.push(`- Project: ${projectMap.project}`);
  lines.push(`- Stack: ${projectMap.stack}`);
  lines.push(`- Commit SHA: ${projectMap.commit_sha}`);
  lines.push(`- Created at: ${projectMap.created_at}`);
  lines.push(`- Architecture confidence: ${projectMap.summary.architecture_confidence}`);
  lines.push(`- Total files scanned: ${projectMap.summary.total_files}`);
  lines.push(`- Routes count: ${projectMap.summary.routes_count}`);
  lines.push(`- API routes count: ${projectMap.summary.api_routes_count}`);
  lines.push(`- Webhook routes count: ${projectMap.summary.webhook_routes_count}`);
  lines.push(`- External services count: ${projectMap.summary.external_services_count}`);
  lines.push(`- Env vars count: ${projectMap.summary.env_vars_count}`);
  lines.push(`- High-risk nodes count: ${projectMap.summary.high_risk_nodes_count}`);
  lines.push(`- Unknowns count: ${projectMap.unknowns.length}`, "");

  lines.push("## Top Risk Summary", "");
  lines.push(`- Critical count: ${projectMap.risk_summary.critical}`);
  lines.push(`- High count: ${projectMap.risk_summary.high}`);
  lines.push(`- Medium count: ${projectMap.risk_summary.medium}`);
  lines.push(`- Low count: ${projectMap.risk_summary.low}`);
  lines.push("- Top risk tags by count:");
  if (topRiskTags.length) {
    for (const [tag, count] of topRiskTags) {
      lines.push(`  - ${tag}: ${count}`);
    }
  } else {
    lines.push("  - none");
  }
  lines.push("");

  lines.push("## High-Risk Nodes", "");
  if (highRiskNodes.length) {
    for (const node of highRiskNodes) {
      lines.push(`- ${node.path}`);
      lines.push(`  - classification: ${node.classification}`);
      lines.push(`  - trust boundary: ${node.trust_boundary}`);
      lines.push(`  - risk tags: ${formatList(node.risk_tags)}`);
      lines.push(`  - confidence: ${node.confidence}`);
      lines.push(`  - status: ${node.status}`);
    }
  } else {
    lines.push("- none");
  }
  lines.push("");

  lines.push("## Routes", "");
  appendLimitedSection(lines, "Public Routes", publicRoutes, 50, (node) => (
    `- ${node.path} | route: ${routeLabel(node)} | classification: ${node.classification} | risk tags: ${formatList(node.risk_tags)}`
  ));
  appendLimitedSection(lines, "Protected/Admin Routes", protectedRoutes, 50, (node) => (
    `- ${node.path} | route: ${routeLabel(node)} | classification: ${node.classification} | trust boundary: ${node.trust_boundary} | risk tags: ${formatList(node.risk_tags)}`
  ));
  appendLimitedSection(lines, "API Routes", apiRoutes, 50, (node) => (
    `- ${node.path} | route: ${routeLabel(node)} | methods: ${methodLabel(node)} | classification: ${node.classification} | trust boundary: ${node.trust_boundary} | risk tags: ${formatList(node.risk_tags)}`
  ));
  appendLimitedSection(lines, "Webhook Routes", webhookRoutes, 50, (node) => (
    `- ${node.path} | route: ${routeLabel(node)} | methods: ${methodLabel(node)} | external services: ${formatList(node.external_services)} | risk tags: ${formatList(node.risk_tags)} | status: ${node.status}`
  ));

  lines.push("## External Services", "");
  if (projectMap.external_services.length) {
    for (const service of projectMap.external_services) {
      lines.push(`- ${service.provider}`);
      lines.push(`  - purpose: ${service.purpose}`);
      lines.push(`  - files count: ${service.files.length}`);
      lines.push(`  - routes count: ${service.routes.length}`);
      lines.push(`  - webhooks count: ${service.webhooks.length}`);
      lines.push(`  - env vars: ${formatList(service.env_vars)}`);
      lines.push(`  - risk tags: ${formatList(service.risk_tags)}`);
      lines.push(`  - failure impact: ${service.failure_impact}`);
    }
  } else {
    lines.push("- none");
  }
  lines.push("");

  lines.push("## Env Vars", "");
  for (const exposure of ["client_public", "server_only", "unknown"]) {
    lines.push(`### ${exposure}`, "");
    const envVars = envGroups.get(exposure) || [];
    if (!envVars.length) {
      lines.push("- none", "");
      continue;
    }
    for (const envVar of envVars) {
      lines.push(`- ${envVar.name}`);
      lines.push(`  - exposure: ${envVar.exposure}`);
      lines.push(`  - secret_like: ${envVar.secret_like}`);
      lines.push(`  - services: ${formatList(envVar.services)}`);
      lines.push(`  - warnings: ${formatList(envVar.warnings)}`);
    }
    lines.push("");
  }

  lines.push("## Vault Audit", "");
  lines.push(`- Inventory path: ${vaultAudit.inventory_path}`);
  lines.push(`- Inventory found: ${vaultAudit.inventory_found}`);
  lines.push(`- Inventoried secret names count: ${vaultAudit.inventoried_secret_names_count}`);
  lines.push(`- Detected env vars count: ${vaultAudit.detected_env_vars_count}`);
  lines.push(`- Vault score: ${vaultAudit.vault_score}`, "");

  lines.push("### Used Env Vars Missing From Inventory", "");
  lines.push(markdownList(vaultAudit.used_not_in_inventory), "");

  lines.push("### Inventoried Secrets Not Detected In Code", "");
  lines.push(markdownList(vaultAudit.inventoried_not_used), "");

  lines.push("### Secret-Like Public Env Warnings", "");
  lines.push(markdownList(vaultAudit.secret_like_public_env), "");

  lines.push("### Required/Used Env Vars With Unknown Status", "");
  lines.push(markdownList(vaultAudit.required_unknown_status), "");

  lines.push("## Unknowns / Needs Review", "");
  for (const type of unknownOrder) {
    const unknowns = unknownGroups.get(type) || [];
    if (!unknowns.length) continue;

    lines.push(`### ${type}`, "");
    for (const unknown of unknowns) {
      lines.push(`- ${unknown.message}`);
      lines.push(`  - related node count: ${unknown.related_nodes.length}`);
      lines.push(`  - suggested action: ${unknown.suggested_action}`);
    }
    lines.push("");
  }

  lines.push("## Suggested Next Checks", "");
  if (suggestedChecks.length) {
    for (const check of suggestedChecks) {
      lines.push(`- ${check}`);
    }
  } else {
    lines.push("- No additional checks suggested by current map heuristics.");
  }
  lines.push("");

  lines.push("## Output", "");
  lines.push("Full JSON map:");
  lines.push("docs/architecture/project-map.json", "");
  lines.push("Generated by:");
  lines.push("npm run integrity:map", "");

  return `${lines.join("\n")}\n`;
}

function main() {
  const { config, found: configFound } = loadIntegrityConfig();
  const project = typeof config?.project === "string" && config.project.trim() ? config.project : "unknown";
  const stack = typeof config?.stack === "string" && config.stack.trim() ? config.stack : "unknown";
  const commitSha = runGit(["rev-parse", "--short", "HEAD"]);
  const createdAt = new Date().toISOString();
  const snapshotId = `arch_${createdAt.replace(/[-:]/g, "").replace(/\..+$/, "Z")}`;
  const { folders, files } = walkRepo();

  const folderNodes = folders.map(buildFolderNode);
  const fileRecords = files.map((file) => {
    const content = readTextFile(file);
    const node = buildFileNode(file, content);
    return {
      file,
      content,
      node,
      envVars: node.env_vars,
      services: node.external_services
        .map((service) => serviceDefinitions.find((definition) => definition.provider.toLowerCase() === service))
        .filter(Boolean)
        .map((service) => service.provider),
      riskTags: node.risk_tags,
    };
  });

  const envVars = buildEnvVars(fileRecords);
  const vaultAuditContext = buildVaultAudit(envVars);
  const externalServices = buildExternalServices(fileRecords, envVars);
  const envNodes = buildEnvNodes(envVars);
  const serviceNodes = buildServiceNodes(externalServices);
  const edges = buildEdges(fileRecords, envVars, externalServices);
  const flows = buildFlows(fileRecords);
  const riskContext = buildRiskSummaryAndUnknowns(fileRecords, envVars, configFound);
  const architectureConfidence = calculateArchitectureConfidence(riskContext);
  const nodes = [...folderNodes, ...fileRecords.map((record) => record.node), ...envNodes, ...serviceNodes];

  const routes = fileRecords.filter((record) =>
    ["page_route", "api_route", "webhook_route"].includes(record.node.type)
  );
  const apiRoutes = fileRecords.filter((record) => record.node.type === "api_route");
  const webhookRoutes = fileRecords.filter((record) => record.node.type === "webhook_route");
  const publicRoutes = routes.filter((record) => record.node.trust_boundary === "public");
  const protectedRoutes = routes.filter((record) =>
    ["authenticated", "admin", "tenant_admin"].includes(record.node.trust_boundary)
  );
  const tenantScopedRoutes = routes.filter((record) => record.riskTags.includes("tenant-boundary"));
  const serviceRolePaths = fileRecords.filter((record) => record.riskTags.includes("service-role"));
  const highRiskNodePaths = riskContext.riskSummary.high_risk_nodes;

  const summary = {
    total_files: files.length,
    routes_count: routes.length,
    api_routes_count: apiRoutes.length,
    webhook_routes_count: webhookRoutes.length,
    public_routes_count: publicRoutes.length,
    protected_routes_count: protectedRoutes.length,
    tenant_scoped_routes_count: tenantScopedRoutes.length,
    service_role_paths_count: serviceRolePaths.length,
    external_services_count: externalServices.length,
    env_vars_count: envVars.length,
    high_risk_nodes_count: highRiskNodePaths.length,
    unclassified_nodes_count: nodes.filter(
      (node) => node.type !== "folder" && node.classification === "unknown"
    ).length,
    architecture_confidence: architectureConfidence,
  };

  const projectMap = {
    schema_version: schemaVersion,
    project,
    stack,
    snapshot_id: snapshotId,
    commit_sha: commitSha,
    created_at: createdAt,
    summary,
    nodes,
    edges,
    flows,
    external_services: externalServices,
    env_vars: envVars,
    vault_audit: vaultAuditContext.vaultAudit,
    risk_summary: riskContext.riskSummary,
    unknowns: [...riskContext.unknowns, ...vaultAuditContext.unknowns],
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(projectMap, null, 2)}\n`);
  writeFileSync(summaryOutputPath, buildMarkdownSummary(projectMap));

  const relativeOutputPath = path.relative(repoRoot, outputPath);
  const relativeSummaryOutputPath = path.relative(repoRoot, summaryOutputPath);
  console.log("AuthToolkit Dev Integrity Project Map");
  console.log(`Project: ${project}`);
  console.log(`Stack: ${stack}`);
  console.log(`Commit SHA: ${commitSha}`);
  console.log(`Total files scanned: ${summary.total_files}`);
  console.log(`Routes: ${summary.routes_count}`);
  console.log(`API routes: ${summary.api_routes_count}`);
  console.log(`Webhook routes: ${summary.webhook_routes_count}`);
  console.log(`External services: ${summary.external_services_count}`);
  console.log(`Env vars: ${summary.env_vars_count}`);
  console.log(`Vault score: ${projectMap.vault_audit.vault_score}`);
  console.log(`Used env vars missing from inventory: ${projectMap.vault_audit.used_not_in_inventory.length}`);
  console.log(`Inventoried not used: ${projectMap.vault_audit.inventoried_not_used.length}`);
  console.log(`High-risk nodes: ${summary.high_risk_nodes_count}`);
  console.log(`Unknowns: ${projectMap.unknowns.length}`);
  console.log(`Architecture confidence: ${summary.architecture_confidence}`);
  console.log(`JSON output: ${relativeOutputPath}`);
  console.log(`Summary output: ${relativeSummaryOutputPath}`);
}

main();
