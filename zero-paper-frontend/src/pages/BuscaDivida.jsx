// src/pages/BuscaDivida.jsx
// Zero Paper – Busca de dívida (4.6)
// Integra com: GET /dividas?q=&status=
// Rota sugerida: /dividas/busca

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatBRL } from "../utils/currency";
import { STATUS_DIVIDA } from "../constants/status";

const FILTROS = [
  { value: "",         label: "Todas" },
  { value: "ativa",    label: "Ativas" },
  { value: "atrasada", label: "Atrasadas" },
  { value: "quitada",  label: "Quitadas" },
];

// Datas da API vêm em UTC: formata em UTC para não exibir um dia antes
function dataBR(valor) {
  const d = new Date(valor);
  return isNaN(d) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function BuscaDivida() {
  const navigate = useNavigate();

  const [query, setQuery]       = useState("");
  const [status, setStatus]     = useState("");
  const [dividas, setDividas]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [buscou, setBuscou]     = useState(false);
  const [erro, setErro]         = useState(null);

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const termo = query.trim();
    // busca com 2+ caracteres ou apenas com filtro de status (ex.: todas as atrasadas)
    if (termo.length < 2 && !status) {
      setDividas([]);
      setBuscou(false);
      setErro(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (termo.length >= 2) params.set("q", termo);
        if (status) params.set("status", status);
        const { data } = await api.get(`/dividas?${params.toString()}`);
        setDividas(data);
        setBuscou(true);
      } catch (err) {
        setErro(err.response?.data?.erro || "Erro ao buscar dívidas. Verifique a conexão.");
        setDividas([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, status]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Buscar dívida</h1>
          <p className="text-sm text-gray-500">Pesquise por cliente, CPF, produto ou IMEI</p>
        </div>

        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base select-none">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: Maria, iPhone 14, 353211234567890"
            maxLength={100}
            className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bios-primary-500 focus:border-transparent shadow-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro por status */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                status === f.value
                  ? "bg-bios-primary-600 text-white border-bios-primary-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 px-1 py-4">
            <div className="w-5 h-5 border-2 border-bios-primary-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Buscando…</span>
          </div>
        )}

        {erro && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erro}</div>
        )}

        {buscou && !loading && !erro && dividas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-3xl mb-3">🔎</p>
            <p className="font-medium text-gray-600">Nenhuma dívida encontrada</p>
            <p className="text-sm text-gray-400 mt-1">Tente outro termo ou mude o filtro de status.</p>
          </div>
        )}

        {!buscou && !loading && !erro && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm">Digite ao menos 2 caracteres ou escolha um status</p>
          </div>
        )}

        {dividas.length > 0 && !loading && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium">
                {dividas.length} resultado{dividas.length !== 1 ? "s" : ""}
                {dividas.length === 50 ? " (mostrando os 50 mais recentes — refine a busca)" : ""}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {dividas.map((d) => {
                const cfg = STATUS_DIVIDA[d.status] ?? { label: d.status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <li key={d.id_divida}>
                    <button
                      onClick={() => navigate(`/dividas/${d.id_cliente}`)}
                      className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">{d.descricao_produto}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {d.cliente_nome} · CPF: {d.cliente_cpf}
                        {d.imei ? ` · IMEI: ${d.imei}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">Saldo: {formatBRL(d.saldo)}</span>
                        <span className="text-xs text-gray-400">
                          Total {formatBRL(d.valor_total)} · {d.parcelas_pagas}/{d.parcelas_total} parcelas pagas · Reg.: {dataBR(d.data_registro)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
