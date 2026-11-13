// src/pages/ListaDividas.jsx
// Zero Paper – Tela de Visualização de Dívidas do Cliente (T15)
// Stack: React 18 + Tailwind CSS 3 + React Router v6
// Integra com: GET /dividas/:clienteId
//
// 🔥 Incremento (A12):
//   - Botão "Editar" ao lado de "+ Nova dívida" → /clientes/:id/editar
//   - Card "Em atraso" no resumo + faixa de alerta quando há atraso
//   - Dias de atraso por parcela (usa p.dias_atraso do backend)
//
// 🔥 Incremento (estorno):
//   - Histórico de pagamentos por parcela (usa p.pagamentos)
//   - Modal de estorno com motivo obrigatório (admin)
//   - Badge "Estornado" para pagamentos revertidos
//   - Botão "Editar dívida" para admin
//   - carregar() extraído como função reutilizável para recarregar após estorno
//
// 🔥 Incremento (PDF):
//   - Botão "Gerar PDF" no CardDivida (sempre visível no card aberto)
//   - Chama GET /dividas/:id/pdf via services/pdf.js

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { formatBRL } from "../utils/currency";
import { formatDateUTC } from "../utils/date";
import { FORMAS_PAGAMENTO } from "../constants/formaPagamento";
import { STATUS_DIVIDA, STATUS_PARCELA } from "../constants/status";
import { useAuth } from "../contexts/AuthContext";
import { baixarPdfDivida, mensagemErroPdf } from "../services/pdf"; // NOVO

// S4 — regra de estorno visível em cada pagamento
const DICA_ESTORNO = "Estorno: somente administrador ou funcionário autorizado";

// Rótulos curtos usados no histórico de pagamentos
const FORMA_LABEL = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };

