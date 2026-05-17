const endpoints = {
  projectMap: "/data/project-map.json",
  architectureHistory: "/data/architecture-confidence-history.json",
  vaultHistory: "/data/vault-score-history.json",
  reviewHistory: "/data/dev-integrity-review-history.json",
};

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  return response.json();
}

function valueOrFallback(value, fallback = "n/a") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function latest(history) {
  return Array.isArray(history) && history.length ? history[history.length - 1] : null;
}

function previous(history) {
  return Array.isArray(history) && history.length > 1 ? history[history.length - 2] : null;
}

function classForStatus(value) {
  const text = String(value || "").toLowerCase();
  if (/critical|high|blocked|failed|declined|risky/.test(text)) return "red";
  if (/warning|partial|unknown|review|medium/.test(text)) return "yellow";
  if (/service|privileged|role/.test(text)) return "purple";
  if (/passed|good|improved|clean|mapped/.test(text)) return "green";
  if (/info|external|public/.test(text)) return "blue";
  return "gray";
}

function setHtml(id, html) {
  document.getElementById(id).innerHTML = html;
}

function tile(label, value, sub = "", status = "") {
  return `
    <article class="tile">
      <div class="label">${label}</div>
      <div class="value ${classForStatus(status || value)}">${valueOrFallback(value)}</div>
      <div class="sub">${sub || ""}</div>
    </article>
  `;
}

function metric(label, value, status = "") {
  return `
    <div class="metric">
      <div class="label">${label}</div>
      <div class="value ${classForStatus(status || value)}">${valueOrFallback(value)}</div>
    </div>
  `;
}

function list(values, formatter = (value) => value) {
  if (!Array.isArray(values) || !values.length) return "<li>none</li>";
  return values.map((value) => `<li>${formatter(value)}</li>`).join("");
}

function riskCard(title, values, formatter) {
  return `
    <article class="risk-card">
      <h3>${title}</h3>
      <ul>${list(values, formatter)}</ul>
    </article>
  `;
}

function groupBy(values, keyFn) {
  return (values || []).reduce((groups, value) => {
    const key = keyFn(value);
    groups[key] = groups[key] || [];
    groups[key].push(value);
    return groups;
  }, {});
}

function renderTiles(projectMap, reviewHistory) {
  const summary = projectMap.summary || {};
  const vault = projectMap.vault_audit || {};
  const review = latest(reviewHistory) || {};
  const vaultGaps =
    count(vault.used_not_in_inventory) +
    count(vault.secret_like_public_env) +
    count(vault.required_unknown_status);

  setHtml("tiles", [
    tile("Architecture Confidence", summary.architecture_confidence, projectMap.architecture_history?.trend, projectMap.architecture_history?.trend),
    tile("Vault Score", vault.vault_score, vault.history?.trend, vault.history?.trend),
    tile("Dev Review Confidence", review.confidence_percent ? `${review.confidence_percent}%` : "n/a", review.confidence_interpretation),
    tile("High-Risk Nodes", summary.high_risk_nodes_count, "mapped risk"),
    tile("Unknowns", count(projectMap.unknowns), "needs review", count(projectMap.unknowns) ? "warning" : "good"),
    tile("Vault Gaps", vaultGaps, "missing/warnings"),
    tile("Latest Decision", review.exit_reason || "n/a", review.exit_reason),
  ].join(""));
}

function renderCommentary(projectMap) {
  const commentary = projectMap.executive_commentary || [];
  setHtml("executive-commentary", list(commentary));
}

function renderArchitectureRoom(projectMap) {
  const summary = projectMap.summary || {};
  const history = projectMap.architecture_history || {};
  setHtml("architecture-room", [
    metric("Architecture confidence", summary.architecture_confidence),
    metric("Trend", history.trend),
    metric("Previous confidence", history.previous_confidence),
    metric("Confidence delta", history.confidence_delta),
    metric("Total files", summary.total_files),
    metric("Routes", summary.routes_count),
    metric("API routes", summary.api_routes_count),
    metric("Webhook routes", summary.webhook_routes_count),
    metric("High-risk nodes", summary.high_risk_nodes_count),
    metric("Unknowns", count(projectMap.unknowns)),
    metric("Unclassified nodes", summary.unclassified_nodes_count),
  ].join(""));
}

