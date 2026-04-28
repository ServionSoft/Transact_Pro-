import { getApiBaseUrl } from "@/lib/apiConfig";
import { clearAuthSession, getAccessToken, getRefreshToken, setAuthTokens } from "@/store/authStore";
import { refreshApi } from "@/api/auth";

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const refreshed = await refreshApi(refreshToken);
      setAuthTokens(refreshed.accessToken, refreshed.refreshToken);
      return refreshed.accessToken;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function withAuthHeader(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const finalUrl = /^https?:\/\//i.test(url)
    ? url
    : `${(base ?? "").replace(/\/+$/, "")}${url.startsWith("/") ? url : `/${url}`}`;

  const accessToken = getAccessToken();
  const firstInit = accessToken ? withAuthHeader(init, accessToken) : init;
  const firstResponse = await fetch(finalUrl, firstInit);
  if (firstResponse.status !== 401 || !getRefreshToken()) return firstResponse;

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) return firstResponse;

  const retryInit = withAuthHeader(init, newAccessToken);
  return fetch(finalUrl, retryInit);
}
