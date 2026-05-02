import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";

export type WinKind = "iframe" | "react";

export type WinState = {
  id: string;
  title: string;
  icon: string;
  kind: WinKind;
  src?: string; // iframe src (already proxified if needed)
  rawUrl?: string; // original URL — useful for "Open in new tab"
  node?: ReactNode; // react app
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Optional callback fired when the window closes — e.g. to clear "playing" presence. */
  onClose?: () => void;
};

type State = { wins: WinState[]; topZ: number };
type Action =
  | { type: "open"; win: Omit<WinState, "z" | "minimized" | "maximized" | "x" | "y" | "w" | "h"> & Partial<Pick<WinState, "x" | "y" | "w" | "h" | "minimized" | "maximized">> }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "restore"; id: string }
  | { type: "toggleMax"; id: string }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "resize"; id: string; w: number; h: number };

const Ctx = createContext<{
  wins: WinState[];
  open: (w: Action extends { type: "open"; win: infer W } ? W : never) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMax: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
} | null>(null);

const VW = () => (typeof window === "undefined" ? 1280 : window.innerWidth);
const VH = () => (typeof window === "undefined" ? 800 : window.innerHeight);

function defaults(i: number) {
  const baseW = Math.min(960, VW() - 80);
  const baseH = Math.min(640, VH() - 160);
  const offset = (i % 6) * 32;
  return {
    w: baseW,
    h: baseH,
    x: Math.max(20, (VW() - baseW) / 2 + offset - 80),
    y: Math.max(50, (VH() - baseH) / 2 + offset - 60),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "open": {
      const i = state.wins.length;
      const d = defaults(i);
      const next: WinState = {
        x: d.x,
        y: d.y,
        w: d.w,
        h: d.h,
        minimized: false,
        maximized: false,
        ...action.win,
        z: state.topZ + 1,
      };
      return { wins: [...state.wins, next], topZ: state.topZ + 1 };
    }
    case "close": {
      const w = state.wins.find((x) => x.id === action.id);
      if (w?.onClose) try { w.onClose(); } catch {}
      return { ...state, wins: state.wins.filter((x) => x.id !== action.id) };
    }
    case "focus": {
      const w = state.wins.find((x) => x.id === action.id);
      if (!w) return state;
      const z = state.topZ + 1;
      return {
        wins: state.wins.map((x) => (x.id === action.id ? { ...x, z, minimized: false } : x)),
        topZ: z,
      };
    }
    case "minimize":
      return { ...state, wins: state.wins.map((x) => (x.id === action.id ? { ...x, minimized: true } : x)) };
    case "restore": {
      const z = state.topZ + 1;
      return {
        wins: state.wins.map((x) => (x.id === action.id ? { ...x, minimized: false, z } : x)),
        topZ: z,
      };
    }
    case "toggleMax":
      return {
        ...state,
        wins: state.wins.map((x) => (x.id === action.id ? { ...x, maximized: !x.maximized } : x)),
      };
    case "move":
      return {
        ...state,
        wins: state.wins.map((x) => (x.id === action.id ? { ...x, x: action.x, y: action.y } : x)),
      };
    case "resize":
      return {
        ...state,
        wins: state.wins.map((x) => (x.id === action.id ? { ...x, w: action.w, h: action.h } : x)),
      };
  }
}

export function WindowsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { wins: [], topZ: 10 });

  const open = useCallback<NonNullable<ReturnType<typeof useContext<typeof Ctx>>>["open"]>((w) => {
    dispatch({ type: "open", win: w });
    return w.id;
  }, []);
  const close = useCallback((id: string) => dispatch({ type: "close", id }), []);
  const focus = useCallback((id: string) => dispatch({ type: "focus", id }), []);
  const minimize = useCallback((id: string) => dispatch({ type: "minimize", id }), []);
  const restore = useCallback((id: string) => dispatch({ type: "restore", id }), []);
  const toggleMax = useCallback((id: string) => dispatch({ type: "toggleMax", id }), []);
  const move = useCallback((id: string, x: number, y: number) => dispatch({ type: "move", id, x, y }), []);
  const resize = useCallback((id: string, w: number, h: number) => dispatch({ type: "resize", id, w, h }), []);

  const value = useMemo(
    () => ({ wins: state.wins, open, close, focus, minimize, restore, toggleMax, move, resize }),
    [state.wins, open, close, focus, minimize, restore, toggleMax, move, resize],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWindows() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWindows outside provider");
  return c;
}

/** Stable id generator. */
export function newWinId(prefix = "win") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
