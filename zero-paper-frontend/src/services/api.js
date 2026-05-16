// src/services/api.js
// Zero Paper – Instância axios com JWT automático
// Uso: import api from "../services/api";

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333",
  timeout: 10_000,
});

// Injeta Bearer token em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("zp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se JWT expirar (401)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("zp_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
