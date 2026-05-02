import { useEffect, useState } from "react";

/** Primary in-project framing proxy (Cloudflare Worker route). */
export const PROXY_PRIMARY = "/api/public/proxy?url=";

/** Cors-anywhere fallback for client-side CORS-only needs. */
export const CORS_ANYWHERE = "https://cors-anywhere.herokuapp.com/";
export const CORS_ANYWHERE_ACTIVATE = "https://cors-anywhere.herokuapp.com/corsdemo";

const CA_KEY = "mos_cors_anywhere_active";

export type ProxyMode = "primary" | "cors-anywhere";

export function proxify(url: string, mode: ProxyMode = "primary"): string {
  if (!url) return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("javascript:")) {
    return url;
  }
  if (mode === "cors-anywhere") return CORS_ANYWHERE + url;
  // primary
  return PROXY_PRIMARY + encodeURIComponent(url);
}

export function isCorsAnywhereActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CA_KEY) === "1";
}

export function markCorsAnywhereActive(active: boolean) {
  if (typeof window === "undefined") return;
  if (active) localStorage.setItem(CA_KEY, "1");
  else localStorage.removeItem(CA_KEY);
}

/**
 * Lightweight ping of the primary proxy so the UI can show a status pill.
 * Only resolves "online" / "offline" — never throws.
 */
export function useProxyHealth() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(PROXY_PRIMARY + encodeURIComponent("https://example.com"), {
          method: "GET",
          cache: "no-store",
        });
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
