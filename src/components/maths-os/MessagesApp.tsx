import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type DbMessage, type DbUser } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/maths-os/auth";
import { presenceStatus } from "@/lib/maths-os/presence";

type Friend = DbUser & { last_active?: string | null; game_name?: string | null };

export function MessagesApp() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [theirTyping, setTheirTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const active = useMemo(() => friends.find((f) => f.id === activeId) || null, [friends, activeId]);

  // Load friend list (accepted friendships)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");
      const otherIds = (rows || [])
        .map((r) => (r.user_id === user.id ? r.friend_id : r.user_id))
        .filter((x): x is string => !!x);
      if (otherIds.length === 0) {
        if (!cancelled) setFriends([]);
        return;
      }
      const { data: users } = await supabase
        .from("users")
        .select("id, username, display_name, friend_code, role, is_admin, created_at")
        .in("id", otherIds);
      const { data: presence } = await supabase
        .from("user_presence")
        .select("user_id, last_active, game_name")
        .in("user_id", otherIds);
      const byId = new Map((presence || []).map((p) => [p.user_id, p]));
      const merged = (users || []).map((u) => ({
        ...u,
        last_active: byId.get(u.id)?.last_active ?? null,
        game_name: byId.get(u.id)?.game_name ?? null,
      })) as Friend[];
      if (!cancelled) setFriends(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load thread + subscribe to realtime
  useEffect(() => {
    if (!user || !activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activeId}),and(sender_id.eq.${activeId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMessages((data as DbMessage[]) || []);
    })();

    const channel = supabase
      .channel(`dm:${user.id}:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as DbMessage;
          const matches =
            (m.sender_id === user.id && m.receiver_id === activeId) ||
            (m.sender_id === activeId && m.receiver_id === user.id);
          if (matches) setMessages((prev) => [...prev, m]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "typing_status", filter: `user_id=eq.${activeId}` },
        (payload) => {
          const row = payload.new as { user_id: string; receiver_id: string; is_typing: boolean | null };
          if (row.receiver_id === user.id) setTheirTyping(!!row.is_typing);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "typing_status", filter: `user_id=eq.${activeId}` },
        (payload) => {
          const row = payload.new as { user_id: string; receiver_id: string; is_typing: boolean | null };
          if (row.receiver_id === user.id) setTheirTyping(!!row.is_typing);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, activeId]);

  // Auto-scroll
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, theirTyping]);

  // Typing indicator updates
  const onDraftChange = async (val: string) => {
    setDraft(val);
    if (!user || !activeId) return;
    await supabase.from("typing_status").upsert(
      {
        user_id: user.id,
        receiver_id: activeId,
        is_typing: val.length > 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,receiver_id" },
    );
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(async () => {
      await supabase
        .from("typing_status")
        .upsert(
          { user_id: user.id, receiver_id: activeId, is_typing: false, updated_at: new Date().toISOString() },
          { onConflict: "user_id,receiver_id" },
        );
    }, 2000);
  };

  const send = async () => {
    if (!user || !activeId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const optimistic: DbMessage = {
      id: -Date.now(),
      sender_id: user.id,
      receiver_id: activeId,
      content,
      status: "sent",
      content_type: "text",
      sticker_url: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeId,
      content,
      content_type: "text",
      status: "sent",
    });
    if (error) {
      // rollback if it failed (e.g. RLS)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      alert("Failed to send: " + error.message);
    }
    await supabase
      .from("typing_status")
      .upsert(
        { user_id: user.id, receiver_id: activeId, is_typing: false, updated_at: new Date().toISOString() },
        { onConflict: "user_id,receiver_id" },
      );
  };

  return (
    <div className="mos-messenger">
      <aside className="mos-msg-sidebar">
        <div className="mos-msg-sidebar-header">Friends</div>
        <div className="mos-msg-list">
          {friends.length === 0 && (
            <div style={{ padding: 16, fontSize: "0.8em", color: "var(--mos-text-faint)" }}>
              Add friends in the Friends app to start messaging.
            </div>
          )}
          {friends.map((f) => {
            const status = presenceStatus(f.last_active);
            const display = f.display_name || f.username;
            return (
              <div key={f.id} className={`mos-msg-item ${activeId === f.id ? "active" : ""}`} onClick={() => setActiveId(f.id)}>
                <div className="mos-avatar">
                  {display.slice(0, 1).toUpperCase()}
                  <span className={`mos-avatar-status ${status}`} />
                </div>
                <div className="mos-msg-item-meta">
                  <div className="mos-msg-item-name">{display}</div>
                  <div className="mos-msg-item-sub">{f.game_name ? `🎮 ${f.game_name}` : status}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="mos-msg-main">
        {!active ? (
          <div className="mos-msg-empty">
            <div style={{ fontSize: "3em", opacity: 0.4 }}>💬</div>
            <div>Pick a friend to start chatting</div>
          </div>
        ) : (
          <>
            <div className="mos-msg-header">
              <div className="mos-avatar">
                {(active.display_name || active.username).slice(0, 1).toUpperCase()}
                <span className={`mos-avatar-status ${presenceStatus(active.last_active)}`} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{active.display_name || active.username}</div>
                <div style={{ fontSize: "0.72em", color: "var(--mos-text-dim)" }}>
                  {active.game_name ? `Playing ${active.game_name}` : presenceStatus(active.last_active)}
                </div>
              </div>
            </div>
            <div className="mos-msg-thread" ref={threadRef}>
              {(() => {
                const out: React.ReactNode[] = [];
                let lastDay = "";
                let lastSender: number | null = null;
                messages.forEach((m, i) => {
                  const d = m.created_at ? new Date(m.created_at) : new Date();
                  const day = d.toDateString();
                  if (day !== lastDay) {
                    const today = new Date().toDateString();
                    const yest = new Date(Date.now() - 864e5).toDateString();
                    const label = day === today ? "Today" : day === yest ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
                    out.push(<div key={`day-${i}`} className="mos-chat-day">{label}</div>);
                    lastDay = day;
                    lastSender = null;
                  }
                  const mine = m.sender_id === user?.id;
                  const cont = lastSender === m.sender_id;
                  lastSender = m.sender_id;
                  out.push(
                    <div key={m.id} className={`mos-bubble ${mine ? "mine" : "theirs"} ${cont ? "cont" : ""}`}>
                      {m.content_type === "sticker" && m.sticker_url ? (
                        <img src={m.sticker_url} alt="sticker" style={{ maxWidth: 160, display: "block" }} />
                      ) : (
                        m.content
                      )}
                      {m.created_at && (
                        <div className="mos-bubble-meta">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  );
                });
                return out;
              })()}
              {theirTyping && (
                <div className="mos-typing">
                  <span className="mos-typing-dot" />
                  <span className="mos-typing-dot" />
                  <span className="mos-typing-dot" />
                  <span style={{ marginLeft: 4 }}>typing…</span>
                </div>
              )}
            </div>
            <div className="mos-chat-emojibar">
              {["👋","😂","❤️","🔥","🎉","👍","😎","😢","🙏","🤔","💯","🚀"].map((e) => (
                <button key={e} className="mos-chat-emoji" onClick={() => setDraft((d) => d + e)}>{e}</button>
              ))}
            </div>
            <div className="mos-msg-composer">
              <input
                placeholder="Message…"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button className="mos-btn primary" style={{ flex: "0 0 auto", padding: "10px 18px" }} onClick={send}>
                Send
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
