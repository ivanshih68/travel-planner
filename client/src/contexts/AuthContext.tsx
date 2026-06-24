/**
 * AuthContext — JWT Authentication State Management
 * Design: Coastal Morning theme
 * Replaces Firebase Auth with JWT-based authentication
 * Provides auth state, login/register/logout functions to all child components
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi, User } from "@/lib/api";

// ── 型別定義 ─────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: { name?: string; avatarUrl?: string | null }) => Promise<void>;
}

// ── Context ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：從 localStorage 恢復登入狀態，並背景驗證 token
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const cachedUser = localStorage.getItem("auth_user");

    if (token && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        // ignore parse error
      }
      // 背景驗證 token 是否仍有效
      authApi
        .me()
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem("auth_user", JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await authApi.register({ name, email, password });
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (data: { name?: string; avatarUrl?: string | null }) => {
      const { data: res } = await authApi.updateMe(data);
      setUser(res.user);
      localStorage.setItem("auth_user", JSON.stringify(res.user));
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
