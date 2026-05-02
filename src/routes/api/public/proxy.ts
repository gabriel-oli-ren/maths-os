import { createFileRoute } from "@tanstack/react-router";

/**
 * Maths Browse — in-project framing proxy.
 *
 * Fetches the target URL server-side and:
 *   - strips X-Frame-Options / Content-Security-Policy so the response can be iframed,
 *   - rewrites HTML <base>, links, scripts, and CSS url() references to keep going through the proxy,
 *   - allows CORS for client-side fetches.
 *
 * This is NOT a full Ultraviolet/Rammerhead replacement (no service-worker URL rewriting,
 * no cookie jar, no websocket forwarding) but it works for ~80% of static + lightly-interactive
 * sites and unblocked-game embeds.
 *
 * Usage: /api/public/proxy?url=https%3A%2F%2Fexample.com
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "permissions-policy",
  "report-to",
  "strict-transport-security",
]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function rewriteHtml(html: string, target: URL, proxyOrigin: string): string {
  const proxyPrefix = `${proxyOrigin}/api/public/proxy?url=`;
  const baseHref = target.href;

  // Inject a <base> + small runtime that rewrites dynamic fetch/XHR to the proxy.
  const headInjection = `
<base href="${baseHref}">
<script>(function(){
  try {
    var P = ${JSON.stringify(proxyPrefix)};
    var BASE = ${JSON.stringify(baseHref)};
    function abs(u){ try { return new URL(u, BASE).href; } catch(e){ return u; } }
    function wrap(u){
      if (!u) return u;
      var s = String(u);
      if (s.indexOf('data:')===0 || s.indexOf('blob:')===0 || s.indexOf('javascript:')===0) return s;
      if (s.indexOf(P)===0) return s;
      return P + encodeURIComponent(abs(s));
    }
    var of = window.fetch;
    if (of) window.fetch = function(input, init){
      try {
        if (typeof input === 'string') input = wrap(input);
        else if (input && input.url) input = new Request(wrap(input.url), input);
      } catch(e){}
      return of.call(this, input, init);
    };
    var XO = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
    if (XO) window.XMLHttpRequest.prototype.open = function(m, u){
      try { arguments[1] = wrap(u); } catch(e){}
      return XO.apply(this, arguments);
    };
  } catch(e){}
})();</script>`;

  let out = html;

  // Drop <meta http-equiv="Content-Security-Policy" ...>
  out = out.replace(
    /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    "",
  );
  // Drop <meta http-equiv="X-Frame-Options" ...>
  out = out.replace(
    /<meta[^>]+http-equiv=["']?x-frame-options["']?[^>]*>/gi,
    "",
  );

  // Inject base + runtime right after <head>
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => m + headInjection);
  } else {
    out = headInjection + out;
  }

  // Rewrite href="..." and src="..." (skip data:, blob:, javascript:, anchors).
  out = out.replace(
    /\b(href|src|action|poster|formaction)\s*=\s*(["'])([^"']*)\2/gi,
    (m, attr, q, val) => {
      const v = String(val).trim();
      if (
        !v ||
        v.startsWith("#") ||
        v.startsWith("data:") ||
        v.startsWith("blob:") ||
        v.startsWith("javascript:") ||
        v.startsWith("mailto:") ||
        v.startsWith("tel:")
      )
        return m;
      try {
        const abs = new URL(v, target).href;
        return `${attr}=${q}${proxyPrefix}${encodeURIComponent(abs)}${q}`;
      } catch {
        return m;
      }
    },
  );

  // Rewrite srcset (comma-separated)
  out = out.replace(
    /\bsrcset\s*=\s*(["'])([^"']*)\1/gi,
    (_m, q, val) => {
      const parts = String(val)
        .split(",")
        .map((part) => {
          const trimmed = part.trim();
          const [u, ...rest] = trimmed.split(/\s+/);
          if (!u) return trimmed;
          try {
            const abs = new URL(u, target).href;
            return `${proxyPrefix}${encodeURIComponent(abs)}${rest.length ? " " + rest.join(" ") : ""}`;
          } catch {
            return trimmed;
          }
        })
        .join(", ");
      return `srcset=${q}${parts}${q}`;
    },
  );

  return out;
}

function rewriteCss(css: string, target: URL, proxyOrigin: string): string {
  const proxyPrefix = `${proxyOrigin}/api/public/proxy?url=`;
  return css.replace(
    /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi,
    (m, q, val) => {
      const v = String(val).trim();
      if (!v || v.startsWith("data:") || v.startsWith("blob:")) return m;
      try {
        const abs = new URL(v, target).href;
        return `url(${q}${proxyPrefix}${encodeURIComponent(abs)}${q})`;
      } catch {
        return m;
      }
    },
  );
}

async function handle(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  if (!target) return badRequest("Missing ?url= parameter");

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return badRequest("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return badRequest("Only http/https URLs are allowed");
  }

  // Build outgoing headers
  const outHeaders = new Headers();
  outHeaders.set(
    "User-Agent",
    "Mozilla/5.0 (Maths Browse Proxy) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  );
  outHeaders.set("Accept", request.headers.get("Accept") || "*/*");
  outHeaders.set("Accept-Language", request.headers.get("Accept-Language") || "en-US,en;q=0.9");
  // We deliberately do NOT forward cookies — keeps it stateless / safe.

  let upstream: Response;
  try {
    upstream = await fetch(parsed.href, {
      method: request.method,
      headers: outHeaders,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "follow",
    });
  } catch (err) {
    return new Response(
      `Maths Browse failed to load this page: ${(err as Error).message}`,
      { status: 502, headers: { "Content-Type": "text/plain", ...CORS_HEADERS } },
    );
  }

  // Build response headers — strip framing/CSP/hop-by-hop.
  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) respHeaders.set(key, value);
  });
  Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v));

  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  const proxyOrigin = `${reqUrl.protocol}//${reqUrl.host}`;

  // Rewrite HTML
  if (ct.includes("text/html")) {
    const html = await upstream.text();
    const rewritten = rewriteHtml(html, parsed, proxyOrigin);
    respHeaders.set("Content-Type", "text/html; charset=utf-8");
    return new Response(rewritten, { status: upstream.status, headers: respHeaders });
  }

  // Rewrite CSS url() references
  if (ct.includes("text/css")) {
    const css = await upstream.text();
    const rewritten = rewriteCss(css, parsed, proxyOrigin);
    respHeaders.set("Content-Type", "text/css; charset=utf-8");
    return new Response(rewritten, { status: upstream.status, headers: respHeaders });
  }

  // Stream everything else through unchanged.
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const Route = createFileRoute("/api/public/proxy")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
