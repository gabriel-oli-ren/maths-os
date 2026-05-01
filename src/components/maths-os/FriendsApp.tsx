import { useEffect, useState } from "react";
import { supabase, type DbUser } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/maths-os/auth";
import { presenceStatus } from "@/lib/maths-os/presence";
import { toast } from "@/lib/maths-os/toast";

type FriendRow = {
  id: string;
  user_id: string | null;
  friend_id: string | null;
  status: string | null;
};

type FriendView = DbUser & {
  rowId: string;
  status: "accepted" | "pending_in" | "pending_out";
  last_active?: string | null;
  game_name?: string | null;
  game_url?: string | null;
};

export function FriendsApp({ onMessage }: { onMessage?: (id: string) => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    const list = (rows || []) as FriendRow[];

    const otherIds = list
      .map((r) => (r.user_id === user.id ? r.friend_id : r.user_id))
      .filter((x): x is string => !!x);
    if (otherIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const [{ data: users }, { data: presence }] = await Promise.all([
      supabase
        .from("users")
        .select("id, username, display_name, friend_code, role, is_admin, created_at")
        .in("id", otherIds),
      supabase.from("user_presence").select("user_id, last_active, game_name, game_url").in("user_id", otherIds),
    ]);
    const byId = new Map((presence || []).map((p) => [p.user_id, p]));

    const merged: FriendView[] = list.flatMap((r) => {
      const otherId = r.user_id === user.id ? r.friend_id : r.user_id;
      const u = (users || []).find((x) => x.id === otherId);
      if (!u) return [];
      let status: FriendView["status"];
      if (r.status === "accepted") status = "accepted";
      else if (r.user_id === user.id) status = "pending_out";
      else status = "pending_in";
      const p = byId.get(u.id);
      return [{ ...u, rowId: r.id, status, last_active: p?.last_active, game_name: p?.game_name, game_url: p?.game_url }];
    });
    setFriends(merged);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    if (!user) return;
    const ch = supabase
      .channel(`friends:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => reload())
      .subscribe();
    const interval = setInterval(reload, 60_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const sendRequest = async () => {
    if (!user) return;
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (c === user.friend_code) {
      toast("That's your code 😅", "warn");
      return;
    }
    const { data: target } = await supabase.from("users").select("id, username").eq("friend_code", c).maybeSingle();
    if (!target) {
      toast("No user with that code", "warn");
      return;
    }
    const { error } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: target.id,
      status: "pending",
    });
    if (error) toast(error.message, "warn");
    else {
      toast(`Request sent to ${target.username}`, "success");
      setCode("");
      reload();
    }
  };

  const accept = async (rowId: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId);
    if (error) toast(error.message, "warn");
    else {
      toast("Friend added 🎉", "success");
      reload();
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("friendships").delete().eq("id", rowId);
    reload();
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending_in");
  const outgoing = friends.filter((f) => f.status === "pending_out");

  return (
    <div style={{ width: "100%" }}>
      {/* Add by friend code */}
      <div
        style={{
          padding: 16,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--mos-glass-border)",
          borderRadius: 14,
          marginBottom: 24,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: "0.78em", color: "var(--mos-text-dim)", marginBottom: 4 }}>YOUR FRIEND CODE</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.5em", fontWeight: 800, letterSpacing: 3 }}>
            {user?.friend_code}
          </div>
        </div>
        <input
          className="mos-input"
          placeholder="Enter friend code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ width: 200, marginBottom: 0 }}
          maxLength={10}
        />
        <button className="mos-btn primary" style={{ flex: "0 0 auto", padding: "12px 20px" }} onClick={sendRequest}>
          Add Friend
        </button>
      </div>

      {incoming.length > 0 && (
        <>
          <p className="mos-section-label">Incoming Requests</p>
          <div className="mos-friend-grid" style={{ marginBottom: 24 }}>
            {incoming.map((f) => (
              <FriendCard key={f.rowId} f={f} onAccept={() => accept(f.rowId)} onRemove={() => remove(f.rowId)} />
            ))}
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className="mos-section-label">Pending</p>
          <div className="mos-friend-grid" style={{ marginBottom: 24 }}>
            {outgoing.map((f) => (
              <FriendCard key={f.rowId} f={f} onRemove={() => remove(f.rowId)} />
            ))}
          </div>
        </>
      )}

      <p className="mos-section-label">Friends ({accepted.length})</p>
      {loading && accepted.length === 0 ? (
        <div className="mos-empty">
          <span className="mos-empty-icon">⏳</span>
          <span>Loading…</span>
        </div>
      ) : accepted.length === 0 ? (
        <div className="mos-empty">
          <span className="mos-empty-icon">👥</span>
          <span>No friends yet — share your code above</span>
        </div>
      ) : (
        <div className="mos-friend-grid">
          {accepted.map((f) => (
            <FriendCard
              key={f.rowId}
              f={f}
              onMessage={() => onMessage?.(f.id)}
              onRemove={() => {
                if (confirm(`Remove ${f.display_name || f.username}?`)) remove(f.rowId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FriendCard({
  f,
  onAccept,
  onMessage,
  onRemove,
}: {
  f: FriendView;
  onAccept?: () => void;
  onMessage?: () => void;
  onRemove?: () => void;
}) {
  const display = f.display_name || f.username;
  const status = presenceStatus(f.last_active);
  return (
    <div className="mos-friend-card">
      <div className="mos-friend-head">
        <div className="mos-avatar">
          {display.slice(0, 1).toUpperCase()}
          <span className={`mos-avatar-status ${status}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mos-friend-name">{display}</div>
          <div className="mos-friend-handle">@{f.username} · {f.friend_code}</div>
        </div>
      </div>
      {f.status === "accepted" && (
        <div className="mos-friend-playing">
          {f.game_name ? (
            <>Playing <b>{f.game_name}</b></>
          ) : status === "online" ? (
            "Online — not in a game"
          ) : status === "away" ? (
            "Away"
          ) : (
            "Offline"
          )}
        </div>
      )}
      <div className="mos-friend-actions">
        {onAccept && <button onClick={onAccept}>Accept</button>}
        {onMessage && <button onClick={onMessage}>💬 Message</button>}
        {onRemove && (
          <button className="danger" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
