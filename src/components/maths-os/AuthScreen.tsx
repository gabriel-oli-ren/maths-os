import { useState } from "react";
import { useAuth } from "@/lib/maths-os/auth";

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await signup(username, password, displayName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mos-root">
      <div className="mos-desktop" />
      <div className="mos-auth">
        <form className="mos-auth-card" onSubmit={submit}>
          <div className="mos-auth-logo">Maths OS</div>
          <div className="mos-auth-sub">Sign in to chat with friends and track sessions.</div>

          <div className="mos-auth-tabs">
            <button type="button" className={`mos-auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button type="button" className={`mos-auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>
              Create account
            </button>
          </div>

          <input
            className="mos-input"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {mode === "signup" && (
            <input
              className="mos-input"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="mos-input"
            type="password"
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mos-auth-error">{err}</div>
          <button type="submit" className="mos-btn primary" disabled={busy} style={{ width: "100%", padding: 14 }}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
