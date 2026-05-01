import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, type DbUser } from "@/integrations/supabase/client";

type AuthCtx = {
  user: DbUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const STORAGE_KEY = "mos_session_user";

function genFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
    setLoading(false);
  }, []);

  const persist = (u: DbUser | null) => {
    setUser(u);
    if (typeof window === "undefined") return;
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login: AuthCtx["login"] = async (username, password) => {
    const u = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, friend_code, role, is_admin, created_at, password")
      .eq("username", u)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("User not found");
    if (data.password !== password) throw new Error("Wrong password");
    const { password: _pw, ...safe } = data as DbUser & { password: string };
    persist(safe);
  };

  const signup: AuthCtx["signup"] = async (username, password, displayName) => {
    const u = username.trim().toLowerCase();
    if (u.length < 3) throw new Error("Username must be at least 3 characters");
    if (password.length < 4) throw new Error("Password must be at least 4 characters");

    const { data: existing } = await supabase.from("users").select("id").eq("username", u).maybeSingle();
    if (existing) throw new Error("Username already taken");

    const insert = {
      username: u,
      display_name: displayName.trim() || u,
      password,
      friend_code: genFriendCode(),
      role: "user",
    };
    const { data, error } = await supabase
      .from("users")
      .insert(insert)
      .select("id, username, display_name, friend_code, role, is_admin, created_at")
      .single();
    if (error) throw new Error(error.message);
    persist(data as DbUser);
  };

  const logout = () => persist(null);

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
