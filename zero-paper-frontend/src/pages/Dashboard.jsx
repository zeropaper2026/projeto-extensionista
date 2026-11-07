// src/pages/Dashboard.jsx
// Zero Paper – Tela inicial (A14). Os indicadores completos entram em atualização futura.

import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ATALHOS = [
  { to: "/clientes",      titulo: "Buscar cliente", texto: "Encontre um cliente por nome ou CPF e veja as dívidas dele." },
  { to: "/clientes/novo", titulo: "Novo cliente",   texto: "Cadastre o cliente antes de registrar a venda." },
  { to: "/dividas/nova",  titulo: "Nova dívida",    texto: "Registre uma venda a prazo ou à vista." },
  { to: "/dividas/busca", titulo: "Dívidas",        texto: "Localize uma venda por produto, IMEI ou status." },
];

export default function Dashboard() {
  const { auth } = useAuth();
  const nome = auth?.funcionario?.nome?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">Olá, {nome}</h1>
        <p className="text-sm text-gray-500 mt-1">O que você quer fazer agora?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {ATALHOS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-bios-primary-400 hover:bg-bios-primary-50 transition-colors"
            >
              <p className="text-sm font-semibold text-bios-primary-700">{a.titulo}</p>
              <p className="text-xs text-gray-500 mt-1">{a.texto}</p>
            </Link>
          ))}
        </div>

        <section className="mt-6 bg-white rounded-2xl border border-dashed border-bios-primary-300 p-8 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">📊</p>
          <h2 className="text-base font-semibold text-gray-800">Dashboard em breve</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Aqui você vai acompanhar o total em aberto, os recebimentos do mês e as parcelas em atraso.
            Será liberado em uma atualização futura.
          </p>
        </section>
      </div>
    </div>
  );
}
