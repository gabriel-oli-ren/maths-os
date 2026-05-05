import { useEffect, useState } from "react";

/** Cloudflare Worker proxy (single source of truth). */
export const PROXY_WORKER = "https://search.mathssupport.cat/p/";

/** Optional fallback for CORS-only cases (keep, but not primary). */
export const CORS_ANYWHERE = "https://cors-anywhere.herokuapp.com/";
export const CORS_ANYWHERE_ACTIVATE = "https://cors-anywhere.herokuapp.com/corsdemo";

const CA_KEY = "mos_cors_anywhere_active";

export type ProxyMode = "worker" | "cors-anywhere";

/**
 * Main proxy builder — everything routes through the Worker.
 */
export function proxify(url: string, mode: ProxyMode = "worker"): string {
  if (!url) return url;

  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("javascript:")
  ) {
    return url;
  }

  if (mode === "cors-anywhere") {
    return CORS_ANYWHERE + url;
  }

  // Worker (default)
  return PROXY_WORKER + encodeURIComponent(url);
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
 * Health check for the Cloudflare Worker.
 */
export function useProxyHealth() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          PROXY_WORKER + encodeURIComponent("https://example.com"),
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!cancelled) {
          setStatus(res.ok ? "online" : "offline");
        }
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
