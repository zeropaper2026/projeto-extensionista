// src/components/Layout.jsx
// Zero Paper – Layout global com navbar e guard de autenticação
// Usado por todas as rotas protegidas
//
// 🔥 Incremento (A1): botão "Nova dívida" adicionado à navbar, permitindo
//    iniciar o cadastro de dívida a partir de qualquer tela do sistema
//    (antes só era possível via BuscaCliente → selecionar cliente → ListaDividas).
//
// 🔥 Incremento (A14): menu com Início (/dashboard), Buscar cliente, Novo cliente,
//    Dívidas, Nova dívida e Configurações (somente admin); menu responsivo (celular).

import { useState } from "react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuth }   from "../contexts/AuthContext";
import biosLogo from "../assets/bios-logo.jpg";

const ITENS_MENU = [
  { to: "/dashboard",     label: "🏠 Início" },
  { to: "/clientes",      label: "🔍 Buscar cliente" },
  { to: "/clientes/novo", label: "👤 Novo cliente" },
  { to: "/dividas/busca", label: "🔎 Dívidas" },
  { to: "/dividas/nova",  label: "➕ Nova dívida" },
  { to: "/configuracoes", label: "⚙️ Configurações", somenteAdmin: true },
];

export default function Layout({ children }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  // Guard: redireciona para /login se não autenticado
  if (!auth) return <Navigate to="/login" replace />;

  const ehAdmin = auth.funcionario?.papel === "admin";
  const itens = ITENS_MENU.filter((i) => !i.somenteAdmin || ehAdmin);

  return (
    <div className="zp-layout">
      {/* Navbar global */}
      <nav className={`zp-navbar${menuAberto ? " open" : ""}`}>
        <button
          type="button"
          className="zp-brand-btn"
          onClick={() => { setMenuAberto(false); navigate("/dashboard"); }}
          aria-label="Ir para o início"
        >
          <img src={biosLogo} alt="BIOS iPhones" className="zp-brand-logo" />
          <span>
            <span className="zp-brand-sub">BIOS</span>
            <span className="zp-brand-name">IPHONES</span>
          </span>
        </button>

        <button
          type="button"
          className="zp-toggle"
          onClick={() => setMenuAberto((v) => !v)}
          aria-expanded={menuAberto}
          aria-label="Abrir menu"
        >
          {menuAberto ? "✕" : "☰"}
        </button>

        <div className="zp-menu">
          {itens.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) => `zp-link${isActive ? " active" : ""}`}
            >
              {i.label}
            </NavLink>
          ))}
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
          --navy:#000000;--teal:#414A85;--teal-h:#50588f;
          --white:#fff;--g50:#f8fafc;--g200:#e2e8f0;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--g50)}
        .zp-layout{min-height:100vh;display:flex;flex-direction:column}
        .zp-navbar{
          background:var(--navy);min-height:64px;display:flex;align-items:center;
          gap:1rem;padding:0 2rem;flex-shrink:0;flex-wrap:wrap;
        }
        .zp-brand-btn{display:flex;align-items:center;gap:.75rem;background:none;border:none;cursor:pointer;text-align:left;padding:0}
        .zp-menu{display:flex;align-items:center;gap:.35rem;flex:1;margin-left:1rem;flex-wrap:wrap}
        .zp-link{color:rgba(255,255,255,.75);text-decoration:none;font-size:13px;padding:7px 14px;border-radius:20px;transition:.15s;white-space:nowrap}
        .zp-link:hover{background:rgba(255,255,255,.14);color:#fff}
        .zp-link.active{background:var(--teal);color:#fff}
        .zp-toggle{display:none;background:rgba(255,255,255,.1);border:none;color:#fff;width:38px;height:38px;border-radius:8px;font-size:18px;cursor:pointer;margin-left:auto}
        .zp-navbar-brand{display:flex;align-items:center;gap:.75rem}
        .zp-brand-icon{
          width:38px;height:38px;background:var(--teal);border-radius:7px;
          display:flex;align-items:center;justify-content:center;font-size:18px;
        }
        .zp-brand-logo{width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0}
        .zp-brand-sub{display:block;font-size:9px;font-weight:400;letter-spacing:3px;color:rgba(255,255,255,.55);text-transform:uppercase;font-family:'Sora',sans-serif}
        .zp-brand-name{display:block;font-size:16px;font-weight:700;color:#fff;line-height:1;font-family:'Sora',sans-serif}
        .zp-navbar-right{display:flex;align-items:center;gap:1rem}
        .zp-navbar-user{font-size:13px;color:rgba(255,255,255,.7)}
        .zp-navbar-btn{
          background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.75);
          padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;
          font-family:'DM Sans',sans-serif;transition:.15s;white-space:nowrap;
        }
        .zp-navbar-btn:hover{background:rgba(255,255,255,.18);color:#fff}
        .zp-home-btn{margin-left:.5rem}
        .zp-nova-divida-btn{background:var(--teal);color:#fff}
        .zp-nova-divida-btn:hover{background:var(--teal-h);color:#fff}
        .zp-layout-main{flex:1}
        .zp-footer-bar{height:12px;background:linear-gradient(90deg,var(--navy) 0%,var(--teal) 100%);flex-shrink:0}
        @media(max-width:900px){
          .zp-navbar{padding:.6rem 1rem}
          .zp-toggle{display:block}
          .zp-menu,.zp-navbar-right{display:none;width:100%;margin:0}
          .zp-navbar.open .zp-menu{display:flex;flex-direction:column;align-items:stretch;gap:.25rem;padding:.5rem 0}
          .zp-navbar.open .zp-link{padding:10px 14px;border-radius:10px}
          .zp-navbar.open .zp-navbar-right{display:flex;justify-content:space-between;padding:.5rem 0 .75rem;border-top:1px solid rgba(255,255,255,.12)}
        }
      `}</style>
    </div>
  );
}
