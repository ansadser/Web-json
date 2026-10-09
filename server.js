const express = require("express");
const dns = require("node:dns").promises;
const net = require("node:net");
const path = require("node:path");

const app = express();
const PORT = process.env.PORT || 8000;
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a,b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
function isPrivateIPv6(ip) {
  const s = ip.toLowerCase().split("%")[0];
  return s === "::" || s === "::1" || s.startsWith("fc") || s.startsWith("fd") ||
    /^fe[89ab]/.test(s) || s.startsWith("::ffff:127.") || s.startsWith("::ffff:10.") ||
    s.startsWith("::ffff:192.168.") || s.startsWith("::ffff:169.254.");
}
async function validatePublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("Please enter a valid URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (u.username || u.password) throw new Error("Do not put credentials inside the URL. Use request headers instead.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Local network URLs are blocked for safety.");
  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isPrivateIPv4(host)) || (net.isIPv6(host) && isPrivateIPv6(host))) throw new Error("Private or local IP addresses are blocked.");
  } else {
    let records;
    try { records = await dns.lookup(host, { all: true }); } catch { throw new Error("Could not resolve the API hostname."); }
    if (!records.length || records.some(r => (net.isIPv4(r.address) && isPrivateIPv4(r.address)) || (net.isIPv6(r.address) && isPrivateIPv6(r.address)))) {
      throw new Error("The hostname resolves to a private or restricted address and was blocked.");
    }
  }
  return u;
}

app.post("/api/fetch", async (req, res) => {
  const { url, method = "GET", headers = {}, body } = req.body || {};
  if (typeof url !== "string" || !url.trim()) return res.status(400).json({ error: "API URL is required." });
  const verb = String(method).toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(verb)) return res.status(400).json({ error: "Unsupported HTTP method." });
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return res.status(400).json({ error: "Headers must be a JSON object." });
  const safeHeaders = {};
  for (const [k,v] of Object.entries(headers)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(k) || /^(host|connection|content-length|transfer-encoding|cookie|set-cookie|origin|referer|accept-encoding)$/i.test(k)) continue;
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") continue;
    safeHeaders[k] = String(v);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const started = Date.now();
  try {
    const target = await validatePublicUrl(url.trim());
    const response = await fetch(target, {
      method: verb,
      headers: safeHeaders,
      body: ["GET", "HEAD"].includes(verb) ? undefined : (body == null || body === "" ? undefined : String(body)),
      redirect: "manual",
      signal: controller.signal
    });
    // Do not follow redirects automatically; validate each new destination on a new request.
    const responseText = await response.text();
    const responseHeaders = {};
    response.headers.forEach((v,k) => { responseHeaders[k] = v; });
    res.json({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get("content-type") || "",
      size: Buffer.byteLength(responseText, "utf8"),
      timeMs: Date.now() - started,
      headers: responseHeaders,
      body: responseText
    });
  } catch (err) {
    const msg = err.name === "AbortError" ? "Request timed out after 30 seconds." : (err.message || "Request failed.");
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
});

app.get("*path", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API route not found." });
  res.sendFile(path.join(__dirname, "public", "index.html"), err => { if (err) next(); });
});

app.listen(PORT, "0.0.0.0", () => console.log("Web-json listening on port " + PORT));
