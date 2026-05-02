import { useEffect, useRef, useState } from "react";
import mathsLogo from "@/assets/maths.png";
import {
  CORS_ANYWHERE_ACTIVATE,
  isCorsAnywhereActive,
  markCorsAnywhereActive,
  proxify,
  useProxyHealth,
} from "@/lib/maths-os/proxy";

function normalize(input: string): string {
  let v = input.trim();
  if (!v) return "";
  // If it looks like a search (no dot, has spaces), use DDG.
  if (!/^https?:\/\//i.test(v)) {
    if (/\s/.test(v) || !/\./.test(v)) {
      return "https://duckduckgo.com/?q=" + encodeURIComponent(v);
    }
    v = "https://" + v;
  }
  return v;
}

export function MathsBrowse({ initialUrl }: { initialUrl?: string }) {
  const health = useProxyHealth();
  const [url, setUrl] = useState(initialUrl || "https://example.com");
  const [bar, setBar] = useState(initialUrl || "https://example.com");
  const [history, setHistory] = useState<string[]>([initialUrl || "https://example.com"]);
  const [hIdx, setHIdx] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [caActive, setCaActive] = useState(isCorsAnywhereActive());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const go = (raw: string, push = true) => {
    const u = normalize(raw);
    if (!u) return;
    setUrl(u);
    setBar(u);
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

  const src = showFallback && caActive ? proxify(url, "cors-anywhere") : proxify(url, "primary");

  useEffect(() => setBar(url), [url]);

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
        <span
          className={`mos-browse-pill ${health}`}
          title={`Maths Browse proxy: ${health}`}
        >
          {health === "online" ? "● Proxy" : health === "checking" ? "… Proxy" : "✕ Proxy"}
        </span>
      </div>

      <div className="mos-browse-frame-wrap">
        <iframe
          ref={iframeRef}
          key={src}
          className="mos-browse-frame"
          src={src}
          title="Maths Browse"
          allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write"
          allowFullScreen
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
        />
      </div>

      {/* Fallback gate: cors-anywhere activation */}
      {showFallback && !caActive && (
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
              <button className="mos-btn secondary" onClick={() => setShowFallback(false)}>
                Cancel
              </button>
              <button
                className="mos-btn primary"
                onClick={() => {
                  markCorsAnywhereActive(true);
                  setCaActive(true);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer with fallback toggle */}
      <div className="mos-browse-footer">
        <span style={{ color: "var(--mos-text-faint)", fontSize: "0.72em" }}>
          {showFallback && caActive ? "Using cors-anywhere fallback" : "Using Maths Browse proxy"}
        </span>
        <button
          className="mos-browse-fallback-btn"
          onClick={() => {
            if (!caActive) setShowFallback(true);
            else setShowFallback((s) => !s);
          }}
        >
          {showFallback && caActive ? "Switch to primary" : caActive ? "Use fallback" : "Activate fallback"}
        </button>
      </div>
    </div>
  );
}
