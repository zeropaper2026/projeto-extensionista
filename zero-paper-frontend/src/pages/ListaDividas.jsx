// src/pages/ListaDividas.jsx
// Zero Paper – Tela de Visualização de Dívidas do Cliente (T15)
// Stack: React 18 + Tailwind CSS 3 + React Router v6
// Integra com: GET /dividas/:clienteId

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { formatBRL } from "../utils/currency";
import { formatDateBR } from "../utils/date";
import { STATUS_DIVIDA, STATUS_PARCELA } from "../constants/status";

function StatusBadge({ status, map }) {
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function CardDivida({ divida }) {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  const pagas    = divida.parcelas?.filter((p) => p.status === "paga").length ?? 0;
  const total    = divida.parcelas_total;
  const progresso = total > 0 ? Math.round((pagas / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setAberto(!aberto)}
        role="button"
        aria-expanded={aberto}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">{divida.descricao_produto}</span>
            <StatusBadge status={divida.status} map={STATUS_DIVIDA} />
          </div>
          {divida.imei && <p className="text-xs text-gray-400 mt-0.5">IMEI: {divida.imei}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-base font-bold text-gray-900">{formatBRL(divida.valor_total)}</span>
            <span className="text-xs text-gray-400">{pagas}/{total} parcelas pagas · Reg.: {formatDateBR(new Date(divida.data_registro))}</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
        <span className="text-gray-400 text-lg mt-1">{aberto ? "▲" : "▼"}</span>
      </div>
      {aberto && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <ul className="divide-y divide-gray-50 mt-2">
            {(divida.parcelas ?? []).map((p) => (
              <li key={p.id_parcela} className="flex items-center gap-3 py-2.5">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500 shrink-0">
                  {p.numero}
                </span>
                <span className="flex-1 text-sm text-gray-700">{formatBRL(p.valor_parcela)}</span>
                <span className="text-xs text-gray-400">
                  Venc.: {formatDateBR(new Date(p.data_vencimento))}
                </span>
                <StatusBadge status={p.status} map={STATUS_PARCELA} />
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              if (divida.id_divida) {
                navigate(`/dividas/${divida.id_divida}/pagar`);
              }
            }}
            className="mt-3 w-full h-9 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Registrar pagamento
          </button>
        </div>
      )}
    </div>
  );
}

export default function ListaDividas() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);
  const [dividas, setDividas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregar() {
      if (!clienteId) {
        setErro("ID do cliente não informado.");
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get(`/clientes/${clienteId}`);
        setCliente(data);
        setDividas(data.dividas ?? []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        let msg = "Não foi possível carregar as dívidas.";
        if (err.code === "ERR_NETWORK") msg = "Erro de rede: backend offline.";
        else if (err.response?.status === 404) msg = "Cliente não encontrado.";
        else if (err.response?.data?.erro) msg = err.response.data.erro;
        setErro(msg);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [clienteId]);

  // 🔁 CORREÇÃO: calcula totais com base nas parcelas (saldo devedor e total pago)
  let totalEmAberto = 0;
  let totalQuitado = 0;

  for (const divida of dividas) {
    for (const parcela of (divida.parcelas ?? [])) {
      const valorParcela = Number(parcela.valor_parcela);
      const pagoAcumulado = Number(parcela.valor_pago_acumulado || 0);
      totalQuitado += pagoAcumulado;
      totalEmAberto += (valorParcela - pagoAcumulado);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando dívidas…</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-3">{erro}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 h-9 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-200">←</button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{cliente?.nome ?? "Cliente"}</h1>
            <p className="text-sm text-gray-500">CPF: {cliente?.cpf ?? "---"}</p>
          </div>
          <Link to="/dividas/nova" className="px-4 h-9 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
            + Nova dívida
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total em aberto</p>
            <p className="text-base font-bold text-red-600 mt-0.5">{formatBRL(totalEmAberto)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total quitado</p>
            <p className="text-base font-bold text-green-600 mt-0.5">{formatBRL(totalQuitado)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Dívidas</p>
            <p className="text-base font-bold text-gray-800 mt-0.5">{dividas.length}</p>
          </div>
        </div>

        {dividas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-gray-500">Nenhuma dívida registrada</p>
            <p className="text-sm mt-1">Clique em "+ Nova dívida" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dividas.map((d) => <CardDivida key={d.id_divida} divida={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}