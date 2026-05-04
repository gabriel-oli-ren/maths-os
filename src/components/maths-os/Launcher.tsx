import { useEffect, useMemo, useRef, useState } from "react";
import mathsLogo from "@/assets/maths.png";

export type LaunchItem = {
  id: string;
  name: string;
  icon: string;
  kind: "app" | "game" | "system" | "friend";
  hint?: string;
  run: () => void;
};

export function Launcher({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: LaunchItem[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s
      ? items.slice(0, 40)
      : items.filter((i) => i.name.toLowerCase().includes(s) || i.kind.includes(s)).slice(0, 40);
    return list;
  }, [items, q]);

  if (!open) return null;

  const fire = (i: LaunchItem) => {
    i.run();
    onClose();
  };

  return (
    <div className="mos-launcher-overlay" onClick={onClose}>
      <div className="mos-launcher-box" onClick={(e) => e.stopPropagation()}>
        <div className="mos-launcher-search">
          <img src={mathsLogo} alt="Maths" style={{ width: 24, height: 24 }} />
          <input
            ref={inputRef}
            placeholder="Search apps, games, friends…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") setIdx((i) => Math.min(filtered.length - 1, i + 1));
              else if (e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
              else if (e.key === "Enter" && filtered[idx]) fire(filtered[idx]);
            }}
          />
          <span className="mos-launcher-kbd">esc</span>
        </div>
        <div className="mos-launcher-results">
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "var(--mos-text-faint)" }}>No results</div>
          )}
          {filtered.map((i, n) => (
            <div
              key={i.id}
              className={`mos-launcher-row ${n === idx ? "active" : ""}`}
              onMouseMove={() => { if (idx !== n) setIdx(n); }}
              onMouseDown={(e) => { e.preventDefault(); fire(i); }}
            >
              <span style={{ fontSize: "1.4em" }}>{i.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{i.name}</span>
                {i.hint && <span style={{ color: "var(--mos-text-faint)", marginLeft: 8, fontSize: "0.78em" }}>{i.hint}</span>}
              </span>
              <span className="mos-launcher-kind">{i.kind}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
