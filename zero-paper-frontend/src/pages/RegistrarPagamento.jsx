// src/pages/RegistrarPagamento.jsx
// Zero Paper – Tela de Registro de Pagamento de Parcela (T18)
// Stack: React 18 + Tailwind CSS 3 + React Router v6
// Integra com: GET /dividas/:divdaId  |  PATCH /parcelas/:id/pagar
// ENUMs do banco: forma_pagamento, status_parcela, status_divida

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatBRL } from "../utils/currency";
import { formatDateBR } from "../utils/date";
import { FORMAS_PAGAMENTO } from "../constants/formaPagamento";
import { STATUS_PARCELA } from "../constants/status";

function StatusBadge({ status }) {
  const cfg = STATUS_PARCELA[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>;
}

export default function RegistrarPagamento() {
  const { dividaId } = useParams();
  const navigate = useNavigate();

  const [divida, setDivida] = useState(null);
  const [loadingDivida, setLoadingDivida] = useState(true);
  const [erroDivida, setErroDivida] = useState(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!dividaId) {
      setErroDivida("ID da dívida não informado na URL.");
      setLoadingDivida(false);
      return;
    }
    const idNumerico = parseInt(dividaId, 10);
    if (isNaN(idNumerico)) {
      setErroDivida(`ID da dívida inválido: "${dividaId}" não é um número.`);
      setLoadingDivida(false);
      return;
    }

    async function carregar() {
      try {
        const { data } = await api.get(`/dividas/${idNumerico}`);
        setDivida(data);
        const aberta = data.parcelas?.find(p => p.status === "pendente" || p.status === "atrasada" || p.status === "parcial");
        if (aberta) {
          setParcelaSelecionada(aberta);
          const restante = aberta.valor_parcela - (aberta.valor_pago_acumulado ?? 0);
          setValorPago(String(restante > 0 ? restante.toFixed(2) : aberta.valor_parcela));
        }
      } catch (err) {
        console.error("Erro ao carregar dívida:", err);
        let msg = "Não foi possível carregar os dados da dívida.";
        if (err.code === "ERR_NETWORK") msg = "Erro de rede: backend offline.";
        else if (err.response?.status === 404) msg = "Dívida não encontrada.";
        else if (err.response?.data?.erro) msg = err.response.data.erro;
        setErroDivida(msg);
      } finally {
        setLoadingDivida(false);
      }
    }
    carregar();
  }, [dividaId]);

  function selecionarParcela(parcela) {
    setParcelaSelecionada(parcela);
    const valorRestante = parcela.valor_parcela - (parcela.valor_pago_acumulado ?? 0);
    setValorPago(String(valorRestante > 0 ? valorRestante.toFixed(2) : parcela.valor_parcela));
    setErros({});
  }

  function validar() {
    const e = {};
    if (!parcelaSelecionada) e.parcela = "Selecione uma parcela.";
    const v = parseFloat(valorPago.replace(",", "."));
    if (!v || v <= 0) e.valorPago = "Informe um valor maior que zero.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      const payload = {
        valor_pago: parseFloat(valorPago.replace(",", ".")),
        forma_pagamento: formaPagamento,
        observacao: observacao.trim() || null,
      };
      await api.post(`/parcelas/${parcelaSelecionada.id_parcela}/pagar`, payload);

      mostrarToast(`Pagamento de ${formatBRL(parseFloat(valorPago.replace(",", ".")))} registrado!`, "sucesso");

      // ✅ CORREÇÃO: redireciona para a lista de dívidas do cliente (não para a dívida)
      if (divida?.id_cliente) {
        setTimeout(() => {
          navigate(`/dividas/${divida.id_cliente}`, { replace: true });
        }, 2000);
      } else {
        // fallback: volta para a página anterior
        setTimeout(() => navigate(-1), 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.erro || "Erro ao registrar pagamento. Tente novamente.";
      mostrarToast(msg, "erro");
    } finally {
      setSalvando(false);
    }
  }

  function mostrarToast(msg, tipo = "sucesso") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  if (loadingDivida) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando parcelas…</p>
        </div>
      </div>
    );
  }

  if (erroDivida) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-3">{erroDivida}</p>
          <button onClick={() => navigate(-1)} className="px-4 h-9 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700">Voltar</button>
        </div>
      </div>
    );
  }

  const parcelasAbertas = divida?.parcelas?.filter(p => p.status !== "paga") ?? [];
  const parcelasQuitadas = divida?.parcelas?.filter(p => p.status === "paga") ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.tipo === "sucesso" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          <span>{toast.tipo === "sucesso" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-200">←</button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Registrar pagamento</h1>
            <p className="text-sm text-gray-500 truncate">{divida?.descricao_produto} · {formatBRL(divida?.valor_total)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Selecione a parcela</h2>
            {erros.parcela && <p className="text-xs text-red-500 mb-2">{erros.parcela}</p>}
            {parcelasAbertas.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-medium text-gray-500">Todas as parcelas estão quitadas!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {parcelasAbertas.map(p => {
                  const selecionada = parcelaSelecionada?.id_parcela === p.id_parcela;
                  const valorRestante = p.valor_parcela - (p.valor_pago_acumulado ?? 0);
                  return (
                    <li key={p.id_parcela}>
                      <button
                        type="button"
                        onClick={() => selecionarParcela(p)}
                        className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl text-left transition-all ${selecionada ? "bg-blue-50 ring-1 ring-blue-400" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selecionada ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                          {selecionada && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selecionada ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>{p.numero}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{formatBRL(p.valor_parcela)}</span>
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Venc.: {formatDateBR(new Date(p.data_vencimento))}
                            {p.valor_pago_acumulado > 0 && <span className="ml-2 text-purple-600">· Já pago: {formatBRL(p.valor_pago_acumulado)} · Restante: {formatBRL(valorRestante)}</span>}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {parcelasQuitadas.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600">{parcelasQuitadas.length} parcela{parcelasQuitadas.length !== 1 ? "s" : ""} já quitada{parcelasQuitadas.length !== 1 ? "s" : ""}</summary>
                <ul className="mt-2 divide-y divide-gray-100">
                  {parcelasQuitadas.map(p => (
                    <li key={p.id_parcela} className="flex items-center gap-3 py-2 opacity-50">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-green-100 text-green-700">{p.numero}</span>
                      <span className="text-sm text-gray-600">{formatBRL(p.valor_parcela)}</span>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {parcelaSelecionada && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Dados do pagamento</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Valor pago (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorPago}
                    onChange={(e) => { setValorPago(e.target.value); setErros(p => ({ ...p, valorPago: undefined })); }}
                    className={`w-full h-10 px-3 rounded-xl border text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 ${erros.valorPago ? "border-red-400" : "border-gray-300"}`}
                  />
                  {erros.valorPago && <p className="text-xs text-red-500 mt-1">{erros.valorPago}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      const restante = parcelaSelecionada.valor_parcela - (parcelaSelecionada.valor_pago_acumulado ?? 0);
                      setValorPago(String((restante > 0 ? restante : parcelaSelecionada.valor_parcela).toFixed(2)));
                    }}
                    className="text-xs text-blue-500 hover:underline mt-1"
                  >
                    Usar valor da parcela ({formatBRL(parcelaSelecionada.valor_parcela - (parcelaSelecionada.valor_pago_acumulado ?? 0))})
                  </button>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Observação</label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Forma de pagamento *</p>
                <div className="grid grid-cols-4 gap-2">
                  {FORMAS_PAGAMENTO.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormaPagamento(f.value)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${formaPagamento === f.value ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                    >
                      <span className="text-xl">{f.icon}</span>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Você está pagando</p>
                  <p className="text-xl font-bold text-gray-900">{formatBRL(parseFloat(valorPago.replace(",", ".")) || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Parcela</p>
                  <p className="text-sm font-semibold text-gray-600">{parcelaSelecionada.numero}/{divida?.parcelas_total}</p>
                </div>
              </div>
            </section>
          )}

          <div className="flex gap-3 justify-end pt-1 pb-6">
            <button type="button" onClick={() => navigate(-1)} className="px-5 h-10 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={salvando || parcelasAbertas.length === 0} className="px-6 h-10 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              {salvando ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando…</> : "✓ Confirmar pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}