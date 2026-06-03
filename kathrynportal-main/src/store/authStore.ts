import { create } from "zustand";
import { loginApi, logoutApi, meApi, refreshApi, type AuthUser } from "@/api/auth";

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  bootstrapSession: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
};

const STORAGE_KEY = "tp.auth.session.v1";

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const initial = readStoredSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial?.user ?? null,
  accessToken: initial?.accessToken ?? null,
  refreshToken: initial?.refreshToken ?? null,
  isBootstrapping: true,

  bootstrapSession: async () => {
    const snapshot = get();
    if (!snapshot.accessToken || !snapshot.refreshToken) {
      set({ isBootstrapping: false, user: null, accessToken: null, refreshToken: null });
      clearStoredSession();
      return;
    }
    try {
      const user = await meApi(snapshot.accessToken);
      writeStoredSession({
        user,
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken,
      });
      set({ user, isBootstrapping: false });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("transactpro:refresh-nav-badges"));
      }
    } catch {
      try {
        const refreshed = await refreshApi(snapshot.refreshToken);
        const user = await meApi(refreshed.accessToken);
        writeStoredSession({
          user,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
        set({
          user,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          isBootstrapping: false,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("transactpro:refresh-nav-badges"));
        }
      } catch {
        clearStoredSession();
        set({ user: null, accessToken: null, refreshToken: null, isBootstrapping: false });
      }
    }
  },

  loginWithPassword: async (email: string, password: string) => {
    const result = await loginApi(email, password);
    writeStoredSession({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    set({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isBootstrapping: false,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("transactpro:refresh-nav-badges"));
    }
  },

  logout: async () => {
    const token = get().refreshToken;
    if (token) {
      try {
        await logoutApi(token);
      } catch {
        // Ignore network/logout errors; local logout should still happen.
      }
    }
    clearStoredSession();
    set({ user: null, accessToken: null, refreshToken: null, isBootstrapping: false });
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    const user = get().user;
    if (!user) return;
    writeStoredSession({ user, accessToken, refreshToken });
    set({ accessToken, refreshToken });
  },

  clearSession: () => {
    clearStoredSession();
    set({ user: null, accessToken: null, refreshToken: null, isBootstrapping: false });
  },
}));

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  useAuthStore.getState().setTokens(accessToken, refreshToken);
}

export function clearAuthSession(): void {
  useAuthStore.getState().clearSession();
}
