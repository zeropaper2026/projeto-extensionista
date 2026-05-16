// src/contexts/AuthContext.jsx
// Zero Paper – Contexto global de autenticação
// Uso: useAuth() retorna { auth, login, logout }

import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const token       = localStorage.getItem("zp_token");
      const funcionario = JSON.parse(localStorage.getItem("zp_funcionario") || "null");
      if (token && funcionario) return { token, funcionario };
    } catch { /* dados corrompidos */ }
    return null;
  });

  const login = useCallback((data) => {
    localStorage.setItem("zp_token",       data.token);
    localStorage.setItem("zp_funcionario", JSON.stringify(data.funcionario));
    setAuth({ token: data.token, funcionario: data.funcionario });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("zp_token");
    localStorage.removeItem("zp_funcionario");
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
