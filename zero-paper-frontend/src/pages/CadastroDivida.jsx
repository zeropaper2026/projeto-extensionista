// src/pages/CadastroDivida.jsx
// Zero Paper – Tela de Criação de Dívida (T14)
// Stack: React 18 + Tailwind CSS 3 + React Router v6
// Integra com: POST /dividas  |  GET /clientes?q=...
// Banco: tabelas divida + parcela (ver BANCO_DE_DADOS_ZERO_PAPER.txt)

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";           // axios instance com Bearer JWT
import { formatBRL, parseBRL } from "../utils/currency";
import { addMonths, formatDateBR, toISODate } from "../utils/date";

// ─── constantes alinhadas com os ENUMs do banco ────────────────────────────
const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro",  icon: "💵" },
  { value: "pix",      label: "Pix",       icon: "📱" },
  { value: "debito",   label: "Débito",    icon: "💳" },
  { value: "credito",  label: "Crédito",   icon: "🏦" },
];

// ─── componente principal ──────────────────────────────────────────────────
export default function CadastroDivida() {
  const navigate = useNavigate();

  // ── estado do formulário ─────────────────────────────────────────────────
  const [clienteQuery, setClienteQuery]     = useState("");
  const [clienteSugestoes, setClienteSugestoes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [loadingCliente, setLoadingCliente] = useState(false);

  const [produto, setProduto]           = useState("");
  const [imei, setImei]                 = useState("");
  const [infoAdicionais, setInfoAdicionais] = useState("");

  const [valorTotal, setValorTotal]     = useState("");
  const [numParcelas, setNumParcelas]   = useState("");
  const [dataPrimeira, setDataPrimeira] = useState(toISODate(new Date()));
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");

  const [erros, setErros]               = useState({});
  const [salvando, setSalvando]         = useState(false);
  const [toast, setToast]               = useState(null);

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── fechar dropdown ao clicar fora ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setClienteSugestoes([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── busca de clientes com debounce ───────────────────────────────────────
  useEffect(() => {
    if (clienteQuery.length < 2) {
      setClienteSugestoes([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingCliente(true);
      try {
        const { data } = await api.get(`/clientes?q=${encodeURIComponent(clienteQuery)}`);
        setClienteSugestoes(data.slice(0, 6));
      } catch {
        setClienteSugestoes([]);
      } finally {
        setLoadingCliente(false);
      }
    }, 350);
  }, [clienteQuery]);

  // ── parcelas calculadas (preview) ────────────────────────────────────────
  const parcelas = (() => {
    const valor = parseFloat(valorTotal.replace(",", "."));
    const n     = parseInt(numParcelas, 10);
    if (!valor || valor <= 0 || !n || n < 1 || !dataPrimeira) return [];
    const valorParc = +(valor / n).toFixed(2);
    const ajuste    = +(valor - valorParc * n).toFixed(2); // centavos de arredondamento
    return Array.from({ length: n }, (_, i) => ({
      numero:          i + 1,
      valor_parcela:   i === n - 1 ? +(valorParc + ajuste).toFixed(2) : valorParc,
      data_vencimento: formatDateBR(addMonths(new Date(dataPrimeira + "T00:00:00"), i)),
      status:          "pendente",
    }));
  })();

  // ── validação ─────────────────────────────────────────────────────────────
  function validar() {
    const e = {};
    if (!clienteSelecionado)               e.cliente    = "Selecione um cliente.";
    if (!produto.trim())                   e.produto    = "Descrição obrigatória.";
    const v = parseFloat(valorTotal.replace(",", "."));
    if (!v || v <= 0)                      e.valorTotal = "Informe um valor maior que zero.";
    const p = parseInt(numParcelas, 10);
    if (!p || p < 1 || p > 60)            e.numParcelas = "Informe entre 1 e 60 parcelas.";
    if (!dataPrimeira)                     e.dataPrimeira = "Informe a data da 1ª parcela.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      const payload = {
        id_cliente:             clienteSelecionado.id_cliente,
        descricao_produto:      produto.trim(),
        imei:                   imei.trim() || null,
        informacoes_adicionais: infoAdicionais.trim() || null,
        valor_total:            parseFloat(valorTotal.replace(",", ".")),
        parcelas_total:         parseInt(numParcelas, 10),
        data_registro:          toISODate(new Date()),
        data_primeira_parcela:  dataPrimeira,
        // status default = 'ativa' (definido no banco)
      };

      const { data } = await api.post("/dividas", payload);
      mostrarToast(`Dívida #${data.id_divida} registrada com sucesso!`, "sucesso");
      setTimeout(() => navigate(`/dividas/${clienteSelecionado.id_cliente}`), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Erro ao registrar dívida. Tente novamente.";
      mostrarToast(msg, "erro");
    } finally {
      setSalvando(false);
    }
  }

  function mostrarToast(msg, tipo = "sucesso") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  function limparForm() {
    setClienteQuery("");
    setClienteSelecionado(null);
    setClienteSugestoes([]);
    setProduto("");
    setImei("");
    setInfoAdicionais("");
    setValorTotal("");
    setNumParcelas("");
    setDataPrimeira(toISODate(new Date()));
    setFormaPagamento("dinheiro");
    setErros({});
  }

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
            ${toast.tipo === "sucesso" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          <span>{toast.tipo === "sucesso" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

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
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Nova dívida</h1>
            <p className="text-sm text-gray-500">Registre uma venda a prazo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* ── Seção: Cliente ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Cliente
            </h2>

            {clienteSelecionado ? (
              /* Badge do cliente selecionado */
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {clienteSelecionado.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 text-sm truncate">
                    {clienteSelecionado.nome}
                  </p>
                  <p className="text-xs text-blue-600">
                    CPF: {clienteSelecionado.cpf} · {clienteSelecionado.telefone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setClienteSelecionado(null); setClienteQuery(""); }}
                  className="text-blue-400 hover:text-blue-700 text-lg leading-none"
                  aria-label="Remover cliente selecionado"
                >
                  ✕
                </button>
              </div>
            ) : (
              /* Campo de busca */
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm text-gray-600 mb-1" htmlFor="clienteInput">
                  Buscar por nome ou CPF <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="clienteInput"
                    type="text"
                    value={clienteQuery}
                    onChange={(e) => setClienteQuery(e.target.value)}
                    placeholder="Ex.: João Silva ou 000.000.000-00"
                    autoComplete="off"
                    className={`w-full h-10 px-3 pr-9 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition
                      ${erros.cliente ? "border-red-400" : "border-gray-300"}`}
                  />
                  {loadingCliente && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-pulse">
                      …
                    </span>
                  )}
                </div>
                {erros.cliente && (
                  <p className="text-xs text-red-500 mt-1">{erros.cliente}</p>
                )}

                {/* Dropdown de sugestões */}
                {clienteSugestoes.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {clienteSugestoes.map((c) => (
                      <li key={c.id_cliente}>
                        <button
                          type="button"
                          onClick={() => {
                            setClienteSelecionado(c);
                            setClienteQuery("");
                            setClienteSugestoes([]);
                            setErros((prev) => ({ ...prev, cliente: undefined }));
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                          <p className="text-xs text-gray-500">CPF: {c.cpf} · {c.telefone}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ── Seção: Produto ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Produto
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Descrição */}
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1" htmlFor="produto">
                  Descrição do produto <span className="text-red-500">*</span>
                </label>
                <input
                  id="produto"
                  type="text"
                  value={produto}
                  onChange={(e) => { setProduto(e.target.value); setErros((p) => ({ ...p, produto: undefined })); }}
                  placeholder="Ex.: iPhone 14 128GB Preto"
                  className={`w-full h-10 px-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition
                    ${erros.produto ? "border-red-400" : "border-gray-300"}`}
                />
                {erros.produto && <p className="text-xs text-red-500 mt-1">{erros.produto}</p>}
              </div>

              {/* IMEI */}
              <div>
                <label className="block text-sm text-gray-600 mb-1" htmlFor="imei">
                  IMEI / Nº de série
                </label>
                <input
                  id="imei"
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Ex.: 353211234567890"
                  maxLength={30}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Informações adicionais */}
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1" htmlFor="infoAdicionais">
                  Informações adicionais
                </label>
                <textarea
                  id="infoAdicionais"
                  value={infoAdicionais}
                  onChange={(e) => setInfoAdicionais(e.target.value)}
                  placeholder="Acessórios, estado do produto, observações..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                />
              </div>
            </div>
          </section>

          {/* ── Seção: Condições Financeiras ───────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Condições financeiras
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Valor total */}
              <div>
                <label className="block text-sm text-gray-600 mb-1" htmlFor="valorTotal">
                  Valor total (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  id="valorTotal"
                  type="text"
                  inputMode="decimal"
                  value={valorTotal}
                  onChange={(e) => { setValorTotal(e.target.value); setErros((p) => ({ ...p, valorTotal: undefined })); }}
                  placeholder="0,00"
                  className={`w-full h-10 px-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition
                    ${erros.valorTotal ? "border-red-400" : "border-gray-300"}`}
                />
                {erros.valorTotal && <p className="text-xs text-red-500 mt-1">{erros.valorTotal}</p>}
              </div>

              {/* Nº parcelas */}
              <div>
                <label className="block text-sm text-gray-600 mb-1" htmlFor="numParcelas">
                  Parcelas <span className="text-red-500">*</span>
                </label>
                <input
                  id="numParcelas"
                  type="number"
                  min={1}
                  max={60}
                  value={numParcelas}
                  onChange={(e) => { setNumParcelas(e.target.value); setErros((p) => ({ ...p, numParcelas: undefined })); }}
                  placeholder="Ex.: 6"
                  className={`w-full h-10 px-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition
                    ${erros.numParcelas ? "border-red-400" : "border-gray-300"}`}
                />
                {erros.numParcelas && <p className="text-xs text-red-500 mt-1">{erros.numParcelas}</p>}
              </div>

              {/* Data 1ª parcela */}
              <div>
                <label className="block text-sm text-gray-600 mb-1" htmlFor="dataPrimeira">
                  1ª parcela em <span className="text-red-500">*</span>
                </label>
                <input
                  id="dataPrimeira"
                  type="date"
                  value={dataPrimeira}
                  onChange={(e) => { setDataPrimeira(e.target.value); setErros((p) => ({ ...p, dataPrimeira: undefined })); }}
                  className={`w-full h-10 px-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition
                    ${erros.dataPrimeira ? "border-red-400" : "border-gray-300"}`}
                />
                {erros.dataPrimeira && <p className="text-xs text-red-500 mt-1">{erros.dataPrimeira}</p>}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Forma de pagamento <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-4 gap-2">
                {FORMAS_PAGAMENTO.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormaPagamento(f.value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all
                      ${formaPagamento === f.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    <span className="text-xl" aria-hidden="true">{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Seção: Prévia das Parcelas ─────────────────────────────── */}
          {parcelas.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Prévia das parcelas
              </h2>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Valor total", val: formatBRL(parseFloat(valorTotal.replace(",", "."))) },
                  { label: "Nº parcelas", val: `${parcelas.length}×` },
                  { label: "Por parcela",  val: formatBRL(parcelas[0]?.valor_parcela) },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                    <p className="text-base font-semibold text-gray-800 mt-0.5">{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Lista de parcelas (máx 6 visíveis) */}
              <ul className="divide-y divide-gray-100">
                {parcelas.slice(0, 6).map((p) => (
                  <li key={p.numero} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                      {p.numero}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {formatBRL(p.valor_parcela)}
                    </span>
                    <span className="text-xs text-gray-400">Venc.: {p.data_vencimento}</span>
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                      {p.status}
                    </span>
                  </li>
                ))}
                {parcelas.length > 6 && (
                  <li className="py-2 text-xs text-gray-400 text-center">
                    + {parcelas.length - 6} parcelas não exibidas
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* ── Botões ────────────────────────────────────────────────── */}
          <div className="flex gap-3 justify-end pt-1 pb-6">
            <button
              type="button"
              onClick={limparForm}
              className="px-5 h-10 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando…
                </>
              ) : (
                "✓ Registrar dívida"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
