import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

/**
 * Sends a heartbeat to user_presence every 30s while the user is active.
 * Call setPlaying(name, url) when a game launches; clear with setPlaying(null).
 */
let currentGame: { name: string; url: string } | null = null;

export function setPlaying(game: { name: string; url: string } | null) {
  currentGame = game;
}

export function usePresenceHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const beat = async () => {
      if (cancelled) return;
      await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          game_name: currentGame?.name ?? null,
          game_url: currentGame?.url ?? null,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };
    beat();
    const interval = setInterval(beat, 30_000);

    const onUnload = () => {
      // fire-and-forget — keep presence fresh on close
      navigator.sendBeacon?.(
        `https://hsmfjpetvcsgkpkwpdjr.supabase.co/rest/v1/user_presence?on_conflict=user_id`,
        new Blob(
          [
            JSON.stringify({
              user_id: user.id,
              game_name: null,
              game_url: null,
              last_active: new Date().toISOString(),
            }),
          ],
          { type: "application/json" },
        ),
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [user]);
}

/** Returns 'online' | 'away' | 'offline' from a last_active timestamp string. */
export function presenceStatus(lastActive: string | null | undefined): "online" | "away" | "offline" {
  if (!lastActive) return "offline";
  const diff = Date.now() - new Date(lastActive).getTime();
  if (diff < 75_000) return "online";
  if (diff < 5 * 60_000) return "away";
  return "offline";
}
