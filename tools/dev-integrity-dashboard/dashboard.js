const endpoints = {
  projectMap: "/data/project-map.json",
  architectureHistory: "/data/architecture-confidence-history.json",
  vaultHistory: "/data/vault-score-history.json",
  reviewHistory: "/data/dev-integrity-review-history.json",
};

const state = {
  projectMap: {},
  reviewHistory: [],
  activeView: "builder",
  activeDetailKey: null,
};

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function trendFor(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return "unknown";
  if (current > prior) return "improved";
  if (current < prior) return "declined";
  return "unchanged";
}

function setHtml(id, html) {
  document.getElementById(id).innerHTML = html;
}

function detailPayload({ title, status, explanation, relatedData, nextAction }) {
  return encodeURIComponent(JSON.stringify({
    title,
    status,
    explanation,
    relatedData,
    nextAction,
  }));
}

function clickableAttributes(payload) {
  return `role="button" tabindex="0" data-detail="${payload}" data-detail-key="${payload}"`;
}

function tile(label, value, sub = "", status = "", detail = {}) {
  const payload = detailPayload({
    title: detail.title || label,
    status: status || valueOrFallback(value),
    explanation: detail.explanation || sub || "Metric generated from local Dev Integrity artifacts.",
    relatedData: detail.relatedData || { value },
    nextAction: detail.nextAction || "Review related rows in this control room.",
  });

  return `
    <article class="tile clickable" ${clickableAttributes(payload)}>
      <div class="label">${escapeHtml(label)}</div>
      <div class="value ${classForStatus(status || value)}">${escapeHtml(valueOrFallback(value))}</div>
      <div class="sub">${escapeHtml(sub || "")}</div>
    </article>
  `;
}

function metric(label, value, status = "") {
  return `
    <div class="metric">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value ${classForStatus(status || value)}">${escapeHtml(valueOrFallback(value))}</div>
    </div>
  `;
}

function list(values, formatter = (value) => value) {
  if (!Array.isArray(values) || !values.length) return "<li>none</li>";
  return values.map((value) => `<li>${formatter(value)}</li>`).join("");
}

function riskCard(title, values, formatter, nextAction) {
  return `
    <article class="risk-card">
      <h3>${escapeHtml(title)}</h3>
      <ul>${list(values, formatter || ((value) => clickableListItem(value, title, nextAction)))}</ul>
    </article>
  `;
}

function clickableListItem(value, title, nextAction = "Review this item in the source control room data.") {
  const label = typeof value === "string" ? value : JSON.stringify(value);
  const payload = detailPayload({
    title,
    status: classForStatus(label),
    explanation: "Selected item from a local generated risk list.",
    relatedData: value,
    nextAction,
  });
  return `<span class="clickable text-link" ${clickableAttributes(payload)}>${escapeHtml(label)}</span>`;
}

function groupBy(values, keyFn) {
  return (values || []).reduce((groups, value) => {
    const key = keyFn(value);
    groups[key] = groups[key] || [];
    groups[key].push(value);
    return groups;
  }, {});
}

function nodeByPath(projectMap, nodePath) {
  return (projectMap.nodes || []).find((node) => node.path === nodePath);
}

