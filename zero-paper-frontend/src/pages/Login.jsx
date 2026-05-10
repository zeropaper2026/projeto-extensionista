import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function Login({ onSuccess }) {
  const [form, setForm] = useState({ login: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    // ✅ CORREÇÃO 1: Validação de campos vazios antes de chamar a API
    // Bug original: o fetch era feito sem verificar campos, causando erro 400 
    // sem mensagem amigável ao usuário.
    if (!form.login.trim() || !form.senha.trim()) {
      setErro("Preencha login e senha para continuar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.login.trim(), senha: form.senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        // ✅ CORREÇÃO 2: O backend retorna { erro: "..." } mas o frontend original 
        // tentava ler data.message (undefined), mostrando mensagem em branco.
        // Agora lê data.erro corretamente, conforme o padrão do backend.
        setErro(data.erro || "Erro ao fazer login. Tente novamente.");
        return;
      }

      // Persiste token no localStorage para sessão persistente
      localStorage.setItem("zp_token", data.token);
      localStorage.setItem("zp_funcionario", JSON.stringify(data.funcionario));

      onSuccess(data);
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zp-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #0d2340;
          --teal: #1a7a6e;
          --teal-light: #22a090;
          --green: #2e7d52;
          --green-bright: #3da66e;
          --white: #ffffff;
          --gray-50: #f8fafc;
          --gray-100: #f1f5f9;
          --gray-200: #e2e8f0;
          --gray-400: #94a3b8;
          --gray-600: #475569;
          --red: #dc2626;
          --red-light: #fef2f2;
        }

        .zp-login-root {
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          background: var(--white);
          overflow-x: hidden;
        }

        /* ── HEADER ── */
        .zp-header {
          background: var(--navy);
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .zp-logo-box {
          width: 44px; height: 44px;
          background: var(--teal);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .zp-brand { color: var(--white); font-family: 'Sora', sans-serif; }
        .zp-brand span { display: block; }
        .zp-brand .top { font-size: 10px; font-weight: 300; letter-spacing: 3px; opacity: 0.7; text-transform: uppercase; }
        .zp-brand .bot { font-size: 18px; font-weight: 700; line-height: 1; }
        .zp-nav-btn {
          margin-left: 1.5rem;
          background: rgba(255,255,255,0.08);
          border: none; color: var(--white);
          padding: 6px 18px; border-radius: 20px;
          font-size: 13px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── HERO ── */
        .zp-hero {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 420px;
          min-height: calc(100vh - 64px - 12px);
          position: relative;
          overflow: hidden;
        }

        /* left panel – background photo */
        .zp-hero-left {
          position: relative;
          background: linear-gradient(135deg, #e8f4f1 0%, #d4eae5 50%, #c8e0d8 100%);
          overflow: hidden;
        }
        .zp-hero-bg-pattern {
          position: absolute; inset: 0;
          opacity: 0.08;
          background-image: repeating-linear-gradient(
            45deg,
            var(--teal) 0px, var(--teal) 1px,
            transparent 1px, transparent 60px
          );
        }
        .zp-hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          mix-blend-mode: multiply;
          opacity: 0.6;
        }
        .zp-hero-tagline {
          position: absolute;
          bottom: 3rem; left: 2.5rem; right: 2.5rem;
          background: rgba(13, 35, 64, 0.75);
          backdrop-filter: blur(8px);
          padding: 1.5rem 2rem;
          border-radius: 12px;
          border-left: 4px solid var(--teal-light);
        }
        .zp-hero-tagline p {
          color: var(--white);
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 300;
          line-height: 1.6;
          font-style: italic;
        }

        /* right panel – form */
        .zp-hero-right {
          background: var(--gray-50);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2.5rem;
        }
        .zp-card {
          width: 100%;
          max-width: 360px;
        }
        .zp-card-title {
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--gray-600);
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .zp-field { margin-bottom: 1.2rem; }
        .zp-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-600);
          margin-bottom: 6px;
        }
        .zp-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid var(--gray-200);
          border-radius: 8px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          background: var(--white);
          color: var(--navy);
          outline: none;
          transition: border-color 0.2s;
        }
        .zp-input:focus { border-color: var(--teal); }
        .zp-input.error { border-color: var(--red); }

        .zp-forgot {
          display: block;
          text-align: right;
          font-size: 13px;
          color: var(--teal);
          text-decoration: none;
          margin-top: 6px;
          cursor: pointer;
          background: none; border: none; font-family: inherit;
        }
        .zp-forgot:hover { text-decoration: underline; }

        .zp-btn-primary {
          width: 100%;
          padding: 12px;
          background: var(--teal);
          color: var(--white);
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          margin-top: 1.5rem;
          transition: background 0.2s, transform 0.1s;
          letter-spacing: 0.3px;
        }
        .zp-btn-primary:hover:not(:disabled) { background: var(--teal-light); }
        .zp-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .zp-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .zp-erro {
          background: var(--red-light);
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--red);
          margin-top: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── FOOTER BAR ── */
        .zp-footer-bar {
          height: 12px;
          background: linear-gradient(90deg, var(--navy) 0%, var(--teal) 50%, var(--green) 100%);
        }

        /* Tile repeating header text */
        .zp-watermark {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 1rem 2rem;
          display: flex; gap: 3rem; flex-wrap: wrap;
          pointer-events: none;
        }
        .zp-watermark span {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 32px;
          color: rgba(26,122,110,0.1);
          letter-spacing: 2px;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .zp-hero { grid-template-columns: 1fr; }
          .zp-hero-left { display: none; }
          .zp-hero-right { min-height: calc(100vh - 76px); }
        }
      `}</style>

      {/* Header */}
      <header className="zp-header">
        <div className="zp-logo-box">📱</div>
        <div className="zp-brand">
          <span className="top">ZERO</span>
          <span className="bot">PAPER</span>
        </div>
        <button className="zp-nav-btn">inicio</button>
      </header>

      {/* Hero */}
      <div className="zp-hero">
        {/* Left – decorative */}
        <div className="zp-hero-left">
          <div className="zp-watermark">
            {Array(6).fill(0).map((_, i) => (
              <span key={i}>ZERO PAPER</span>
            ))}
          </div>
          <div className="zp-hero-bg-pattern" />
          {/* Fallback to gradient image of person working */}
          <div style={{
            position:"absolute", inset:0,
            background:"url('https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80') center/cover",
            opacity:0.55
          }} />
          <div className="zp-hero-tagline">
            <p>"Eliminar completamente o uso de papel no controle de vendas e finanças da sua empresa, transformando processos manuais em fluxos digitais eficientes, seguros e em tempo real."</p>
          </div>
        </div>

        {/* Right – login form */}
        <div className="zp-hero-right">
          <div className="zp-card">
            <p className="zp-card-title">Acesse com email e senha para entrar</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="zp-field">
                <label className="zp-label" htmlFor="login">Digite seu e-mail</label>
                <input
                  id="login"
                  type="text"
                  className={`zp-input ${erro ? "error" : ""}`}
                  placeholder="seuemail@exemplo.com"
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  autoComplete="username"
                />
              </div>

              <div className="zp-field">
                <label className="zp-label" htmlFor="senha">Digite sua senha</label>
                <input
                  id="senha"
                  type="password"
                  className={`zp-input ${erro ? "error" : ""}`}
                  placeholder="••••••••••••"
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  autoComplete="current-password"
                />
                <button type="button" className="zp-forgot">Esqueci minha senha</button>
              </div>

              {erro && (
                <div className="zp-erro">
                  <span>⚠️</span>
                  <span>{erro}</span>
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
