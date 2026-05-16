// src/pages/BuscaCliente.jsx
// Zero Paper – Tela de Busca de Clientes (T11)
// Stack: React 18 + Tailwind CSS 3 + React Router v6
// Integra com: GET /clientes?q=...

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function BuscaCliente() {
  const navigate = useNavigate();

  const [query, setQuery]         = useState("");
  const [clientes, setClientes]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [buscou, setBuscou]       = useState(false);
  const [erro, setErro]           = useState(null);

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  // foca o input ao montar
  useEffect(() => { inputRef.current?.focus(); }, []);

  // busca com debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setClientes([]);
      setBuscou(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErro(null);
      try {
        const { data } = await api.get(`/clientes?q=${encodeURIComponent(query.trim())}`);
        setClientes(data);
        setBuscou(true);
      } catch {
        setErro("Erro ao buscar clientes. Verifique a conexão.");
        setClientes([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function inicialNome(nome = "") {
    return nome
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }

  // cores do avatar por inicial (A-Z → 6 opções)
  const AVATAR_CORES = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
    "bg-amber-100 text-amber-800",
    "bg-pink-100 text-pink-800",
    "bg-teal-100 text-teal-800",
  ];
  function corAvatar(nome = "") {
    const code = (nome.charCodeAt(0) || 0) % AVATAR_CORES.length;
    return AVATAR_CORES[code];
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
            aria-label="Voltar"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Buscar cliente</h1>
            <p className="text-sm text-gray-500">Pesquise por nome ou CPF</p>
          </div>
          <Link
            to="/clientes/novo"
            className="px-4 h-9 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"
          >
            + Novo cliente
          </Link>
        </div>

        {/* Campo de busca */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base select-none">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome completo ou CPF (ex.: João Silva, 000.000.000-00)"
            className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setClientes([]); setBuscou(false); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        {/* Estado: loading */}
        {loading && (
          <div className="flex items-center gap-3 text-gray-400 px-1 py-4">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Buscando…</span>
          </div>
        )}

        {/* Estado: erro */}
        {erro && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Estado: nenhum resultado */}
        {buscou && !loading && !erro && clientes.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-3xl mb-3">🔎</p>
            <p className="font-medium text-gray-600">Nenhum cliente encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              Tente outro nome ou CPF, ou{" "}
              <Link to="/clientes/novo" className="text-blue-600 hover:underline">
                cadastre um novo cliente
              </Link>
              .
            </p>
          </div>
        )}

        {/* Estado: instrução inicial */}
        {!buscou && !loading && query.length < 2 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
            <p className="text-3xl mb-3">👤</p>
            <p className="text-sm">Digite ao menos 2 caracteres para buscar</p>
          </div>
        )}

        {/* Lista de resultados */}
        {clientes.length > 0 && !loading && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                {clientes.length} resultado{clientes.length !== 1 ? "s" : ""}
              </span>
            </div>

            <ul className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <li key={c.id_cliente}>
                  <button
                    onClick={() => navigate(`/dividas/${c.id_cliente}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${corAvatar(c.nome)}`}
                    >
                      {inicialNome(c.nome)}
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        CPF: {c.cpf}
                        {c.telefone ? ` · ${c.telefone}` : ""}
                      </p>
                    </div>

                    {/* Ação */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-blue-600 font-medium hidden sm:block">
                        Ver dívidas
                      </span>
                      <span className="text-gray-300 text-lg">›</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
