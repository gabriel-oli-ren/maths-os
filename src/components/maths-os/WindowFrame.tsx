import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWindows, type WinState } from "@/lib/maths-os/windows";

const TOPBAR = 38;
const DOCK = 72;

export function WindowFrame({ win, children }: { win: WinState; children?: ReactNode }) {
  const { close, focus, minimize, toggleMax, move, resize } = useWindows();
  const [drag, setDrag] = useState<{ ox: number; oy: number } | null>(null);
  const [rs, setRs] = useState<{ sw: number; sh: number; sx: number; sy: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drag && !rs) return;
    const onMove = (e: MouseEvent) => {
      if (drag) {
        const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - drag.ox));
        const y = Math.max(TOPBAR, Math.min(window.innerHeight - DOCK - 40, e.clientY - drag.oy));
        move(win.id, x, y);
      } else if (rs) {
        const w = Math.max(360, rs.sw + (e.clientX - rs.sx));
        const h = Math.max(240, rs.sh + (e.clientY - rs.sy));
        resize(win.id, w, h);
      }
    };
    const onUp = () => {
      setDrag(null);
      setRs(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, rs, move, resize, win.id]);

  if (win.minimized) return null;

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: TOPBAR,
        width: "100vw",
        height: `calc(100vh - ${TOPBAR + DOCK}px)`,
        zIndex: win.z,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      };

  return (
    <div
      ref={frameRef}
      className={`mos-window ${win.maximized ? "is-max" : ""}`}
      style={style}
      onMouseDown={() => focus(win.id)}
    >
      <div
        className="mos-window-bar"
        onMouseDown={(e) => {
          if (win.maximized) return;
          const rect = frameRef.current?.getBoundingClientRect();
          if (!rect) return;
          setDrag({ ox: e.clientX - rect.left, oy: e.clientY - rect.top });
        }}
        onDoubleClick={() => toggleMax(win.id)}
      >
        <div className="mos-mac-lights">
          <button
            className="mos-mac-light close"
            onClick={(e) => {
              e.stopPropagation();
              close(win.id);
            }}
            title="Close"
          />
          <button
            className="mos-mac-light min"
            onClick={(e) => {
              e.stopPropagation();
              minimize(win.id);
            }}
            title="Minimize"
          />
          <button
            className="mos-mac-light max"
            onClick={(e) => {
              e.stopPropagation();
              const el = frameRef.current;
              if (!el) return;
              if (document.fullscreenElement) {
                document.exitFullscreen?.();
              } else {
                // Make sure it's maximized inside the OS too so it looks right inside fullscreen.
                if (!win.maximized) toggleMax(win.id);
                el.requestFullscreen?.().catch(() => {});
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              toggleMax(win.id);
            }}
            title="Fullscreen (double-click: maximize)"
          />
        </div>
        <span className="mos-window-title">
          <span style={{ marginRight: 6 }}>{win.icon}</span>
          {win.title}
        </span>
        {win.rawUrl && (
          <button
            className="mos-window-newtab"
            onClick={(e) => {
              e.stopPropagation();
              const target = win.src || win.rawUrl!;
              const w = window.open("about:blank", "_blank");
              if (!w) return;
              w.document.open();
              w.document.write(`<!DOCTYPE html><html><head><title>about:blank</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${target.replace(/"/g, "&quot;")}" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen></iframe></body></html>`);
              w.document.close();
            }}
            title="Open in about:blank"
          >
            ↗
          </button>
        )}
      </div>

      <div className="mos-window-body">
        {win.kind === "iframe" && win.src ? (
          <iframe
            className="mos-window-iframe"
            src={win.src}
            title={win.title}
            allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write"
            allowFullScreen
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
          />
        ) : (
          children
        )}
      </div>

      {!win.maximized && (
        <div
          className="mos-window-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setRs({ sw: win.w, sh: win.h, sx: e.clientX, sy: e.clientY });
          }}
        />
      )}
    </div>
  );
}
