import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/maths-os/auth";
import { isCorsAnywhereActive, markCorsAnywhereActive, useProxyHealth } from "@/lib/maths-os/proxy";
import { toast } from "@/lib/maths-os/toast";

const WALLPAPERS = [
  { id: "aurora", name: "Aurora", grad: "linear-gradient(135deg,#0d0d2e 0%,#1a0a3e 35%,#0a1a40 65%,#0d0d2e 100%)" },
  { id: "sunset", name: "Sunset", grad: "linear-gradient(135deg,#2d0a3e 0%,#5a0a3e 35%,#5a200a 100%)" },
  { id: "deep", name: "Deep Sea", grad: "linear-gradient(135deg,#000814 0%,#001d3d 50%,#003566 100%)" },
  { id: "forest", name: "Forest", grad: "linear-gradient(135deg,#0a200a 0%,#0a3a1a 50%,#0a2a3a 100%)" },
];

export function SettingsApp({
  wallpaper,
  onWallpaper,
  onSignOut,
}: {
  wallpaper: string;
  onWallpaper: (id: string) => void;
  onSignOut: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [busy, setBusy] = useState(false);
  const health = useProxyHealth();
  const [caActive, setCaActive] = useState(isCorsAnywhereActive());

  const saveName = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("users").update({ display_name: name.trim() }).eq("id", user.id);
    setBusy(false);
    if (error) toast(error.message, "warn");
    else toast("Display name updated", "success");
  };

  return (
    <div className="mos-settings">
      <h2 style={{ marginBottom: 6 }}>Settings</h2>
      <p style={{ color: "var(--mos-text-dim)", fontSize: "0.85em", marginBottom: 24 }}>
        Personalise your Maths OS.
      </p>

      <section className="mos-settings-section">
        <h3>Account</h3>
        <label className="mos-settings-label">Username</label>
        <div style={{ color: "var(--mos-text-dim)", marginBottom: 12 }}>@{user?.username}</div>
        <label className="mos-settings-label">Friend code</label>
        <div style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: 2, marginBottom: 12 }}>{user?.friend_code}</div>
        <label className="mos-settings-label">Display name</label>
        <div className="mos-row" style={{ alignItems: "center" }}>
          <input className="mos-input" style={{ marginBottom: 0 }} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="mos-btn primary" style={{ flex: "0 0 auto", padding: "10px 18px" }} onClick={saveName} disabled={busy}>
            Save
          </button>
        </div>
      </section>

      <section className="mos-settings-section">
        <h3>Wallpaper</h3>
        <div className="mos-wallpaper-grid">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              className={`mos-wallpaper-tile ${wallpaper === w.id ? "active" : ""}`}
              style={{ background: w.grad }}
              onClick={() => onWallpaper(w.id)}
            >
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mos-settings-section">
        <h3>Maths Browse Proxy</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span className={`mos-presence-dot ${health === "online" ? "" : health === "checking" ? "away" : "offline"}`} />
          <span style={{ fontWeight: 700 }}>{health === "online" ? "Online" : health === "checking" ? "Checking…" : "Offline"}</span>
          <span style={{ color: "var(--mos-text-dim)", fontSize: "0.85em" }}>
            (in-project Worker proxy at /api/public/proxy)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700 }}>Cors-anywhere fallback:</span>
          <span style={{ color: caActive ? "var(--mos-success)" : "var(--mos-text-dim)" }}>
            {caActive ? "Activated" : "Not activated"}
          </span>
          <button
            className="mos-btn secondary"
            style={{ flex: "0 0 auto", padding: "6px 14px" }}
            onClick={() => {
              markCorsAnywhereActive(!caActive);
              setCaActive(!caActive);
            }}
          >
            {caActive ? "Deactivate" : "Mark activated"}
          </button>
        </div>
      </section>

      <section className="mos-settings-section">
        <h3>Sign out</h3>
        <button className="mos-btn secondary" style={{ flex: "0 0 auto", padding: "10px 22px" }} onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </div>
  );
}
