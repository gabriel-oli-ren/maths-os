import { useEffect, useState } from "react";

export type Toast = { id: number; message: string; kind: "success" | "info" | "warn" };
let nextId = 1;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function emit() {
  for (const l of listeners) l(toasts);
}

export function toast(message: string, kind: Toast["kind"] = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 2400);
}

export function useToasts() {
  const [list, setList] = useState<Toast[]>(toasts);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

export function ToastContainer() {
  const list = useToasts();
  return (
    <div className="mos-toasts">
      {list.map((t) => (
        <div key={t.id} className={`mos-toast ${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
