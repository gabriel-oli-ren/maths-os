import { useEffect, useMemo, useState } from "react";
import mathsLogo from "@/assets/maths.png";
import { useAuth } from "@/lib/maths-os/auth";
import {
  GAMES,
  ICON_OPTIONS,
  SYSTEM_APPS,
  WALLPAPERS,
  faviconFor,
  type BuiltinAppId,
  type CustomApp,
  type Game,
  type PinnedItem,
} from "@/lib/maths-os/data";
import { ToastContainer, toast } from "@/lib/maths-os/toast";
import { setPlaying, usePresenceHeartbeat } from "@/lib/maths-os/presence";
import { proxify } from "@/lib/maths-os/proxy";
import { useWindows, newWinId } from "@/lib/maths-os/windows";
import { WindowFrame } from "./WindowFrame";
import { MessagesApp } from "./MessagesApp";
import { FriendsApp } from "./FriendsApp";
import { MathsBrowse } from "./MathsBrowse";
import { CalculatorApp } from "./apps/CalculatorApp";
import { NotesApp } from "./apps/NotesApp";
import { SettingsApp } from "./apps/SettingsApp";
import { Launcher, type LaunchItem } from "./Launcher";

const PINS_KEY = "mos_pinned";
const CUSTOM_KEY = "mos_custom_apps";
const WALL_KEY = "mos_wallpaper";

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
  const { wins, open, focus, close, restore, minimize } = useWindows();
  const [pinned, setPinned] = useState<PinnedItem[]>(() => load(PINS_KEY, []));
  const [customApps, setCustomApps] = useState<CustomApp[]>(() => load(CUSTOM_KEY, []));
  const [wallpaper, setWallpaper] = useState<string>(() => (typeof window === "undefined" ? "aurora" : localStorage.getItem(WALL_KEY) || "aurora"));
  const [addOpen, setAddOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showAllApps, setShowAllApps] = useState<false | "apps" | "games">(false);

  usePresenceHeartbeat();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => save(PINS_KEY, pinned), [pinned]);
  useEffect(() => save(CUSTOM_KEY, customApps), [customApps]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(WALL_KEY, wallpaper);
  }, [wallpaper]);

  // Cmd/Ctrl+K opens launcher
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLauncherOpen((o) => !o);
      } else if (e.key === "Escape") {
        setLauncherOpen(false);
        setShowAllApps(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // ============ Window opening helpers ============

  const openBuiltin = (id: BuiltinAppId) => {
    // Re-focus existing window of the same kind if open
    const existing = wins.find((w) => w.id.startsWith(`builtin-${id}`));
    if (existing) {
      restore(existing.id);
      focus(existing.id);
      return;
    }
    const winId = `builtin-${id}-${Date.now().toString(36)}`;
    if (id === "browse") {
      open({ id: winId, kind: "react", title: "Maths Browse", icon: "🌐", node: <MathsBrowse /> });
    } else if (id === "messages") {
      open({ id: winId, kind: "react", title: "Messages", icon: "💬", node: <MessagesApp />, w: 880, h: 600 });
    } else if (id === "friends") {
      open({ id: winId, kind: "react", title: "Friends", icon: "👥", node: <FriendsAppWindow onMessage={() => openBuiltin("messages")} />, w: 720, h: 580 });
    } else if (id === "calculator") {
      open({ id: winId, kind: "react", title: "Calculator", icon: "🧮", node: <CalculatorApp />, w: 360, h: 520 });
    } else if (id === "notes") {
      open({ id: winId, kind: "react", title: "Notes", icon: "📝", node: <NotesApp />, w: 800, h: 560 });
    } else if (id === "settings") {
      open({
        id: winId,
        kind: "react",
        title: "Settings",
        icon: "⚙️",
        node: <SettingsApp wallpaper={wallpaper} onWallpaper={setWallpaper} onSignOut={logout} />,
        w: 720,
        h: 620,
      });
    }
  };

  const openWebUrl = (url: string, title: string, icon: string) => {
    const id = newWinId("web");
    open({
      id,
      kind: "iframe",
      title,
      icon,
      src: proxify(url, "primary"),
      rawUrl: url,
    });
  };

  const openGame = (g: Game) => {
    const id = newWinId("game");
    setPlaying({ name: g.name, url: g.url });
    open({
      id,
      kind: "iframe",
      title: g.name,
      icon: g.icon,
      src: proxify(g.url, "primary"),
      rawUrl: g.url,
      w: 1024,
      h: 640,
      onClose: () => setPlaying(null),
    });
  };

  const launchPin = (item: PinnedItem) => {
    if (item.type === "game") {
      const g = GAMES.find((x) => x.id === item.id);
      if (g) openGame(g);
    } else if (item.builtin) {
      openBuiltin(item.builtin);
    } else if (item.url) {
      openWebUrl(item.url, item.name, item.icon);
    }
  };

  // ============ Launcher items ============

  const launcherItems: LaunchItem[] = useMemo(() => {
    const items: LaunchItem[] = [];
    SYSTEM_APPS.forEach((a) =>
      items.push({
        id: a.id,
        name: a.name,
        icon: a.icon,
        kind: a.builtin ? "system" : "app",
        hint: a.url,
        run: () => (a.builtin ? openBuiltin(a.builtin) : openWebUrl(a.url!, a.name, a.icon)),
      }),
    );
    customApps.forEach((a) =>
      items.push({ id: a.id, name: a.name, icon: a.icon, kind: "app", hint: a.url, run: () => openWebUrl(a.url, a.name, a.icon) }),
    );
    GAMES.forEach((g) => items.push({ id: g.id, name: g.name, icon: g.icon, kind: "game", run: () => openGame(g) }));
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customApps, wallpaper]);

  // ============ Render ============

  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDate = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const h = now.getHours();
  const greet = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";

  return (
    <div className="mos-root">
      <div className="mos-desktop" style={{ background: WALLPAPERS[wallpaper] || WALLPAPERS.aurora }} />

      {/* TOP BAR */}
      <div className="mos-topbar">
        <div className="mos-topbar-left">
          <img src={mathsLogo} alt="Maths" style={{ width: 18, height: 18 }} />
          <span style={{ fontWeight: 800 }}>Maths OS</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{user?.display_name || user?.username}</span>
        </div>
        <div className="mos-topbar-center">{shortDate}</div>
        <div className="mos-topbar-right">
          <span className="mos-presence-pill" title="Online">
            <span className="mos-presence-dot" /> Online
          </span>
          <span style={{ opacity: 0.6, cursor: "pointer" }} onClick={() => openBuiltin("settings")} title="Settings">⚙</span>
          <span style={{ opacity: 0.6, cursor: "pointer" }} onClick={logout} title="Sign out">⏻</span>
          <span className="mos-topbar-time">{time}</span>
        </div>
      </div>

      {/* HOME / DESKTOP */}
      <div className="mos-home-bg">
        <div className="mos-greeting">{greet}, {user?.display_name || user?.username}</div>
        <div className="mos-clock">
          {time}<span className="mos-clock-s">{seconds}</span>
        </div>
        <div className="mos-date">{dateStr}</div>
        <div className="mos-pinned-label">Pinned</div>
        <div className="mos-pinned-row">
          {pinned.length === 0 ? (
            <div className="mos-empty-pins">Press ⌘K (or Ctrl+K) to launch anything</div>
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
                >✕</button>
              </div>
            ))
          )}
        </div>

        <button className="mos-cmd-hint" onClick={() => setLauncherOpen(true)}>
          <img src={mathsLogo} alt="" style={{ width: 16, height: 16 }} />
          <span>Open launcher</span>
          <span className="mos-launcher-kbd">⌘K</span>
        </button>
      </div>

      {/* WINDOWS */}
      {wins.map((w) => (
        <WindowFrame key={w.id} win={w}>
          {w.kind === "react" ? w.node : null}
        </WindowFrame>
      ))}

      {/* SHOW ALL APPS / GAMES overlay (tabbed) */}
      {showAllApps && (
        <div className="mos-allapps" onClick={() => setShowAllApps(false)}>
          <div className="mos-allapps-grid" onClick={(e) => e.stopPropagation()}>
            <div className="mos-allapps-header">
              <h2 style={{ margin: 0 }}>{showAllApps === "apps" ? "Apps" : "Games"}</h2>
              <div className="mos-allapps-tabs">
                <button className={`mos-allapps-tab ${showAllApps === "apps" ? "active" : ""}`} onClick={() => setShowAllApps("apps")}>🧩 Apps</button>
                <button className={`mos-allapps-tab ${showAllApps === "games" ? "active" : ""}`} onClick={() => setShowAllApps("games")}>🎮 Games</button>
              </div>
              <button className="mos-btn secondary" style={{ flex: "0 0 auto", padding: "8px 16px", borderRadius: 50 }} onClick={() => setShowAllApps(false)}>Close</button>
            </div>

            {showAllApps === "apps" && (
              <>
                <p className="mos-section-label">System</p>
                <div className="mos-app-grid">
                  {SYSTEM_APPS.map((app) => {
                    const pinnedNow = isPinned(app.id);
                    const img = app.image || (app.url ? faviconFor(app.url) : "");
                    return (
                      <div
                        key={app.id}
                        className={`mos-app-tile ${pinnedNow ? "pinned" : ""}`}
                        onClick={() => {
                          if (app.builtin) openBuiltin(app.builtin);
                          else if (app.url) openWebUrl(app.url, app.name, app.icon);
                          setShowAllApps(false);
                        }}
                      >
                        <button
                          className={`mos-pin-btn ${pinnedNow ? "is-pinned" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin({ id: app.id, type: "app", name: app.name, icon: app.icon, url: app.url, builtin: app.builtin });
                          }}
                        >{pinnedNow ? "📌" : "📍"}</button>
                        <div className="mos-app-img">
                          {img ? <img src={img} alt="" onError={(e) => ((e.currentTarget.style.display = "none"))} /> : null}
                          <span className="mos-app-emoji">{app.icon}</span>
                        </div>
                        <span className="mos-app-name">{app.name}</span>
                      </div>
                    );
                  })}
                </div>

                {customApps.length > 0 && (
                  <>
                    <p className="mos-section-label">Your apps</p>
                    <div className="mos-app-grid">
                      {customApps.map((app) => {
                        const pinnedNow = isPinned(app.id);
                        const img = faviconFor(app.url);
                        return (
                          <div
                            key={app.id}
                            className={`mos-app-tile ${pinnedNow ? "pinned" : ""}`}
                            onClick={() => {
                              openWebUrl(app.url, app.name, app.icon);
                              setShowAllApps(false);
                            }}
                          >
                            <button
                              className={`mos-pin-btn ${pinnedNow ? "is-pinned" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin({ id: app.id, type: "custom", name: app.name, icon: app.icon, url: app.url });
                              }}
                            >{pinnedNow ? "📌" : "📍"}</button>
                            <div className="mos-app-img">
                              {img ? <img src={img} alt="" onError={(e) => ((e.currentTarget.style.display = "none"))} /> : null}
                              <span className="mos-app-emoji">{app.icon}</span>
                            </div>
                            <span className="mos-app-name">{app.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <button
                  className="mos-btn secondary"
                  style={{ width: "auto", padding: "10px 22px", borderRadius: 50, marginTop: 10, alignSelf: "flex-start" }}
                  onClick={() => { setAddOpen(true); setShowAllApps(false); }}
                >➕ Add Custom App</button>
              </>
            )}

            {showAllApps === "games" && (
              <div className="mos-game-grid">
                {GAMES.map((g) => {
                  const pinnedNow = isPinned(g.id);
                  return (
                    <div key={g.id} className="mos-game-card" onClick={() => { openGame(g); setShowAllApps(false); }}>
                      <div className="mos-game-thumb" style={{ background: `linear-gradient(135deg, ${g.grad[0]}, ${g.grad[1]})` }}>
                        {g.image ? <img src={g.image} alt={g.name} /> : <span className="mos-game-emoji">{g.icon}</span>}
                      </div>
                      <div className="mos-game-name">{g.name}</div>
                      <button
                        className={`mos-game-pin ${pinnedNow ? "is-pinned" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin({ id: g.id, type: "game", name: g.name, icon: g.icon, url: g.url });
                        }}
                      >{pinnedNow ? "📌" : "📍"}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="mos-dock">
        <button className="mos-dock-btn" onClick={() => setLauncherOpen(true)} title="Launcher">
          <img src={mathsLogo} alt="" style={{ width: 28, height: 28 }} />
          <span className="mos-dock-label">Maths</span>
        </button>
        <DockBtn icon="🌐" label="Browse" onClick={() => openBuiltin("browse")} />
        <DockBtn icon="💬" label="Chat" onClick={() => openBuiltin("messages")} />
        <DockBtn icon="👥" label="Friends" onClick={() => openBuiltin("friends")} />
        <DockBtn icon="🎮" label="Games" onClick={() => setShowAllApps("games")} />
        <DockBtn icon="⚙️" label="Settings" onClick={() => openBuiltin("settings")} />
        <div className="mos-dock-sep" />
        <div className="mos-dock-pinned">
          {pinned.slice(0, 6).map((item) => (
            <button key={item.id} className="mos-dock-btn small" onClick={() => launchPin(item)}>
              <span className="mos-dock-icon">{item.icon}</span>
              <span className="mos-tooltip">{item.name}</span>
            </button>
          ))}
        </div>
        {wins.length > 0 && <div className="mos-dock-sep" />}
        {/* Taskbar of open windows */}
        <div className="mos-taskbar">
          {wins.map((w) => (
            <button
              key={w.id}
              className={`mos-task ${w.minimized ? "min" : "open"}`}
              onClick={() => (w.minimized ? restore(w.id) : focus(w.id))}
              onContextMenu={(e) => {
                e.preventDefault();
                close(w.id);
              }}
              title={`${w.title} (right-click to close)`}
            >
              <span style={{ fontSize: "1.2em" }}>{w.icon}</span>
              <span className="mos-task-label">{w.title}</span>
              <span
                className="mos-task-x"
                onClick={(e) => {
                  e.stopPropagation();
                  close(w.id);
                }}
              >✕</span>
            </button>
          ))}
        </div>
        <div className="mos-dock-sep" />
        <DockBtn icon="🧩" label="Apps" onClick={() => setShowAllApps("apps")} />
      </div>

      {/* LAUNCHER */}
      <Launcher open={launcherOpen} items={launcherItems} onClose={() => setLauncherOpen(false)} />

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

function DockBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="mos-dock-btn" onClick={onClick}>
      <span className="mos-dock-icon">{icon}</span>
      <span className="mos-dock-label">{label}</span>
      <span className="mos-tooltip">{label}</span>
    </button>
  );
}

function FriendsAppWindow({ onMessage }: { onMessage: () => void }) {
  // FriendsApp expects an id-based handler; we ignore the id and just pop open the messages window.
  return <FriendsApp onMessage={() => onMessage()} />;
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
            <button key={i} className={`mos-icon-opt ${icon === i ? "selected" : ""}`} onClick={() => setIcon(i)}>{i}</button>
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
