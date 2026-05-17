// src/components/Layout.jsx
// Zero Paper – Layout global com navbar e guard de autenticação
// Usado por todas as rotas protegidas

import { Navigate, useNavigate } from "react-router-dom";
import { useAuth }   from "../contexts/AuthContext";

export default function Layout({ children }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // Guard: redireciona para /login se não autenticado
  if (!auth) return <Navigate to="/login" replace />;

  return (
    <div className="zp-layout">
      {/* Navbar global */}
      <nav className="zp-navbar">
        <div className="zp-navbar-brand">
          <div className="zp-brand-icon">📱</div>
          <div>
            <span className="zp-brand-sub">ZERO</span>
            <span className="zp-brand-name">PAPER</span>
          </div>
          <button className="zp-navbar-btn zp-home-btn" onClick={() => navigate("/clientes")}>
            🏠 Início
          </button>
        </div>

        <div className="zp-navbar-right">
          <span className="zp-navbar-user">
            Olá, {auth.funcionario?.nome?.split(" ")[0]}
          </span>
          <button className="zp-navbar-btn" onClick={logout}>
            Sair
          </button>
        </div>
      </nav>

      {/* Conteúdo da página — sem padding aqui, cada página gerencia o seu */}
      <main className="zp-layout-main">
        {children}
      </main>

      {/* Rodapé decorativo */}
      <div className="zp-footer-bar" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#0d2340;--teal:#1a7a6e;--teal-h:#22a090;
          --white:#fff;--g50:#f8fafc;--g200:#e2e8f0;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--g50)}
        .zp-layout{min-height:100vh;display:flex;flex-direction:column}
        .zp-navbar{
          background:var(--navy);height:64px;display:flex;align-items:center;
          justify-content:space-between;padding:0 2rem;flex-shrink:0;
        }
        .zp-navbar-brand{display:flex;align-items:center;gap:.75rem}
        .zp-brand-icon{
          width:38px;height:38px;background:var(--teal);border-radius:7px;
          display:flex;align-items:center;justify-content:center;font-size:18px;
        }
        .zp-brand-sub{display:block;font-size:9px;font-weight:400;letter-spacing:3px;color:rgba(255,255,255,.55);text-transform:uppercase;font-family:'Sora',sans-serif}
        .zp-brand-name{display:block;font-size:16px;font-weight:700;color:#fff;line-height:1;font-family:'Sora',sans-serif}
        .zp-navbar-right{display:flex;align-items:center;gap:1rem}
        .zp-navbar-user{font-size:13px;color:rgba(255,255,255,.7)}
        .zp-navbar-btn{
          background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.75);
          padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;
          font-family:'DM Sans',sans-serif;transition:.15s;
        }
        .zp-navbar-btn:hover{background:rgba(255,255,255,.18);color:#fff}
        .zp-home-btn{margin-left:.5rem}
        .zp-layout-main{flex:1}
        .zp-footer-bar{height:12px;background:linear-gradient(90deg,var(--navy) 0%,var(--teal) 50%,#2e7d52 100%);flex-shrink:0}
      `}</style>
    </div>
  );
}
