import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/maths-os/auth";
import { GAMES, ICON_OPTIONS, SYSTEM_APPS, type CustomApp, type Game, type PinnedItem } from "@/lib/maths-os/data";
import { ToastContainer, toast } from "@/lib/maths-os/toast";
import { setPlaying, usePresenceHeartbeat } from "@/lib/maths-os/presence";
import { MessagesApp } from "./MessagesApp";
import { FriendsApp } from "./FriendsApp";

type ViewName = "home" | "apps" | "games" | "browser" | "messages" | "friends";

const PINS_KEY = "mos_pinned";
const CUSTOM_KEY = "mos_custom_apps";

function load<T>(key: string, def: T): T {
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
}
function save<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

export function MathsOS() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<ViewName>("home");
  const [pinned, setPinned] = useState<PinnedItem[]>(() => load(PINS_KEY, []));
  const [customApps, setCustomApps] = useState<CustomApp[]>(() => load(CUSTOM_KEY, []));
  const [game, setGame] = useState<Game | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [appSearch, setAppSearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");

  usePresenceHeartbeat();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    save(PINS_KEY, pinned);
  }, [pinned]);
  useEffect(() => {
    save(CUSTOM_KEY, customApps);
  }, [customApps]);

  const isPinned = (id: string) => pinned.some((p) => p.id === id);
  const togglePin = (item: PinnedItem) => {
    setPinned((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        toast("Unpinned", "info");
        return prev.filter((p) => p.id !== item.id);
      }
      toast(`📌 Pinned: ${item.name}`, "success");
      return [...prev, item];
    });
  };

  const launchPin = (item: PinnedItem) => {
    if (item.type === "game") {
      const g = GAMES.find((x) => x.id === item.id);
      if (g) openGame(g);
    } else if (item.type === "app") {
      const sys = SYSTEM_APPS.find((x) => x.id === item.id);
      if (sys?.view) setView(sys.view);
      else if (sys?.url) window.open(sys.url, "_blank", "noopener");
      else if (item.url) window.open(item.url, "_blank", "noopener");
    } else if (item.url) {
      window.open(item.url, "_blank", "noopener");
    }
  };

  const openGame = (g: Game) => {
    setGame(g);
    setPlaying({ name: g.name, url: g.url });
  };
  const closeGame = () => {
    setGame(null);
    setPlaying(null);
  };

  const filteredSystem = useMemo(
    () => SYSTEM_APPS.filter((a) => a.name.toLowerCase().includes(appSearch.toLowerCase())),
    [appSearch],
  );
  const filteredCustom = useMemo(
    () => customApps.filter((a) => a.name.toLowerCase().includes(appSearch.toLowerCase())),
    [appSearch, customApps],
  );
  const filteredGames = useMemo(
    () => GAMES.filter((g) => g.name.toLowerCase().includes(gameSearch.toLowerCase())),
    [gameSearch],
  );

  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDate = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const h = now.getHours();
  const greet = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";

  return (
    <div className="mos-root">
      <div className="mos-desktop" />

      {/* TOP BAR */}
      <div className="mos-topbar">
        <div className="mos-topbar-left">
          <span style={{ fontSize: "1.05em" }}>🍎</span>
          <span>Maths OS</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{user?.display_name || user?.username}</span>
        </div>
        <div className="mos-topbar-center">{shortDate}</div>
        <div className="mos-topbar-right">
          <span className="mos-presence-pill" title="Online">
            <span className="mos-presence-dot" /> Online
          </span>
          <span style={{ opacity: 0.5, cursor: "pointer" }} onClick={logout} title="Sign out">
            ⏻
          </span>
          <span className="mos-topbar-time">{time}</span>
        </div>
      </div>

      {/* HOME */}
      <div className={`mos-view mos-home ${view === "home" ? "active" : ""}`}>
        <div className="mos-greeting">{greet}, {user?.display_name || user?.username}</div>
        <div className="mos-clock">
          {time}
          <span className="mos-clock-s">{seconds}</span>
        </div>
        <div className="mos-date">{dateStr}</div>
        <div className="mos-pinned-label">Pinned</div>
        <div className="mos-pinned-row">
          {pinned.length === 0 ? (
            <div className="mos-empty-pins">No pins yet — pin apps & games from the launcher</div>
          ) : (
            pinned.map((item) => (
              <div key={item.id} className="mos-chip" onClick={() => launchPin(item)}>
                <span style={{ fontSize: "1.2em" }}>{item.icon}</span>
                <span>{item.name}</span>
                <button
                  className="mos-chip-unpin"
                  title="Unpin"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned((prev) => prev.filter((p) => p.id !== item.id));
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* APPS */}
      <div className={`mos-view mos-content-view ${view === "apps" ? "active" : ""}`}>
        <div className="mos-view-header">
          <span className="mos-view-title">⚡ Apps</span>
          <input
            className="mos-search"
            placeholder="Search apps..."
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
          />
        </div>
        <p className="mos-section-label">System</p>
        <div className="mos-app-grid">
          {filteredSystem.map((app) => {
            const pinnedNow = isPinned(app.id);
            return (
              <div
                key={app.id}
                className={`mos-app-tile ${pinnedNow ? "pinned" : ""}`}
                onClick={() => {
                  if (app.view) setView(app.view);
                  else if (app.url) window.open(app.url, "_blank", "noopener");
                }}
              >
                <button
                  className={`mos-pin-btn ${pinnedNow ? "is-pinned" : ""}`}
                  title={pinnedNow ? "Unpin" : "Pin"}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin({ id: app.id, type: "app", name: app.name, icon: app.icon, url: app.url });
                  }}
                >
                  {pinnedNow ? "📌" : "📍"}
                </button>
                <span className="mos-app-icon">{app.icon}</span>
                <span className="mos-app-name">{app.name}</span>
              </div>
            );
          })}
        </div>

        <p className="mos-section-label">Your Apps</p>
        <div className="mos-app-grid">
          {filteredCustom.length === 0 ? (
            <div className="mos-empty">
              <span className="mos-empty-icon">📦</span>
              <span>Add your own apps below</span>
            </div>
          ) : (
            filteredCustom.map((app) => {
              const pinnedNow = isPinned(app.id);
              return (
                <div
                  key={app.id}
                  className={`mos-app-tile ${pinnedNow ? "pinned" : ""}`}
                  onClick={() => window.open(app.url, "_blank", "noopener")}
                >
                  <button
                    className={`mos-pin-btn ${pinnedNow ? "is-pinned" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin({ id: app.id, type: "custom", name: app.name, icon: app.icon, url: app.url });
                    }}
                  >
                    {pinnedNow ? "📌" : "📍"}
                  </button>
                  <span className="mos-app-icon">{app.icon}</span>
                  <span className="mos-app-name">{app.name}</span>
                </div>
              );
            })
          )}
        </div>
        <button
          className="mos-btn secondary"
          style={{ width: "auto", padding: "10px 22px", borderRadius: 50, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
          onClick={() => setAddOpen(true)}
        >
          ➕ Add Custom App
        </button>
      </div>

      {/* GAMES */}
      <div className={`mos-view mos-content-view ${view === "games" ? "active" : ""}`}>
        <div className="mos-view-header">
          <span className="mos-view-title">🎮 Games</span>
          <input
            className="mos-search"
            placeholder="Search games..."
            value={gameSearch}
            onChange={(e) => setGameSearch(e.target.value)}
          />
        </div>
        <div className="mos-game-grid">
          {filteredGames.map((g) => {
            const pinnedNow = isPinned(g.id);
            return (
              <div key={g.id} className="mos-game-card" onClick={() => openGame(g)}>
                <div
                  className="mos-game-thumb"
                  style={{ background: `linear-gradient(135deg, ${g.grad[0]}, ${g.grad[1]})` }}
                >
                  {g.icon}
                </div>
                <div className="mos-game-name">{g.name}</div>
                <button
                  className={`mos-game-pin ${pinnedNow ? "is-pinned" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin({ id: g.id, type: "game", name: g.name, icon: g.icon, url: g.url });
                  }}
                >
                  {pinnedNow ? "📌" : "📍"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* BROWSER */}
      <div className={`mos-view mos-content-view ${view === "browser" ? "active" : ""}`} style={{ padding: 0 }}>
        <div style={{ paddingTop: "var(--mos-topbar-h)", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "30px 32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "3em" }}>🌐</div>
            <h2 style={{ fontSize: "1.4em", margin: "10px 0" }}>Maths OS Browser</h2>
            <p style={{ color: "var(--mos-text-dim)", maxWidth: 520, margin: "0 auto 20px" }}>
              Most sites block embedding via X-Frame-Options. Use the quick links below or open in a new tab.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {["https://example.com", "https://en.wikipedia.org", "https://news.ycombinator.com", "https://duckduckgo.com"].map(
                (u) => (
                  <button key={u} className="mos-btn secondary" style={{ flex: "0 0 auto", padding: "8px 18px", borderRadius: 50 }} onClick={() => window.open(u, "_blank", "noopener")}>
                    {new URL(u).hostname}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className={`mos-view mos-content-view ${view === "messages" ? "active" : ""}`}>
        <div className="mos-view-header">
          <span className="mos-view-title">💬 Messages</span>
        </div>
        <div style={{ flex: 1, width: "100%", height: "calc(100vh - var(--mos-topbar-h) - var(--mos-dock-h) - 100px)" }}>
          <MessagesApp />
        </div>
      </div>

      {/* FRIENDS */}
      <div className={`mos-view mos-content-view ${view === "friends" ? "active" : ""}`}>
        <div className="mos-view-header">
          <span className="mos-view-title">👥 Friends</span>
        </div>
        <FriendsApp onMessage={() => setView("messages")} />
      </div>

      {/* DOCK */}
      <div className="mos-dock">
        <DockBtn icon="🏠" label="Home" tip="Home" active={view === "home"} onClick={() => setView("home")} />
        <DockBtn icon="⚡" label="Apps" tip="Apps" active={view === "apps"} onClick={() => setView("apps")} />
        <DockBtn icon="🎮" label="Games" tip="Games" active={view === "games"} onClick={() => setView("games")} />
        <DockBtn icon="💬" label="Chat" tip="Messages" active={view === "messages"} onClick={() => setView("messages")} />
        <DockBtn icon="👥" label="Friends" tip="Friends" active={view === "friends"} onClick={() => setView("friends")} />
        <DockBtn icon="🌐" label="Web" tip="Browser" active={view === "browser"} onClick={() => setView("browser")} />
        <div className="mos-dock-sep" />
        <div className="mos-dock-pinned">
          {pinned.slice(0, 8).map((item) => (
            <button key={item.id} className="mos-dock-btn" style={{ width: 44, height: 44 }} onClick={() => launchPin(item)}>
              <span className="mos-dock-icon" style={{ fontSize: "1.3em" }}>{item.icon}</span>
              <span className="mos-tooltip">{item.name}</span>
            </button>
          ))}
        </div>
        <div className="mos-dock-sep" />
        <DockBtn icon="➕" label="Add" tip="Add App" onClick={() => setAddOpen(true)} />
      </div>

      {/* GAME LAUNCHER */}
      {game && (
        <div className="mos-launcher">
          <div className="mos-launcher-bar">
            <div className="mos-mac-lights">
              <button className="mos-mac-light close" onClick={closeGame} title="Close" />
              <button className="mos-mac-light min" onClick={closeGame} title="Minimize" />
              <button className="mos-mac-light max" onClick={() => document.documentElement.requestFullscreen?.()} title="Fullscreen" />
            </div>
            <span className="mos-launcher-title">{game.name}</span>
          </div>
          <iframe
            className="mos-launcher-iframe"
            src={game.url}
            title={game.name}
            allow="fullscreen; autoplay; gamepad"
            allowFullScreen
          />
        </div>
      )}

      {/* ADD APP MODAL */}
      {addOpen && (
        <AddAppModal
          onClose={() => setAddOpen(false)}
          onSave={(app) => {
            setCustomApps((prev) => [...prev, app]);
            toast("App added", "success");
            setAddOpen(false);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}

function DockBtn({ icon, label, tip, active, onClick }: { icon: string; label: string; tip: string; active?: boolean; onClick: () => void }) {
  return (
    <button className={`mos-dock-btn ${active ? "active" : ""}`} onClick={onClick}>
      <span className="mos-dock-icon">{icon}</span>
      <span className="mos-dock-label">{label}</span>
      <span className="mos-tooltip">{tip}</span>
    </button>
  );
}

function AddAppModal({ onClose, onSave }: { onClose: () => void; onSave: (app: CustomApp) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("🌐");

  const submit = () => {
    if (!name.trim() || !url.trim()) {
      toast("Name and URL required", "warn");
      return;
    }
    let final = url.trim();
    if (!/^https?:\/\//.test(final)) final = "https://" + final;
    onSave({ id: "custom-" + Date.now(), name: name.trim(), url: final, icon });
  };

  return (
    <div className="mos-modal-overlay" onClick={onClose}>
      <div className="mos-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="mos-modal-title">➕ Add Custom App</div>
        <div className="mos-modal-sub">Add a link or web app to your launcher.</div>
        <input className="mos-input" placeholder="App name (e.g. YouTube)" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mos-input" placeholder="URL (e.g. https://youtube.com)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div style={{ fontSize: "0.78em", color: "var(--mos-text-faint)", marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
          Icon
        </div>
        <div className="mos-icon-picker">
          {ICON_OPTIONS.map((i) => (
            <button key={i} className={`mos-icon-opt ${icon === i ? "selected" : ""}`} onClick={() => setIcon(i)}>
              {i}
            </button>
          ))}
        </div>
        <div className="mos-row">
          <button className="mos-btn secondary" onClick={onClose}>Cancel</button>
          <button className="mos-btn primary" onClick={submit}>Save App</button>
        </div>
      </div>
    </div>
  );
}