function renderVaultRoom(projectMap) {
  const vault = projectMap.vault_audit || {};
  setHtml("vault-room", [
    metric("Vault score", vault.vault_score),
    metric("Trend", vault.history?.trend),
    metric("Previous score", vault.history?.previous_score),
    metric("Score delta", vault.history?.score_delta),
    metric("Inventory found", String(Boolean(vault.inventory_found))),
    metric("Detected env vars", vault.detected_env_vars_count),
    metric("Inventoried names", vault.inventoried_secret_names_count),
    metric("Used not in inventory", count(vault.used_not_in_inventory)),
    metric("Inventoried not used", count(vault.inventoried_not_used)),
    metric("Secret-like public env", count(vault.secret_like_public_env)),
    metric("Unknown required status", count(vault.required_unknown_status)),
  ].join(""));
}

function renderDevRoom(reviewHistory, projectMap) {
  const review = latest(reviewHistory) || {};
  const previousReview = previous(reviewHistory);
  const trend = previousReview
    ? review.confidence_score > previousReview.confidence_score
      ? "improved"
      : review.confidence_score < previousReview.confidence_score
        ? "declined"
        : "unchanged"
    : "unknown";

  setHtml("dev-room", [
    metric("Confidence", review.confidence_percent ? `${review.confidence_percent}%` : "n/a", trend),
    metric("Trend", trend),
    metric("Selected skills", (review.selected_skills || []).join(", ") || "none"),
    metric("Critical findings", review.critical_findings_count),
    metric("High findings", review.high_findings_count),
    metric("Medium findings", review.medium_findings_count),
    metric("Low findings", review.low_findings_count),
    metric("Changed files", review.changed_files_count),
    metric("Exit reason", review.exit_reason),
    metric("Project map used", String(Boolean(review.project_map_used))),
    metric("Architecture confidence", review.architecture_confidence ?? projectMap.summary?.architecture_confidence),
  ].join(""));
}

function renderRiskTables(projectMap) {
  const vault = projectMap.vault_audit || {};
  const highRiskNodes = projectMap.risk_summary?.high_risk_nodes || [];
  const groupedUnknowns = groupBy(projectMap.unknowns || [], (unknown) => unknown.type || "unknown");
  const unknownRows = Object.entries(groupedUnknowns).map(([type, values]) => `${type}: ${values.length}`);

  setHtml("risk-tables", [
    riskCard("High-Risk Nodes", highRiskNodes),
    riskCard("Unknowns By Type", unknownRows),
    riskCard("Vault Used Not In Inventory", vault.used_not_in_inventory || []),
    riskCard("Vault Inventoried Not Used", vault.inventoried_not_used || []),
    riskCard("Secret-Like Public Env", vault.secret_like_public_env || []),
    riskCard("Required Unknown Status", vault.required_unknown_status || []),
  ].join(""));
}

function renderNodePreview(projectMap) {
  const rows = (projectMap.nodes || []).slice(0, 50).map((node) => {
    const riskTags = (node.risk_tags || [])
      .map((tag) => `<span class="pill">${tag}</span>`)
      .join("");
    return `
      <tr>
        <td>${valueOrFallback(node.path || node.name)}</td>
        <td>${valueOrFallback(node.type)}</td>
        <td>${valueOrFallback(node.classification)}</td>
        <td class="${classForStatus(node.trust_boundary)}">${valueOrFallback(node.trust_boundary)}</td>
        <td>${riskTags || "none"}</td>
        <td>${valueOrFallback(node.confidence)}</td>
        <td class="${classForStatus(node.status)}">${valueOrFallback(node.status)}</td>
      </tr>
    `;
  });

  setHtml("node-preview", rows.join("") || "<tr><td colspan=\"7\">No nodes found.</td></tr>");
}

function hasMissingData(payloads) {
  return Object.values(payloads).some((payload) => payload?.missing);
}

async function main() {
  const payloads = {
    projectMap: await loadJson(endpoints.projectMap),
    architectureHistory: await loadJson(endpoints.architectureHistory),
    vaultHistory: await loadJson(endpoints.vaultHistory),
    reviewHistory: await loadJson(endpoints.reviewHistory),
  };

  if (hasMissingData(payloads)) {
    document.getElementById("missing-data").classList.remove("hidden");
  }

  const projectMap = payloads.projectMap?.missing ? {} : payloads.projectMap;
  const reviewHistory = Array.isArray(payloads.reviewHistory) ? payloads.reviewHistory : [];

  renderTiles(projectMap, reviewHistory);
  renderCommentary(projectMap);
  renderArchitectureRoom(projectMap);
  renderVaultRoom(projectMap);
  renderDevRoom(reviewHistory, projectMap);
  renderRiskTables(projectMap);
  renderNodePreview(projectMap);
}

main().catch((error) => {
  document.getElementById("missing-data").classList.remove("hidden");
  console.error(error);
});
