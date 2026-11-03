import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, clearAccessToken, setAccessToken } from "../api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.refresh().then((tokens) => {
      setAccessToken(tokens.access);
      return authApi.getMe();
    }).then(setUser).catch(() => clearAccessToken()).finally(() => setLoading(false));
  }, []);

  const authenticate = async (email, password) => {
    const tokens = await authApi.login(email, password);
    setAccessToken(tokens.access);
    setUser(await authApi.getMe());
  };

  const register = async (email, password, fullName) => {
    const tokens = await authApi.register(email, password, fullName);
    setAccessToken(tokens.access);
    setUser(tokens.user || await authApi.getMe());
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* local logout must still complete */ }
    clearAccessToken();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login: authenticate, register, logout, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
