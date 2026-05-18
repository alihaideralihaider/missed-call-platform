import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const checkName = "production-runtime-config-canary";
const baseUrl = String(
  process.env.CANARY_BASE_URL || "https://www.saanaos.com"
).replace(/\/+$/, "");

const response = await fetch(`${baseUrl}/api/public/runtime-config`, {
  headers: {
    Accept: "application/json",
  },
});

assert.equal(
  response.ok,
  true,
  `Runtime config endpoint must return 200, got ${response.status}.`
);

const config = await response.json();
const supabaseUrl = String(config?.supabase?.url || "").trim();
const supabaseAnonKey = String(config?.supabase?.anonKey || "").trim();
const serializedConfig = JSON.stringify(config);
const privilegedEnvName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
const privilegedFieldName = ["service", "Role", "Key"].join("");

assert.equal(
  Boolean(supabaseUrl),
  true,
  "NEXT_PUBLIC_SUPABASE_URL must be available for browser client usage."
);
assert.equal(
  Boolean(supabaseAnonKey),
  true,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY must be available for browser client usage."
);
assert.equal(
  serializedConfig.includes(privilegedEnvName),
  false,
  "Privileged Supabase key name must not be exposed by public runtime config."
);
assert.equal(
  Boolean(config?.supabase?.[privilegedFieldName] || config?.[privilegedFieldName]),
  false,
  "Privileged Supabase key value must not be exposed to client code."
);

const supabase = createClient(supabaseUrl, supabaseAnonKey);
assert.equal(
  Boolean(supabase),
  true,
  "Checkout must be able to initialize a Supabase browser client."
);

console.log(`${checkName}: passed`);
console.log("NEXT_PUBLIC_SUPABASE_URL=present");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=present");
console.log("privileged_supabase_key=not_exposed");
