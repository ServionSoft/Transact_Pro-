/** Trims and removes trailing slash. Returns undefined when unset or empty. */
export function getApiBaseUrl(): string | undefined {
  // Dev: route API through Vite proxy on the same origin (phone on LAN IP → PC, not phone localhost).
  if (import.meta.env.DEV && import.meta.env.VITE_API_DIRECT !== "true") {
    if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
    return "";
  }
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw !== "string") return undefined;
  const u = raw.trim();
  if (!u) return undefined;
  return u.replace(/\/+$/, "");
}
