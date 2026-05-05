/**
 * Maths Browse — Service Worker.
 *
 * Forwards same-origin requests that look like proxy paths through
 * the Cloudflare Worker, and maintains a per-target cookie jar in
 * the SW (avoids losing logins across navigations inside the iframe).
 */
const PROXY = "https://search.mathssupport.cat";
const JAR = new Map(); // host -> cookie string

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only intercept requests we explicitly route through the proxy path scheme.
  if (!url.pathname.startsWith("/p/") && !url.searchParams.has("__mb")) return;

  event.respondWith((async () => {
    let target;
    if (url.pathname.startsWith("/p/")) {
      try { target = decodeURIComponent(url.pathname.slice(3)); } catch { target = url.pathname.slice(3); }
    } else {
      target = url.searchParams.get("__mb");
    }
    let host = "";
    try { host = new URL(target).host; } catch {}

    const headers = new Headers(req.headers);
    if (JAR.has(host)) headers.set("x-mb-cookie", JAR.get(host));

    const upstream = await fetch(PROXY + "/p/" + encodeURIComponent(target), {
      method: req.method,
      headers,
      body: ["GET","HEAD"].includes(req.method) ? undefined : await req.clone().arrayBuffer(),
      redirect: "follow",
    });

    const setCookie = upstream.headers.get("x-mb-set-cookie");
    if (setCookie && host) {
      const existing = JAR.get(host) || "";
      JAR.set(host, [existing, setCookie].filter(Boolean).join("; "));
    }
    return upstream;
  })());
});