function StatusBadge({ status, map }) {
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function CardDivida({ divida, isAdmin, podeEstornar, onChanged }) {
  const [aberto, setAberto] = useState(false);
  const [alvo, setAlvo] = useState(null); // pagamento a estornar
  const [motivo, setMotivo] = useState("");
  const [erroEstorno, setErroEstorno] = useState("");
  const [estornando, setEstornando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false); // NOVO
  const navigate = useNavigate();

  const avista = divida.tipo_venda === "avista";
  const parcelas = divida.parcelas ?? [];
  const pagas = parcelas.filter((p) => p.status === "paga").length;
  const total = divida.parcelas_total;
  const progresso = total > 0 ? Math.round((pagas / total) * 100) : 0;
  const totalPago = parcelas.reduce((a, p) => a + Number(p.valor_pago_acumulado || 0), 0);
  const saldo = Math.max(Number(divida.valor_total) - totalPago, 0);
  const formaLabel = FORMAS_PAGAMENTO.find((f) => f.value === divida.forma_pagamento)?.label;

  // NOVO: gera e baixa o PDF da dívida
  async function gerarPdf() {
    setGerandoPdf(true);
    try {
      await baixarPdfDivida(divida.id_divida);
    } catch (err) {
      alert(await mensagemErroPdf(err));
    } finally {
      setGerandoPdf(false);
    }
  }

  async function confirmarEstorno() {
    if (motivo.trim().length < 5) {
      setErroEstorno("Informe o motivo (mínimo de 5 caracteres).");
      return;
    }
    setEstornando(true);
    setErroEstorno("");
    try {
      await api.post(`/pagamentos/${alvo.id_pagamento}/estornar`, { motivo: motivo.trim() });
      setAlvo(null);
      setMotivo("");
      onChanged?.();
    } catch (err) {
      setErroEstorno(err.response?.data?.erro || "Erro ao estornar pagamento.");
    } finally {
      setEstornando(false);
    }
  }

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
            {avista && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-bios-primary-50 text-bios-primary-700 border-bios-primary-200">
                À vista
              </span>
            )}
            <StatusBadge status={divida.status} map={STATUS_DIVIDA} />
          </div>
          {divida.imei && <p className="text-xs text-gray-400 mt-0.5">IMEI: {divida.imei}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-base font-bold text-gray-900">{formatBRL(divida.valor_total)}</span>
            {avista ? (
              <span className="text-xs text-gray-400">
                {formaLabel ? `${formaLabel} · ` : ""}Compra: {formatDateUTC(divida.data_registro)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">
                {pagas}/{total} parcelas pagas · Pago: {formatBRL(totalPago)} · Saldo: {formatBRL(saldo)} · Reg.: {formatDateUTC(divida.data_registro)}
              </span>
            )}
          </div>
          {!avista && (
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
              <div className="h-full bg-bios-primary-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
          )}
        </div>
        <span className="text-gray-400 text-lg mt-1">{aberto ? "▲" : "▼"}</span>
      </div>

      {aberto && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <ul className="divide-y divide-gray-50 mt-2">
            {parcelas.map((p) => {
              const pago = Number(p.valor_pago_acumulado || 0);
              const restante = Math.max(Number(p.valor_parcela) - pago, 0);
              return (
                <li key={p.id_parcela} className="py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500 shrink-0">
                      {p.numero}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">{formatBRL(p.valor_parcela)}</span>
                    <span className="text-xs text-gray-400">
                      {avista ? "Compra" : "Venc."}: {formatDateUTC(p.data_vencimento)}
                    </span>
                    {/* A12 — dias em atraso por parcela */}
                    {p.dias_atraso > 0 && (
                      <span className="text-xs font-medium text-red-600">
                        {p.dias_atraso} dia{p.dias_atraso !== 1 ? "s" : ""} em atraso
                      </span>
                    )}
                    <StatusBadge status={p.status} map={STATUS_PARCELA} />
                  </div>

                  {!avista && pago > 0 && p.status !== "paga" && (
                    <p className="text-xs text-purple-600 mt-1 ml-9">
                      Pago: {formatBRL(pago)} · Restante: {formatBRL(restante)}
                    </p>
                  )}

                  {/* Histórico de pagamentos da parcela */}
                  {(p.pagamentos ?? []).length > 0 && (
                    <ul className="mt-1 ml-9 space-y-1">
                      {p.pagamentos.map((pg) => (
                        <li key={pg.id_pagamento} className="flex items-center gap-2 text-xs">
                          <span className={pg.estornado ? "line-through text-gray-400" : "text-gray-600"}>
                            {formatDateUTC(pg.data_pagamento)} · {formatBRL(pg.valor_pago)} ·{" "}
                            {FORMA_LABEL[pg.forma_pagamento] ?? pg.forma_pagamento}
                            {pg.observacao ? ` · ${pg.observacao}` : ""}
                          </span>
                          {pg.estornado ? (
                            <span
                              className="px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 text-xs"
                              title={pg.motivo_estorno ?? ""}
                            >
                              Estornado
                            </span>
                          ) : podeEstornar ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAlvo(pg);
                                setMotivo("");
                                setErroEstorno("");
                              }}
                              className="text-red-600 hover:underline text-xs"
                              title={DICA_ESTORNO}
                            >
                              Estornar
                            </button>
                          ) : (
                            // S4: deixa claro quem pode estornar
                            <span className="text-[11px] text-gray-400" title={DICA_ESTORNO}>
                              {DICA_ESTORNO}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex gap-2">
            {!avista && divida.status !== "quitada" && (
              <button
                onClick={() => divida.id_divida && navigate(`/dividas/${divida.id_divida}/pagar`)}
                className="flex-1 h-9 rounded-xl bg-bios-primary-600 text-white text-sm font-medium hover:bg-bios-primary-700"
              >
                Registrar pagamento
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate(`/dividas/${divida.id_divida}/editar`)}
                className="px-4 h-9 rounded-xl border border-bios-primary-600 text-bios-primary-700 text-sm font-medium hover:bg-bios-primary-50"
              >
                Editar
              </button>
            )}
          </div>

          {/* NOVO: Gerar PDF — sempre visível no card aberto */}
          <button
            type="button"
            onClick={gerarPdf}
            disabled={gerandoPdf}
            className="mt-3 w-full h-9 rounded-xl border border-bios-primary-600 text-bios-primary-700 text-sm font-medium hover:bg-bios-primary-50 disabled:opacity-50"
          >
            {gerandoPdf ? "Gerando PDF…" : "Gerar PDF"}
          </button>
        </div>
      )}

      {/* Modal de estorno */}
      {alvo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-900">Estornar pagamento</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatBRL(alvo.valor_pago)} em {formatDateUTC(alvo.data_pagamento)}. A parcela será recalculada
              {divida.status === "quitada" ? " e a dívida será reaberta" : ""}.
            </p>
            <label className="block text-sm text-gray-600 mt-3 mb-1" htmlFor="motivo">
              Motivo do estorno *
            </label>
            <textarea
              id="motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-bios-primary-500 resize-none"
              placeholder="Ex.: valor lançado na parcela errada"
            />
            {erroEstorno && <p className="text-xs text-red-500 mt-1">{erroEstorno}</p>}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setAlvo(null)}
                disabled={estornando}
                className="px-4 h-9 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEstorno}
                disabled={estornando}
                className="px-4 h-9 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {estornando ? "Estornando…" : "Confirmar estorno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListaDividas() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isAdmin = auth?.funcionario?.papel === "admin";
  // Admin sempre pode; atendente só se autorizado nas Configurações (o servidor confere no banco)
  const podeEstornar = isAdmin || auth?.funcionario?.pode_estornar === true;

  const [cliente, setCliente] = useState(null);
  const [dividas, setDividas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

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
      let msg = "Não foi possível carregar as dívidas.";
      if (err.code === "ERR_NETWORK") msg = "Erro de rede: backend offline.";
      else if (err.response?.status === 404) msg = "Cliente não encontrado.";
      else if (err.response?.data?.erro) msg = err.response.data.erro;
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // 🔁 CORREÇÃO: calcula totais com base nas parcelas (saldo devedor e total pago)
  let totalEmAberto = 0;
  let totalQuitado = 0;

  for (const divida of dividas) {
    for (const parcela of divida.parcelas ?? []) {
      const valorParcela = Number(parcela.valor_parcela);
      const pagoAcumulado = Number(parcela.valor_pago_acumulado || 0);
      totalQuitado += pagoAcumulado;
      totalEmAberto += valorParcela - pagoAcumulado;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-bios-primary-500 border-t-transparent rounded-full animate-spin" />
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
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-200">
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{cliente?.nome ?? "Cliente"}</h1>
            <p className="text-sm text-gray-500">CPF: {cliente?.cpf ?? "---"}</p>
          </div>

          {/* A12 — botão Editar cliente */}
          <Link
            to={`/clientes/${clienteId}/editar`}
            className="px-4 h-9 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 flex items-center"
          >
            Editar
          </Link>

          <Link
            to="/dividas/nova"
            state={{
              cliente: {
                id_cliente: cliente?.id_cliente,
                nome: cliente?.nome,
                cpf: cliente?.cpf,
                telefone: cliente?.telefone,
              },
            }}
            className="px-4 h-9 rounded-xl bg-bios-primary-600 text-white text-sm font-medium hover:bg-bios-primary-700 flex items-center gap-1"
          >
            + Nova dívida
          </Link>
        </div>

        {/* A12 — faixa de alerta quando há atraso */}
        {Number(cliente?.resumo?.totalEmAtraso) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            Cliente com pagamento em atraso: {formatBRL(cliente.resumo.totalEmAtraso)} (maior atraso:{" "}
            {cliente.resumo.maiorAtrasoDias} dia(s)).
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total em aberto</p>
            <p className="text-base font-bold text-red-600 mt-0.5">{formatBRL(totalEmAberto)}</p>
          </div>
          {/* A12 — card "Em atraso" */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Em atraso</p>
            <p className="text-base font-bold text-red-600 mt-0.5">
              {formatBRL(cliente?.resumo?.totalEmAtraso ?? 0)}
            </p>
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
            {dividas.map((d) => (
              <CardDivida key={d.id_divida} divida={d} isAdmin={isAdmin} podeEstornar={podeEstornar} onChanged={carregar} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}