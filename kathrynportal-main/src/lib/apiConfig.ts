/** Trims and removes trailing slash. Returns undefined when unset or empty. */
export function getApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw !== "string") return undefined;
  const u = raw.trim();
  if (!u) return undefined;
  return u.replace(/\/+$/, "");
}
