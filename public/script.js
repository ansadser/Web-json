const $ = (id) => document.getElementById(id);
let currentBody = "";
let currentHeaders = {};
$("showAdvanced").addEventListener("change", () => $("advancedFields").classList.toggle("hidden", !$("showAdvanced").checked));
function prettyBody(text, contentType) {
  const t = (contentType || "").toLowerCase();
  if (t.includes("json") || /^[\s]*[\[{]/.test(text)) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch {}
  }
  return text;
}
function formatBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024*1024) return (n/1024).toFixed(1) + " KB";
  return (n/(1024*1024)).toFixed(2) + " MB";
}
function showError(message) { $("error").textContent = message; $("error").classList.remove("hidden"); }
$("fetchBtn").addEventListener("click", async () => {
  const url = $("url").value.trim();
  $("error").classList.add("hidden");
  if (!url) return showError("Enter an API URL first.");
  let headers;
  try { headers = $("headers").value.trim() ? JSON.parse($("headers").value) : {}; }
  catch { return showError("Headers must be valid JSON."); }
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return showError("Headers must be a JSON object.");
  const btn = $("fetchBtn");
  btn.disabled = true; btn.innerHTML = "Fetching…";
  try {
    const response = await fetch("/api/fetch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method: $("method").value, headers, body: $("body").value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed.");
    currentBody = result.body ?? "";
    currentHeaders = result.headers || {};
    const displayBody = prettyBody(currentBody, result.contentType);
    $("responsePanel").classList.remove("hidden");
    $("status").textContent = result.status + " " + result.statusText;
    $("status").style.color = result.ok ? "#8bdab6" : "#ffb17c";
    $("time").textContent = result.timeMs + " ms";
    $("size").textContent = formatBytes(result.size);
    $("type").textContent = result.contentType || "Unknown";
    $("responseSubtitle").textContent = "HTTP " + result.status + " · Full response body";
    $("responseBody").querySelector("code").textContent = displayBody;
    $("responseHeaders").querySelector("code").textContent = Object.entries(currentHeaders).map(([k,v]) => k + ": " + v).join("\n") || "(No response headers)";
    $("charCount").textContent = currentBody.length.toLocaleString() + " characters";
    $("formatLabel").textContent = displayBody !== currentBody ? "FORMATTED JSON" : "RAW RESPONSE";
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "body"));
    $("responseBody").classList.remove("hidden"); $("responseHeaders").classList.add("hidden");
    $("responsePanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message || "Could not fetch this API. Check the URL and try again.");
  } finally {
    btn.disabled = false; btn.innerHTML = 'Fetch <span>↗</span>';
  }
});
$("url").addEventListener("keydown", e => { if (e.key === "Enter") $("fetchBtn").click(); });
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  const body = tab.dataset.tab === "body";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
  $("responseBody").classList.toggle("hidden", !body);
  $("responseHeaders").classList.toggle("hidden", body);
}));
$("copyBtn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(currentBody); $("copyBtn").textContent = "✓ Copied"; setTimeout(() => $("copyBtn").textContent = "▣ Copy", 1400); }
  catch { showError("Copy failed. Select the response text and copy it manually."); }
});
$("downloadBtn").addEventListener("click", () => {
  const blob = new Blob([currentBody], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "api-response-" + new Date().toISOString().replace(/[:.]/g,"-") + ".txt";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
});
