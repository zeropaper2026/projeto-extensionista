// src/pages/Relatorios.jsx
// Zero Paper – Relatórios (versão enxuta): recebimentos, vendas e inadimplência
// Integra com: GET /relatorios/recebimentos | /vendas | /inadimplencia  (somente admin)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatBRL } from "../utils/currency";
import { FORMAS_PAGAMENTO } from "../constants/formaPagamento";

const ABAS = [
  { id: "recebimentos", label: "Recebimentos" },
  { id: "vendas", label: "Vendas" },
  { id: "inadimplencia", label: "Inadimplência" },
];

const rotuloForma = (v) => FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? v;

// "2026-11-04" → "04/11/2026" (sem Date: não sofre com fuso)
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

function hojeISO() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000); // Brasília/Tocantins
  return d.toISOString().slice(0, 10);
}

function Card({ rotulo, valor, destaque }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{rotulo}</p>
      <p className={`text-base font-bold mt-0.5 ${destaque ?? "text-gray-900"}`}>{valor}</p>
    </div>
  );
}

function Tabela({ colunas, linhas }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bios-primary-600 text-white text-xs">
            {colunas.map((c) => (
              <th key={c.t} className={`px-3 py-2 font-medium ${c.r ? "text-right" : "text-left"}`}>{c.t}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((l, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {l.map((cel, k) => (
                <td key={k} className={`px-3 py-2 text-gray-700 ${colunas[k].r ? "text-right whitespace-nowrap" : ""}`}>{cel}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Vazio({ texto }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm">{texto}</p>
    </div>
  );
}

// ── Recebimentos ─────────────────────────────────────────────
function Recebimentos({ d }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card rotulo="Total recebido" valor={formatBRL(d.total)} destaque="text-green-600" />
        <Card rotulo="Pagamentos" valor={d.quantidade} />
        {d.porForma.map((f) => (
          <Card key={f.forma} rotulo={rotuloForma(f.forma)} valor={`${formatBRL(f.total)} · ${f.quantidade}`} />
        ))}
      </div>
      {d.itens.length === 0 ? <Vazio texto="Nenhum pagamento no período." /> : (
        <Tabela
          colunas={[{ t: "Data" }, { t: "Cliente" }, { t: "Produto" }, { t: "Parcela" }, { t: "Forma" }, { t: "Valor", r: true }]}
          linhas={d.itens.map((i) => [
            dataBR(i.data),
            <Link key="c" to={`/dividas/${i.id_cliente}`} className="text-bios-primary-600 hover:underline">{i.cliente}</Link>,
            i.produto, i.parcela, rotuloForma(i.forma), formatBRL(i.valor),
          ])}
        />
      )}
    </>
  );
}

// ── Vendas ───────────────────────────────────────────────────
function Vendas({ d }) {
  const bloco = (titulo, g) => (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{titulo} · {g.quantidade}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-gray-500">Valor base</dt><dd className="text-right font-medium">{formatBRL(g.valorBase)}</dd>
        <dt className="text-gray-500">Juros</dt><dd className="text-right font-medium">{formatBRL(g.juros)}</dd>
        <dt className="text-gray-500">Total</dt><dd className="text-right font-bold">{formatBRL(g.total)}</dd>
        <dt className="text-gray-500">Recebido</dt><dd className="text-right font-medium text-green-600">{formatBRL(g.recebido)}</dd>
        <dt className="text-gray-500">Em aberto</dt><dd className="text-right font-medium text-red-600">{formatBRL(g.emAberto)}</dd>
      </dl>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {bloco("Geral", d.geral)}
        {bloco("Parceladas", d.parcelado)}
        {bloco("À vista (histórico)", d.aVista)}
      </div>
      {d.itens.length === 0 ? <Vazio texto="Nenhuma venda no período." /> : (
        <Tabela
          colunas={[{ t: "Data" }, { t: "Cliente" }, { t: "Produto" }, { t: "Tipo" }, { t: "Base", r: true }, { t: "Juros", r: true }, { t: "Total", r: true }, { t: "Em aberto", r: true }]}
          linhas={d.itens.map((i) => [
            dataBR(i.data),
            <Link key="c" to={`/dividas/${i.id_cliente}`} className="text-bios-primary-600 hover:underline">{i.cliente}</Link>,
            i.produto,
            i.tipo === "a_vista" ? "À vista" : `${i.parcelas}x`,
            formatBRL(i.valorBase), formatBRL(i.juros), formatBRL(i.total), formatBRL(i.emAberto),
          ])}
        />
      )}
    </>
  );
}

// ── Inadimplência ────────────────────────────────────────────
function Inadimplencia({ d }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card rotulo="Total em atraso" valor={formatBRL(d.totalEmAtraso)} destaque="text-red-600" />
        <Card rotulo="Clientes" valor={d.clientesEmAtraso} />
        <Card rotulo="Parcelas" valor={d.parcelasEmAtraso} />
      </div>
      <p className="text-xs text-gray-400 mb-2">Situação em {dataBR(d.referencia)} · parcelas vencidas e ainda com saldo.</p>
      {d.clientes.length === 0 ? <Vazio texto="Nenhuma parcela em atraso. 🎉" /> : (
        <div className="space-y-3">
          {d.clientes.map((c) => (
            <div key={c.id_cliente} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Link to={`/dividas/${c.id_cliente}`} className="font-semibold text-bios-primary-700 hover:underline">{c.nome}</Link>
                {c.telefone && <span className="text-xs text-gray-400">{c.telefone}</span>}
                <span className="ml-auto text-sm font-bold text-red-600">{formatBRL(c.totalEmAtraso)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {c.parcelasEmAtraso} parcela{c.parcelasEmAtraso !== 1 ? "s" : ""} · maior atraso: {c.maiorAtrasoDias} dia{c.maiorAtrasoDias !== 1 ? "s" : ""}
              </p>
              <ul className="mt-2 divide-y divide-gray-50 text-sm">
                {c.parcelas.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 py-1.5">
                    <span className="flex-1 text-gray-700 truncate">{p.produto} · parcela {p.parcela}</span>
                    <span className="text-xs text-gray-400">venc. {dataBR(p.vencimento)} · {p.diasEmAtraso}d</span>
                    <span className="font-medium text-gray-800 whitespace-nowrap">{formatBRL(p.restante)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Página ───────────────────────────────────────────────────
export default function Relatorios() {
  const { auth } = useAuth();
  const ehAdmin = auth?.funcionario?.papel === "admin";

  const hoje = hojeISO();
  const [aba, setAba] = useState("recebimentos");
  const [de, setDe] = useState(`${hoje.slice(0, 7)}-01`);
  const [ate, setAte] = useState(hoje);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const usaPeriodo = aba !== "inadimplencia";

  useEffect(() => {
    if (!ehAdmin) return;
    if (usaPeriodo && de > ate) {
      setErro("A data inicial não pode ser maior que a final.");
      return;
    }
    let cancelado = false;
    setLoading(true);
    setErro(null);
    setDados(null);
    const params = usaPeriodo ? { de, ate } : {};
    api.get(`/relatorios/${aba}`, { params })
      .then(({ data }) => { if (!cancelado) setDados({ aba, data }); })
      .catch((err) => {
        if (cancelado) return;
        setErro(err.response?.data?.erro || (err.code === "ERR_NETWORK" ? "Erro de rede: backend offline." : "Erro ao carregar o relatório."));
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [aba, de, ate, ehAdmin, usaPeriodo]);

  if (!ehAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm text-center">
          <p className="text-gray-700 font-medium">Os relatórios são restritos ao administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Visão gerencial de recebimentos, vendas e inadimplência</p>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`px-4 h-9 rounded-xl text-sm font-medium transition-colors ${
                aba === a.id ? "bg-bios-primary-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {usaPeriodo && (
          <div className="flex items-end gap-3 mb-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="rel-de">De</label>
              <input id="rel-de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bios-primary-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="rel-ate">Até</label>
              <input id="rel-ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bios-primary-500" />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 px-1 py-4">
            <div className="w-5 h-5 border-2 border-bios-primary-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        )}

        {erro && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erro}</div>
        )}

        {/* só renderiza se os dados forem da aba atual (evita quebrar ao trocar de aba) */}
        {dados && dados.aba === aba && !loading && !erro && (
          <>
            {aba === "recebimentos" && <Recebimentos d={dados.data} />}
            {aba === "vendas" && <Vendas d={dados.data} />}
            {aba === "inadimplencia" && <Inadimplencia d={dados.data} />}
          </>
        )}
      </div>
    </div>
  );
}
