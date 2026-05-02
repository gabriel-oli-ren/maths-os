import { useEffect, useState } from "react";
import { useAuth } from "@/lib/maths-os/auth";

type Note = { id: string; title: string; body: string; updated: number };

export function NotesApp() {
  const { user } = useAuth();
  const KEY = `mos_notes_${user?.id || "anon"}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as Note[]) : [];
      setNotes(list);
      if (list[0]) setActiveId(list[0].id);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY]);

  const save = (next: Note[]) => {
    setNotes(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const addNote = () => {
    const n: Note = { id: "n-" + Date.now(), title: "Untitled", body: "", updated: Date.now() };
    save([n, ...notes]);
    setActiveId(n.id);
  };

  const update = (id: string, patch: Partial<Note>) => {
    save(notes.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)));
  };

  const del = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    save(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
  };

  const active = notes.find((n) => n.id === activeId);

  return (
    <div className="mos-notes">
      <aside className="mos-notes-sidebar">
        <button className="mos-btn primary" style={{ margin: 12 }} onClick={addNote}>+ New note</button>
        <div className="mos-notes-list">
          {notes.length === 0 && <div style={{ padding: 16, fontSize: "0.8em", color: "var(--mos-text-faint)" }}>No notes yet.</div>}
          {notes.map((n) => (
            <div
              key={n.id}
              className={`mos-notes-item ${n.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(n.id)}
            >
              <div className="mos-notes-item-title">{n.title || "Untitled"}</div>
              <div className="mos-notes-item-sub">{new Date(n.updated).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </aside>
      <main className="mos-notes-main">
        {!active ? (
          <div className="mos-msg-empty">📝 Pick or create a note</div>
        ) : (
          <>
            <div className="mos-notes-toolbar">
              <input
                className="mos-notes-title"
                value={active.title}
                onChange={(e) => update(active.id, { title: e.target.value })}
              />
              <button className="mos-btn secondary" style={{ flex: "0 0 auto", padding: "8px 14px" }} onClick={() => del(active.id)}>
                Delete
              </button>
            </div>
            <textarea
              className="mos-notes-body"
              value={active.body}
              onChange={(e) => update(active.id, { body: e.target.value })}
              placeholder="Write something…"
            />
          </>
        )}
      </main>
    </div>
  );
}
