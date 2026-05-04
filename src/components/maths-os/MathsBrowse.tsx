import { useEffect, useRef, useState } from "react";
import mathsLogo from "@/assets/maths.png";
import {
  CORS_ANYWHERE_ACTIVATE,
  isCorsAnywhereActive,
  markCorsAnywhereActive,
  proxify,
  useProxyHealth,
} from "@/lib/maths-os/proxy";

type Mode = "direct" | "proxy" | "fallback";

function normalize(input: string): string {
  let v = input.trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) {
    if (/\s/.test(v) || !/\./.test(v)) {
      return "https://duckduckgo.com/?q=" + encodeURIComponent(v);
    }
    v = "https://" + v;
  }
  return v;
}

function buildSrc(url: string, mode: Mode): string {
  if (!url) return "about:blank";
  if (mode === "direct") return url;
  if (mode === "fallback") return proxify(url, "cors-anywhere");
  return proxify(url, "primary");
}

export function MathsBrowse({ initialUrl }: { initialUrl?: string }) {
  const health = useProxyHealth();
  const start = initialUrl || "https://duckduckgo.com/?q=maths+os";
  const [url, setUrl] = useState(start);
  const [bar, setBar] = useState(start);
  const [history, setHistory] = useState<string[]>([start]);
  const [hIdx, setHIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("proxy");
  const [showGate, setShowGate] = useState(false);
  const [caActive, setCaActive] = useState(isCorsAnywhereActive());
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const go = (raw: string, push = true) => {
    const u = normalize(raw);
    if (!u) return;
    setUrl(u);
    setBar(u);
    setLoadError(false);
    if (push) {
      const next = history.slice(0, hIdx + 1).concat(u);
      setHistory(next);
      setHIdx(next.length - 1);
    }
  };

  const back = () => {
    if (hIdx > 0) {
      const i = hIdx - 1;
      setHIdx(i);
      setUrl(history[i]);
      setBar(history[i]);
    }
  };
  const fwd = () => {
    if (hIdx < history.length - 1) {
      const i = hIdx + 1;
      setHIdx(i);
      setUrl(history[i]);
      setBar(history[i]);
    }
  };
  const reload = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  const setModeSafe = (m: Mode) => {
    if (m === "fallback" && !caActive) {
      setShowGate(true);
      return;
    }
    setMode(m);
  };

  const src = buildSrc(url, mode);

  useEffect(() => setBar(url), [url]);

  // Open in about:blank with iframe (avoids X-Frame-Options on top-level open).
  const openAboutBlank = () => {
    const target = src;
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(
      `<!DOCTYPE html><html><head><title>about:blank</title><style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${target.replace(/"/g, "&quot;")}" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen></iframe></body></html>`
    );
    w.document.close();
  };

  return (
    <div className="mos-browse">
      <div className="mos-browse-bar">
        <button className="mos-browse-nav" onClick={back} disabled={hIdx === 0} title="Back">←</button>
        <button className="mos-browse-nav" onClick={fwd} disabled={hIdx >= history.length - 1} title="Forward">→</button>
        <button className="mos-browse-nav" onClick={reload} title="Reload">⟳</button>
        <img src={mathsLogo} alt="Maths Browse" style={{ width: 22, height: 22, marginLeft: 4 }} />
        <input
          className="mos-browse-url"
          value={bar}
          onChange={(e) => setBar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(bar);
          }}
          placeholder="Search Maths Browse or enter address"
          spellCheck={false}
        />
        <select
          className="mos-browse-pill"
          value={mode}
          onChange={(e) => setModeSafe(e.target.value as Mode)}
          title="Browsing mode"
          style={{ cursor: "pointer" }}
        >
          <option value="direct">Direct</option>
          <option value="proxy">Maths Proxy</option>
          <option value="fallback">Fallback</option>
        </select>
        <span
          className={`mos-browse-pill ${health}`}
          title={`Proxy: ${health}`}
        >
          {health === "online" ? "● Proxy" : health === "checking" ? "… Proxy" : "✕ Proxy"}
        </span>
        <button className="mos-browse-nav" onClick={openAboutBlank} title="Open in about:blank">↗</button>
      </div>

      <div className="mos-browse-frame-wrap">
        <iframe
          ref={iframeRef}
          key={src + mode}
          className="mos-browse-frame"
          src={src}
          title="Maths Browse"
          allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write"
          allowFullScreen
          onError={() => setLoadError(true)}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
        />
        {loadError && (
          <div className="mos-browse-gate">
            <div className="mos-browse-gate-card">
              <p>This site refused to load. Try a different mode:</p>
              <div className="mos-row" style={{ gap: 8 }}>
                <button className="mos-btn" onClick={() => { setMode("direct"); setLoadError(false); }}>Direct</button>
                <button className="mos-btn" onClick={() => { setMode("proxy"); setLoadError(false); }}>Maths Proxy</button>
                <button className="mos-btn" onClick={() => { setModeSafe("fallback"); setLoadError(false); }}>Fallback</button>
                <button className="mos-btn primary" onClick={openAboutBlank}>Open in about:blank</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showGate && !caActive && (
        <div className="mos-browse-gate">
          <div className="mos-browse-gate-card">
            <img src={mathsLogo} alt="Maths" style={{ width: 60, height: 60 }} />
            <h2 style={{ margin: "10px 0 4px" }}>Activate fallback proxy</h2>
            <p style={{ color: "var(--mos-text-dim)", fontSize: "0.85em", maxWidth: 480, textAlign: "center" }}>
              Click <b>Request temporary access to the demo server</b> in the page below, then come back and press <b>Continue</b>.
            </p>
            <iframe
              src={CORS_ANYWHERE_ACTIVATE}
              title="cors-anywhere activation"
              style={{ width: "100%", height: 280, border: "1px solid var(--mos-glass-border)", borderRadius: 12, marginTop: 14, background: "#fff" }}
            />
            <div className="mos-row" style={{ marginTop: 14, width: "100%" }}>
              <button className="mos-btn secondary" onClick={() => setShowGate(false)}>Cancel</button>
              <button
                className="mos-btn primary"
                onClick={() => {
                  markCorsAnywhereActive(true);
                  setCaActive(true);
                  setMode("fallback");
                  setShowGate(false);
                }}
              >Continue</button>
            </div>
          </div>
        </div>
      )}

      <div className="mos-browse-footer">
        <span style={{ color: "var(--mos-text-faint)", fontSize: "0.72em" }}>
          Mode: <b>{mode}</b> · Tip: if a site won't load, try Direct or Open in about:blank.
        </span>
      </div>
    </div>
  );
}
