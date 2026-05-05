/**
 * Maths Browse — Cloudflare Worker proxy.
 *
 * Deploy:
 *   wrangler deploy proxy/worker.js --name maths-browse
 *   (route: search.mathssupport.cat/*)
 *
 * Usage:
 *   GET  https://search.mathssupport.cat/p/<encoded-url>
 *   GET  https://search.mathssupport.cat/?url=<encoded-url>
 *
 * Features:
 *   - Strips X-Frame-Options + frame-ancestors CSP so anything embeds in an iframe.
 *   - Rewrites HTML/CSS/JS so subresources keep flowing through the proxy.
 *   - Forwards cookies via a per-target cookie jar header (x-mb-cookie).
 *   - Spoofs User-Agent + Referer to look like a normal browser.
 *   - Supports POST/PUT bodies + manual redirect rewriting.
 *   - Permissive CORS so the SW + index.html can hit it cross-origin.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

function decodeTarget(req) {
  const u = new URL(req.url);
  if (u.searchParams.has("url")) return u.searchParams.get("url");
  // /p/<encoded>
  const m = u.pathname.match(/^\/p\/(.+)$/);
  if (m) {
    try {
      return decodeURIComponent(m[1] + u.search);
    } catch {
      return m[1];
    }
  }
  return null;
}

function proxify(absUrl, origin) {
  return `${origin}/p/${encodeURIComponent(absUrl)}`;
}

function stripFraming(headers) {
  const h = new Headers(headers);
  h.delete("x-frame-options");
  h.delete("content-security-policy");
  h.delete("content-security-policy-report-only");
  h.delete("cross-origin-opener-policy");
  h.delete("cross-origin-embedder-policy");
  h.delete("cross-origin-resource-policy");
  h.delete("permissions-policy");
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return h;
}

function rewriteHtml(html, baseUrl, origin) {
  const base = new URL(baseUrl);
  const abs = (u) => {
    try {
      return new URL(u, base).toString();
    } catch {
      return u;
    }
  };
  const px = (u) => proxify(abs(u), origin);

  // Inject a <base> + a tiny shim so client JS that builds URLs still hits the proxy.
  const head = `<base href="${origin}/p/${encodeURIComponent(base.toString())}">
<script>(function(){
  var O=window.fetch;
  var ORIGIN=${JSON.stringify(origin)};
  var BASE=${JSON.stringify(base.toString())};
  function px(u){try{return ORIGIN+'/p/'+encodeURIComponent(new URL(u,BASE).toString());}catch(e){return u;}}
  window.fetch=function(i,o){if(typeof i==='string')i=px(i);else if(i&&i.url)i=new Request(px(i.url),i);return O.call(this,i,o);};
  var X=window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open=function(m,u){return X.apply(this,[m,px(u)].concat([].slice.call(arguments,2)));};
})();</script>`;

  let out = html.replace(/<head([^>]*)>/i, (m) => m + head);

  // Rewrite href/src/action attributes (skip data:, blob:, javascript:, anchors).
  out = out.replace(
    /(<[^>]+?\s(?:href|src|action|poster|formaction|data-src)\s*=\s*)(["'])([^"']+)\2/gi,
    (m, pre, q, val) => {
      if (/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(val)) return m;
      return `${pre}${q}${px(val)}${q}`;
    }
  );

  // srcset
  out = out.replace(/(\ssrcset\s*=\s*)(["'])([^"']+)\2/gi, (_m, pre, q, val) => {
    const rewritten = val
      .split(",")
      .map((part) => {
        const t = part.trim().split(/\s+/);
        if (!t[0]) return part;
        t[0] = px(t[0]);
        return t.join(" ");
      })
      .join(", ");
    return `${pre}${q}${rewritten}${q}`;
  });

  // CSS url() inside <style>
  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_m, attrs, css) => {
    return `<style${attrs}>${rewriteCss(css, base.toString(), origin)}</style>`;
  });

  return out;
}

function rewriteCss(css, baseUrl, origin) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, q, u) => {
    if (/^(data:|blob:)/i.test(u)) return `url(${q}${u}${q})`;
    try {
      const abs = new URL(u, baseUrl).toString();
      return `url(${q}${origin}/p/${encodeURIComponent(abs)}${q})`;
    } catch {
      return `url(${q}${u}${q})`;
    }
  });
}

async function handle(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const origin = new URL(req.url).origin;
  const target = decodeTarget(req);

  if (!target) {
    // Landing page = mini search box.
    return new Response(landing(origin), {
      headers: { "content-type": "text/html; charset=utf-8", ...CORS },
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("Bad target", { status: 400, headers: CORS });
  }

  // Build upstream request.
  const headers = new Headers();
  for (const [k, v] of req.headers) {
    if (/^(host|origin|referer|cookie|cf-|x-forwarded-|x-real-ip|content-length)/i.test(k)) continue;
    headers.set(k, v);
  }
  headers.set("user-agent", UA);
  headers.set("referer", targetUrl.origin + "/");
  headers.set("origin", targetUrl.origin);
  // Per-target cookie jar passed by the client (sw.js / index.html).
  const jar = req.headers.get("x-mb-cookie");
  if (jar) headers.set("cookie", jar);

  const init = {
    method: req.method,
    headers,
    redirect: "manual",
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
  };

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString(), init);
  } catch (e) {
    return new Response("Upstream fetch failed: " + e.message, { status: 502, headers: CORS });
  }

  // Manual redirect → rewrite Location through the proxy.
  if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("location")) {
    const loc = new URL(upstream.headers.get("location"), targetUrl).toString();
    const h = stripFraming(upstream.headers);
    h.set("location", proxify(loc, origin));
    return new Response(null, { status: upstream.status, headers: h });
  }

  const respHeaders = stripFraming(upstream.headers);
  // Expose Set-Cookie back to client so it can update its jar.
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) respHeaders.set("x-mb-set-cookie", setCookie);

  const ct = (upstream.headers.get("content-type") || "").toLowerCase();

  if (ct.includes("text/html")) {
    const text = await upstream.text();
    const out = rewriteHtml(text, targetUrl.toString(), origin);
    respHeaders.set("content-type", "text/html; charset=utf-8");
    respHeaders.delete("content-length");
    respHeaders.delete("content-encoding");
    return new Response(out, { status: upstream.status, headers: respHeaders });
  }

  if (ct.includes("text/css")) {
    const text = await upstream.text();
    respHeaders.delete("content-length");
    respHeaders.delete("content-encoding");
    return new Response(rewriteCss(text, targetUrl.toString(), origin), {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  // Pass binary / JS / fonts / etc. through unchanged.
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

function landing(origin) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Maths Browse</title>
<style>body{font:16px system-ui;background:#0a0a1e;color:#fff;display:grid;place-items:center;height:100vh;margin:0}
form{display:flex;gap:8px}input{padding:12px 16px;width:420px;border-radius:10px;border:1px solid #333;background:#111;color:#fff}
button{padding:12px 18px;border:0;border-radius:10px;background:#5b8cff;color:#fff;cursor:pointer}</style></head>
<body><form onsubmit="event.preventDefault();var u=this.q.value;if(!/^https?:/i.test(u))u='https://duckduckgo.com/?q='+encodeURIComponent(u);location.href='${origin}/p/'+encodeURIComponent(u)">
<input name="q" placeholder="Search or enter URL" autofocus><button>Go</button></form></body></html>`;
}

export default {
  fetch: (req) => handle(req),
};