function riskTags(tags) {
  return (tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("") || "none";
}

function renderOverview(projectMap, reviewHistory) {
  const summary = projectMap.summary || {};
  const vault = projectMap.vault_audit || {};
  const review = latest(reviewHistory) || {};
  const vaultGaps =
    count(vault.used_not_in_inventory) +
    count(vault.secret_like_public_env) +
    count(vault.required_unknown_status);

  setHtml("overview-tiles", [
    tile("Architecture Confidence", summary.architecture_confidence, projectMap.architecture_history?.trend, projectMap.architecture_history?.trend, {
      explanation: "Measures how complete and understandable the architecture map is.",
      relatedData: projectMap.architecture_history,
      nextAction: "Open Architecture Control Room and review unknowns.",
    }),
    tile("Vault Score", vault.vault_score, vault.history?.trend, vault.history?.trend, {
      explanation: "Measures secret inventory coverage and Vault audit health.",
      relatedData: vault.history,
      nextAction: "Open Vault Control Room and review gaps.",
    }),
    tile("Dev Review Confidence", review.confidence_percent ? `${review.confidence_percent}%` : "n/a", review.confidence_interpretation, "", {
      explanation: "Latest local Dev Integrity review confidence.",
      relatedData: review,
      nextAction: "Open Dev Control Room and review selected skills.",
    }),
    tile("High-Risk Nodes", summary.high_risk_nodes_count, "mapped risk", "", {
      relatedData: projectMap.risk_summary?.high_risk_nodes || [],
      nextAction: "Open Architecture Control Room and inspect high-risk nodes.",
    }),
    tile("Unknowns", count(projectMap.unknowns), "needs review", count(projectMap.unknowns) ? "warning" : "good", {
      relatedData: projectMap.unknowns || [],
      nextAction: "Review unknown groups and run the suggested checks.",
    }),
    tile("Vault Gaps", vaultGaps, "missing/warnings", vaultGaps ? "warning" : "good", {
      relatedData: {
        used_not_in_inventory: vault.used_not_in_inventory || [],
        secret_like_public_env: vault.secret_like_public_env || [],
        required_unknown_status: vault.required_unknown_status || [],
      },
      nextAction: "Update inventory or confirm provider-only items.",
    }),
    tile("Latest Decision", review.exit_reason || "n/a", "latest review", review.exit_reason, {
      relatedData: review,
      nextAction: "Resolve blockers before commit or deploy if exit reason is not passed.",
    }),
  ].join(""));

  setHtml("executive-commentary", list(projectMap.executive_commentary || [], (item) => escapeHtml(item)));
  renderSimpleOverview(projectMap, reviewHistory, vaultGaps);

  const groupedUnknowns = groupBy(projectMap.unknowns || [], (unknown) => unknown.type || "unknown");
  const unknownRows = Object.entries(groupedUnknowns).map(([type, values]) => `${type}: ${values.length}`);
  setHtml("overview-blockers", [
    riskCard("Unknowns By Type", unknownRows, null, "Open Architecture Control Room and review unknown details."),
    riskCard("High-Risk Nodes", (projectMap.risk_summary?.high_risk_nodes || []).slice(0, 15), null, "Open Architecture Control Room and inspect this node."),
    riskCard("Vault Gaps", [
      `used_not_in_inventory: ${count(vault.used_not_in_inventory)}`,
      `secret_like_public_env: ${count(vault.secret_like_public_env)}`,
      `required_unknown_status: ${count(vault.required_unknown_status)}`,
    ], null, "Open Vault Control Room and review this gap category."),
    riskCard("Latest Dev Review", [
      `confidence: ${review.confidence_percent ?? "n/a"}%`,
      `exit_reason: ${review.exit_reason || "n/a"}`,
      `changed_files: ${review.changed_files_count ?? "n/a"}`,
    ], null, "Open Dev Control Room and review the latest entry."),
  ].join(""));
}

function overallStatus(projectMap, reviewHistory, vaultGaps) {
  const summary = projectMap.summary || {};
  const review = latest(reviewHistory) || {};
  if ((review.critical_findings_count || 0) > 0 || (review.high_findings_count || 0) > 0) {
    return {
      title: "Blocked",
      status: "blocked",
      explanation: "Critical or High review findings need resolution before commit or deploy.",
      nextAction: "Fix, waive, or explicitly review blockers before proceeding.",
    };
  }
  if ((review.confidence_score ?? 1) < 0.7 || vaultGaps > 0 || count(projectMap.unknowns) > 0) {
    return {
      title: "Review Needed",
      status: "warning",
      explanation: "No deterministic blocker is shown, but unknowns or Vault gaps still need review.",
      nextAction: "Start with top risks and suggested next actions below.",
    };
  }
  if ((summary.architecture_confidence ?? 0) >= 70 && (review.confidence_score ?? 0) >= 0.9) {
    return {
      title: "Clean",
      status: "passed",
      explanation: "Current generated signals show high review confidence and no obvious blocker.",
      nextAction: "Keep running map and review before production-sensitive changes.",
    };
  }
  return {
    title: "Stable With Caveats",
    status: "review",
    explanation: "The project is mapped, but confidence or runtime proof still has caveats.",
    nextAction: "Use Builder or Developer View for details.",
  };
}

function topRiskItems(projectMap) {
  const vault = projectMap.vault_audit || {};
  const risks = [];

  if (count(projectMap.unknowns)) {
    risks.push({
      label: `${count(projectMap.unknowns)} architecture unknowns`,
      nextAction: "Open Developer View to inspect unknown types and runtime proof gaps.",
      data: projectMap.unknowns,
    });
  }
  if ((projectMap.summary?.high_risk_nodes_count || 0) > 0) {
    risks.push({
      label: `${projectMap.summary.high_risk_nodes_count} high-risk architecture nodes`,
      nextAction: "Open Architecture Control Room and review high-risk nodes before sensitive changes.",
      data: projectMap.risk_summary?.high_risk_nodes || [],
    });
  }
  if (count(vault.used_not_in_inventory)) {
    risks.push({
      label: `${count(vault.used_not_in_inventory)} env vars missing from inventory`,
      nextAction: "Update the SaanaOS secret inventory with env var names only.",
      data: vault.used_not_in_inventory,
    });
  }
  if (count(vault.secret_like_public_env)) {
    risks.push({
      label: `${count(vault.secret_like_public_env)} public env exposure warnings`,
      nextAction: "Confirm client-public names contain no secret values.",
      data: vault.secret_like_public_env,
    });
  }
  if (count(vault.required_unknown_status)) {
    risks.push({
      label: `${count(vault.required_unknown_status)} inventory statuses need confirmation`,
      nextAction: "Clarify required, optional, future, or removable status.",
      data: vault.required_unknown_status,
    });
  }

  return risks.slice(0, 3);
}

function renderSimpleOverview(projectMap, reviewHistory, vaultGaps) {
  const status = overallStatus(projectMap, reviewHistory, vaultGaps);
  const review = latest(reviewHistory) || {};
  const risks = topRiskItems(projectMap);
  const suggestedActions = [
    count(projectMap.unknowns) ? "Review runtime proof, webhook trust, auth boundary, and file-upload unknowns." : null,
    vaultGaps ? "Review Vault gaps and update inventory names/statuses without adding secret values." : null,
    review.exit_reason === "passed" ? "Keep running integrity:map and integrity:review before commits." : "Resolve review blockers before commit or deploy.",
  ].filter(Boolean);

  const statusPayload = detailPayload({
    title: status.title,
    status: status.status,
    explanation: status.explanation,
    relatedData: {
      review_confidence: review.confidence_score,
      architecture_confidence: projectMap.summary?.architecture_confidence,
      vault_score: projectMap.vault_audit?.vault_score,
      unknowns: count(projectMap.unknowns),
      vault_gaps: vaultGaps,
    },
    nextAction: status.nextAction,
  });

  setHtml("simple-status", `
    <article class="panel status-card clickable" ${clickableAttributes(statusPayload)}>
      <div class="panel-heading">
        <h2>Overall Status</h2>
        <span class="${classForStatus(status.status)}">${escapeHtml(status.title)}</span>
      </div>
      <p>${escapeHtml(status.explanation)}</p>
      <p class="next-action">${escapeHtml(status.nextAction)}</p>
    </article>
    <article class="panel status-card">
      <div class="panel-heading">
        <h2>Switch Views</h2>
      </div>
      <div class="action-row">
        <button class="action-button" type="button" data-view-option="builder">Open Builder View</button>
        <button class="action-button" type="button" data-view-option="developer">Open Developer View</button>
      </div>
    </article>
  `);

  setHtml("simple-risks", risks.length
    ? risks.map((risk) => riskCard(risk.label, [risk.label], () => clickableListItem(risk.label, "Top risk", risk.nextAction))).join("")
    : "<p class=\"muted\">No top risks found in the current generated artifacts.</p>");

  setHtml("simple-actions", suggestedActions.map((action) => {
    const payload = detailPayload({
      title: "Suggested next action",
      status: "next action",
      explanation: action,
      relatedData: { action },
      nextAction: action,
    });
    return `<button class="action-button clickable" type="button" ${clickableAttributes(payload)}>${escapeHtml(action)}</button>`;
  }).join(""));
}

function renderDevRoom(reviewHistory) {
  const review = latest(reviewHistory) || {};
  const prior = previous(reviewHistory);
  const trend = trendFor(review.confidence_score, prior?.confidence_score);

  setHtml("dev-tiles", [
    tile("Review Confidence", review.confidence_percent ? `${review.confidence_percent}%` : "n/a", review.confidence_interpretation, trend, {
      relatedData: review,
      nextAction: "If confidence is low, run the selected review skills before commit.",
    }),
    tile("Trend", trend, "latest vs previous", trend, {
      relatedData: { latest: review.confidence_score, previous: prior?.confidence_score },
      nextAction: "Investigate changed files if trend declined.",
    }),
    tile("Selected Skills", count(review.selected_skills), (review.selected_skills || []).join(", ") || "none", "", {
      relatedData: review.selected_skills || [],
      nextAction: "Run or review the selected skills if the change is not clean.",
    }),
    tile("Finding Counts", `${review.critical_findings_count || 0}/${review.high_findings_count || 0}/${review.medium_findings_count || 0}/${review.low_findings_count || 0}`, "critical/high/medium/low", "", {
      relatedData: {
        critical: review.critical_findings_count || 0,
        high: review.high_findings_count || 0,
        medium: review.medium_findings_count || 0,
        low: review.low_findings_count || 0,
      },
      nextAction: "Resolve Critical and High findings before commit or deploy.",
    }),
    tile("Changed Files", review.changed_files_count, "latest review", "", {
      relatedData: review,
      nextAction: "Review changed files and generated routing.",
    }),
    tile("Exit Reason", review.exit_reason || "n/a", "latest review", review.exit_reason, {
      relatedData: review,
      nextAction: "Proceed only when exit reason is passed or explicitly reviewed.",
    }),
    tile("Project Map Used", String(Boolean(review.project_map_used)), "architecture context", review.project_map_used ? "good" : "warning", {
      relatedData: review,
      nextAction: "Run npm run integrity:map if project map was unavailable.",
    }),
  ].join(""));

  const rows = [...(reviewHistory || [])].slice(-20).reverse().map((entry) => {
    const rowTrend = trendFor(entry.confidence_score, prior?.confidence_score);
    const payload = detailPayload({
      title: `Review ${entry.commit_sha || "unknown"}`,
      status: entry.exit_reason || "unknown",
      explanation: "Review history entry generated by the local Dev Integrity review script.",
      relatedData: entry,
      nextAction: entry.exit_reason === "passed" ? "No blocker recorded for this entry." : "Review selected skills and findings.",
    });
    return `
      <tr class="clickable" ${clickableAttributes(payload)}>
        <td>${escapeHtml(entry.timestamp)}</td>
        <td>${escapeHtml(entry.commit_sha)}</td>
        <td>${escapeHtml(entry.confidence_percent)}%</td>
        <td class="${classForStatus(rowTrend)}">${escapeHtml(rowTrend)}</td>
        <td>${escapeHtml((entry.selected_skills || []).join(", ") || "none")}</td>
        <td>${escapeHtml(`${entry.critical_findings_count || 0}/${entry.high_findings_count || 0}/${entry.medium_findings_count || 0}/${entry.low_findings_count || 0}`)}</td>
        <td>${escapeHtml(entry.changed_files_count)}</td>
        <td class="${classForStatus(entry.exit_reason)}">${escapeHtml(entry.exit_reason)}</td>
      </tr>
    `;
  });

  setHtml("review-history-table", rows.join("") || "<tr><td colspan=\"8\">No review history found.</td></tr>");
}

function renderArchitectureRoom(projectMap) {
  const summary = projectMap.summary || {};
  const history = projectMap.architecture_history || {};

  setHtml("architecture-tiles", [
    tile("Architecture Confidence", summary.architecture_confidence, history.trend, history.trend, {
      relatedData: history,
      nextAction: "Review unknowns and runtime proof gaps.",
    }),
    tile("High-Risk Nodes", summary.high_risk_nodes_count, "mapped risk", "", {
      relatedData: projectMap.risk_summary?.high_risk_nodes || [],
      nextAction: "Click a high-risk node row for details.",
    }),
    tile("Unknowns", count(projectMap.unknowns), "needs review", count(projectMap.unknowns) ? "warning" : "good", {
      relatedData: projectMap.unknowns || [],
      nextAction: "Group unknowns by type and clear what can be verified.",
    }),
    tile("Routes", summary.routes_count, "pages and routes", "", { relatedData: summary }),
    tile("API Routes", summary.api_routes_count, "server endpoints", "", { relatedData: summary }),
    tile("Webhook Routes", summary.webhook_routes_count, "provider callbacks", "", { relatedData: summary }),
    tile("Unclassified Nodes", summary.unclassified_nodes_count, "classification gaps", summary.unclassified_nodes_count ? "warning" : "good", {
      relatedData: summary,
      nextAction: "Improve scanner rules only where classification is obvious.",
    }),
  ].join(""));

  renderNodePreview(projectMap);
  renderHighRiskNodes(projectMap);
  renderArchitectureUnknowns(projectMap);
}

function renderHighRiskNodes(projectMap) {
  const rows = (projectMap.risk_summary?.high_risk_nodes || []).slice(0, 50).map((nodePath) => {
    const node = nodeByPath(projectMap, nodePath) || { path: nodePath };
    const payload = detailPayload({
      title: node.path || node.name || "High-risk node",
      status: node.status || "high risk",
      explanation: "This node appears in the high-risk list generated by the architecture map.",
      relatedData: node,
      nextAction: "Review mapped risks and run the suggested review packs before production-sensitive changes.",
    });
    return `
      <tr class="clickable" ${clickableAttributes(payload)}>
        <td>${escapeHtml(node.path || node.name)}</td>
        <td>${escapeHtml(valueOrFallback(node.classification))}</td>
        <td class="${classForStatus(node.trust_boundary)}">${escapeHtml(valueOrFallback(node.trust_boundary))}</td>
        <td>${riskTags(node.risk_tags)}</td>
        <td class="${classForStatus(node.status)}">${escapeHtml(valueOrFallback(node.status))}</td>
      </tr>
    `;
  });
  setHtml("high-risk-node-table", rows.join("") || "<tr><td colspan=\"5\">No high-risk nodes found.</td></tr>");
}

function renderArchitectureUnknowns(projectMap) {
  const groupedUnknowns = groupBy(projectMap.unknowns || [], (unknown) => unknown.type || "unknown");
  const cards = Object.entries(groupedUnknowns).map(([type, values]) => riskCard(
    `${type} (${values.length})`,
    values,
    (unknown) => clickableListItem(unknown.message, type, unknown.suggested_action || "Review this unknown."),
    "Review this unknown."
  ));
  setHtml("architecture-unknowns", cards.join("") || "<p class=\"muted\">No unknowns found.</p>");
}

function renderVaultRoom(projectMap) {
  const vault = projectMap.vault_audit || {};
  setHtml("vault-tiles", [
    tile("Vault Score", vault.vault_score, vault.history?.trend, vault.history?.trend, {
      relatedData: vault.history,
      nextAction: "Review Vault gaps if the score declined or warnings remain.",
    }),
    tile("Inventory Found", String(Boolean(vault.inventory_found)), vault.inventory_path, vault.inventory_found ? "good" : "warning", {
      relatedData: { inventory_path: vault.inventory_path },
      nextAction: "Create or restore the secret inventory document if missing.",
    }),
    tile("Detected Env Vars", vault.detected_env_vars_count, "names only", "", { relatedData: vault.detected_env_vars_count }),
    tile("Inventoried Names", vault.inventoried_secret_names_count, "names only", "", { relatedData: vault.inventoried_secret_names_count }),
    tile("Used Not In Inventory", count(vault.used_not_in_inventory), "coverage gap", count(vault.used_not_in_inventory) ? "warning" : "good", {
      relatedData: vault.used_not_in_inventory || [],
      nextAction: "Update the inventory for env vars used in code.",
    }),
    tile("Inventoried Not Used", count(vault.inventoried_not_used), "review before deleting", "", {
      relatedData: vault.inventoried_not_used || [],
      nextAction: "Confirm provider-only, future, optional, or removable status.",
    }),
    tile("Public Env Warnings", count(vault.secret_like_public_env), "NEXT_PUBLIC review", count(vault.secret_like_public_env) ? "warning" : "good", {
      relatedData: vault.secret_like_public_env || [],
      nextAction: "Confirm public env names contain no secrets.",
    }),
    tile("Unknown Statuses", count(vault.required_unknown_status), "inventory status", count(vault.required_unknown_status) ? "warning" : "good", {
      relatedData: vault.required_unknown_status || [],
      nextAction: "Clarify required, optional, future, or removable status.",
    }),
  ].join(""));

  setHtml("vault-risk-tables", [
    riskCard("Used Not In Inventory", vault.used_not_in_inventory || [], null, "Add this env var name to the inventory."),
    riskCard("Inventoried Not Used", vault.inventoried_not_used || [], null, "Confirm provider-only, future, optional, or removable status."),
    riskCard("Secret-Like Public Env", vault.secret_like_public_env || [], null, "Review naming and exposure; client public values must not contain secrets."),
    riskCard("Required Unknown Status", vault.required_unknown_status || [], null, "Clarify required/optional/future status in the inventory."),
  ].join(""));
}

function renderNodePreview(projectMap) {
  const rows = (projectMap.nodes || []).slice(0, 50).map((node) => {
    const payload = detailPayload({
      title: node.path || node.name || "Architecture node",
      status: node.status || node.trust_boundary || "unknown",
      explanation: "Architecture node generated by the local project map scanner.",
      relatedData: node,
      nextAction: "Use classification, boundary, risk tags, and review packs to decide next checks.",
    });
    return `
      <tr class="clickable" ${clickableAttributes(payload)}>
        <td>${escapeHtml(valueOrFallback(node.path || node.name))}</td>
        <td>${escapeHtml(valueOrFallback(node.type))}</td>
        <td>${escapeHtml(valueOrFallback(node.classification))}</td>
        <td class="${classForStatus(node.trust_boundary)}">${escapeHtml(valueOrFallback(node.trust_boundary))}</td>
        <td>${riskTags(node.risk_tags)}</td>
        <td>${escapeHtml(valueOrFallback(node.confidence))}</td>
        <td class="${classForStatus(node.status)}">${escapeHtml(valueOrFallback(node.status))}</td>
      </tr>
    `;
  });

  setHtml("node-preview", rows.join("") || "<tr><td colspan=\"7\">No nodes found.</td></tr>");
}

function hasMissingData(payloads) {
  return Object.values(payloads).some((payload) => payload?.missing);
}

function openDrawer(payload) {
  const drawer = document.getElementById("detail-drawer");
  document.getElementById("drawer-title").textContent = payload.title || "Detail";
  const status = document.getElementById("drawer-status");
  status.textContent = payload.status || "unknown";
  status.className = `drawer-status ${classForStatus(payload.status)}`;
  document.getElementById("drawer-body").innerHTML = `
    <h3>Explanation</h3>
    <p>${escapeHtml(payload.explanation || "No explanation available.")}</p>
    <h3>Related Data</h3>
    <pre>${escapeHtml(JSON.stringify(payload.relatedData ?? {}, null, 2))}</pre>
    <h3>Suggested Next Action</h3>
    <p>${escapeHtml(payload.nextAction || "Review the related control-room data.")}</p>
  `;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  const drawer = document.getElementById("detail-drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  state.activeDetailKey = null;
}

function toggleDrawer(target) {
  const key = target.dataset.detailKey;
  if (state.activeDetailKey === key) {
    closeDrawer();
    return;
  }
  state.activeDetailKey = key;
  openDrawer(JSON.parse(decodeURIComponent(target.dataset.detail)));
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  const tab = document.querySelector(`[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add("active");
  if (panel) panel.classList.add("active");
}

function applyViewMode(view) {
  const nextView = ["simple", "builder", "developer"].includes(view) ? view : "builder";
  state.activeView = nextView;
  document.body.dataset.view = nextView;
  localStorage.setItem("devIntegrityDashboardView", nextView);
  document.querySelectorAll(".view-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewOption === nextView);
  });
  if (nextView === "simple") {
    activateTab("overview");
  }
}

function setupInteractions() {
  document.querySelectorAll("[data-view-option]").forEach((button) => {
    button.addEventListener("click", () => applyViewMode(button.dataset.viewOption));
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-detail]");
    if (!target) return;
    toggleDrawer(target);
  });

  document.body.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-detail]");
    if (!target) return;
    event.preventDefault();
    toggleDrawer(target);
  });

  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
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

  state.projectMap = payloads.projectMap?.missing ? {} : payloads.projectMap;
  state.reviewHistory = Array.isArray(payloads.reviewHistory) ? payloads.reviewHistory : [];

  renderOverview(state.projectMap, state.reviewHistory);
  renderDevRoom(state.reviewHistory);
  renderArchitectureRoom(state.projectMap);
  renderVaultRoom(state.projectMap);
  setupInteractions();
  applyViewMode(localStorage.getItem("devIntegrityDashboardView") || "builder");
}

main().catch((error) => {
  document.getElementById("missing-data").classList.remove("hidden");
  console.error(error);
});
