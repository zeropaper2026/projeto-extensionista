// src/pages/Login.jsx
// Zero Paper – Tela de Login
// Correções: fetch → axios (api.js), integração com AuthContext (useAuth)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]     = useState({ login: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.login.trim() || !form.senha.trim()) {
      setErro("Preencha login e senha para continuar.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        login: form.login.trim(),
        senha: form.senha,
      });

      login(data);          // salva token no AuthContext + localStorage
      navigate("/clientes"); // redireciona para a home protegida
    } catch (err) {
      const msg = err.response?.data?.erro
        || err.response?.data?.message
        || "Erro ao fazer login. Tente novamente.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zp-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#0d2340;--teal:#1a7a6e;--teal-light:#22a090;--green:#2e7d52;
          --white:#fff;--g50:#f8fafc;--g200:#e2e8f0;--g400:#94a3b8;--g600:#475569;
          --red:#dc2626;--red-l:#fef2f2;
        }
        .zp-login-root{min-height:100vh;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;background:var(--white);overflow-x:hidden}
        .zp-header{background:var(--navy);padding:0 2rem;height:64px;display:flex;align-items:center;gap:1rem}
        .zp-logo-box{width:44px;height:44px;background:var(--teal);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px}
        .zp-brand{color:var(--white);font-family:'Sora',sans-serif}
        .zp-brand span{display:block}
        .zp-brand .top{font-size:10px;font-weight:300;letter-spacing:3px;opacity:.7;text-transform:uppercase}
        .zp-brand .bot{font-size:18px;font-weight:700;line-height:1}
        .zp-hero{flex:1;display:grid;grid-template-columns:1fr 420px;min-height:calc(100vh - 76px);overflow:hidden}
        .zp-hero-left{position:relative;background:linear-gradient(135deg,#e8f4f1,#c8e0d8);overflow:hidden}
        .zp-hero-bg{position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80') center/cover;opacity:.55}
        .zp-hero-tagline{position:absolute;bottom:3rem;left:2.5rem;right:2.5rem;background:rgba(13,35,64,.75);backdrop-filter:blur(8px);padding:1.5rem 2rem;border-radius:12px;border-left:4px solid var(--teal-light)}
        .zp-hero-tagline p{color:var(--white);font-family:'Sora',sans-serif;font-size:16px;font-weight:300;line-height:1.6;font-style:italic}
        .zp-hero-right{background:var(--g50);display:flex;align-items:center;justify-content:center;padding:3rem 2.5rem}
        .zp-card{width:100%;max-width:360px}
        .zp-card-title{font-family:'Sora',sans-serif;font-size:14px;font-weight:400;color:var(--g600);margin-bottom:1.5rem;text-align:center}
        .zp-field{margin-bottom:1.2rem}
        .zp-label{display:block;font-size:13px;font-weight:500;color:var(--g600);margin-bottom:6px}
        .zp-input{width:100%;padding:11px 14px;border:1.5px solid var(--g200);border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;background:var(--white);color:var(--navy);outline:none;transition:border-color .2s}
        .zp-input:focus{border-color:var(--teal)}
        .zp-input.error{border-color:var(--red)}
        .zp-btn-primary{width:100%;padding:12px;background:var(--teal);color:var(--white);border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;margin-top:1.5rem;transition:background .2s,transform .1s;letter-spacing:.3px}
        .zp-btn-primary:hover:not(:disabled){background:var(--teal-light)}
        .zp-btn-primary:active:not(:disabled){transform:scale(.98)}
        .zp-btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .zp-erro{background:var(--red-l);border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--red);margin-top:1rem;display:flex;align-items:center;gap:8px}
        .zp-footer-bar{height:12px;background:linear-gradient(90deg,var(--navy) 0%,var(--teal) 50%,var(--green) 100%)}
        @media(max-width:768px){.zp-hero{grid-template-columns:1fr}.zp-hero-left{display:none}.zp-hero-right{min-height:calc(100vh - 76px)}}
      `}</style>

      <header className="zp-header">
        <div className="zp-logo-box">📱</div>
        <div className="zp-brand">
          <span className="top">ZERO</span>
          <span className="bot">PAPER</span>
        </div>
      </header>

      <div className="zp-hero">
        <div className="zp-hero-left">
          <div className="zp-hero-bg" />
          <div className="zp-hero-tagline">
            <p>"Eliminar completamente o uso de papel no controle de vendas e finanças da sua empresa, transformando processos manuais em fluxos digitais eficientes."</p>
          </div>
        </div>

        <div className="zp-hero-right">
          <div className="zp-card">
            <p className="zp-card-title">Acesse com seu login e senha</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="zp-field">
                <label className="zp-label" htmlFor="login">Login</label>
                <input
                  id="login" type="text"
                  className={`zp-input${erro ? " error" : ""}`}
                  placeholder="seu.login"
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  autoComplete="username"
                />
              </div>

              <div className="zp-field">
                <label className="zp-label" htmlFor="senha">Senha</label>
                <input
                  id="senha" type="password"
                  className={`zp-input${erro ? " error" : ""}`}
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  autoComplete="current-password"
                />
              </div>

              {erro && (
                <div className="zp-erro">
                  <span>⚠️</span><span>{erro}</span>
                </div>
              )}

              <button type="submit" className="zp-btn-primary" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="zp-footer-bar" />
    </div>
  );
}
