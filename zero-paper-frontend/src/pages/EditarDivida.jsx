// src/pages/EditarDivida.jsx
// Zero Paper – Edição de dívida (Incremento II · card 4.7)
// Integra com: GET /dividas/:id | PATCH /dividas/:id (admin)

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatBRL } from "../utils/currency";
import { obterTaxaJuros, PARCELAS_MAXIMO } from "../constants/taxasJuros";

export default function EditarDivida() {
    const { dividaId } = useParams();
    const navigate = useNavigate();

    const [divida, setDivida]       = useState(null);
    const [loading, setLoading]     = useState(true);
    const [erroCarga, setErroCarga] = useState(null);
    const [salvando, setSalvando]   = useState(false);
    const [toast, setToast]         = useState(null);
    const [erros, setErros]         = useState({});

    const [produto, setProduto]         = useState("");
    const [imei, setImei]               = useState("");
    const [info, setInfo]               = useState("");
    const [valorBase, setValorBase]     = useState("");
    const [numParcelas, setNumParcelas] = useState("");
    const [dataPrimeira, setDataPrimeira] = useState("");

    useEffect(() => {
        async function carregar() {
        try {
            const { data } = await api.get(`/dividas/${dividaId}`);
            setDivida(data);
            setProduto(data.descricao_produto ?? "");
            setImei(data.imei ?? "");
            setInfo(data.informacoes_adicionais ?? "");
            setValorBase(String(Number(data.valor_base)).replace(".", ","));
            setNumParcelas(String(data.parcelas_total));
            setDataPrimeira(data.parcelas?.[0]?.data_vencimento?.slice(0, 10) ?? "");
        } catch (err) {
            setErroCarga(err.response?.data?.erro || "Não foi possível carregar a dívida.");
        } finally {
            setLoading(false);
        }
        }
        carregar();
    }, [dividaId]);

    // Há pagamento (inclusive estornado)? Então valor/parcelas/data ficam bloqueados.
    const temPagamento = divida?.parcelas?.some((p) => (p.pagamentos?.length ?? 0) > 0) ?? false;

    const n     = parseInt(numParcelas, 10);
    const vNum  = parseFloat(valorBase.replace(",", "."));
    const taxa  = n ? obterTaxaJuros(n) : null;
    const total = vNum > 0 && taxa !== null ? +(vNum * (1 + taxa)).toFixed(2) : null;

    function mostrarToast(msg, tipo = "sucesso") {
        setToast({ msg, tipo });
        setTimeout(() => setToast(null), 3500);
    }

    function validar() {
        const e = {};
        if (!produto.trim()) e.produto = "Descrição obrigatória.";
        if (!temPagamento) {
        if (!vNum || vNum <= 0) e.valorBase = "Informe um valor maior que zero.";
        if (!n || n < 1 || n > PARCELAS_MAXIMO) e.numParcelas = `Informe entre 1 e ${PARCELAS_MAXIMO} parcelas.`;
        if (!dataPrimeira) e.dataPrimeira = "Informe a data da 1ª parcela.";
        }
        setErros(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(ev) {
        ev.preventDefault();
        if (!validar()) return;
        setSalvando(true);
        try {
        const payload = {
            descricao_produto: produto.trim(),
            imei: imei.trim(),
            informacoes_adicionais: info.trim(),
        };
        if (!temPagamento) {
            payload.valor_base = vNum;
            payload.parcelas_total = n;
            payload.data_primeira_parcela = dataPrimeira;
        }
        await api.patch(`/dividas/${dividaId}`, payload);
        mostrarToast("Dívida atualizada com sucesso!");
        setTimeout(() => navigate(`/dividas/${divida.id_cliente}`, { replace: true }), 1500);
        } catch (err) {
        mostrarToast(err.response?.data?.erro || "Erro ao editar dívida.", "erro");
        } finally {
        setSalvando(false);
        }
    }

    if (loading) {
        return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-bios-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
        );
    }
    if (erroCarga) {
        return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-sm w-full text-center">
            <p className="text-red-600 font-medium mb-3">{erroCarga}</p>
            <button onClick={() => navigate(-1)} className="px-4 h-9 rounded-xl bg-red-600 text-white text-sm">Voltar</button>
            </div>
        </div>
        );
    }

    const inputBase = "w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-bios-primary-500 transition";

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
        {toast && (
            <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.msg}
            </div>
        )}

        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-200" aria-label="Voltar">←</button>
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Editar dívida #{divida.id_divida}</h1>
                <p className="text-sm text-gray-500">{divida.cliente?.nome}</p>
            </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Produto</h2>
                <div className="space-y-3">
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="produto">Descrição do produto *</label>
                    <input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)}
                    className={`${inputBase} bg-gray-50 ${erros.produto ? "border-red-400" : "border-gray-300"}`} />
                    {erros.produto && <p className="text-xs text-red-500 mt-1">{erros.produto}</p>}
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="imei">IMEI / Nº de série</label>
                    <input id="imei" value={imei} maxLength={30} onChange={(e) => setImei(e.target.value)}
                    className={`${inputBase} bg-gray-50 border-gray-300`} />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="info">Informações adicionais</label>
                    <textarea id="info" rows={3} value={info} onChange={(e) => setInfo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-bios-primary-500 resize-none" />
                </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Condições financeiras</h2>

                {temPagamento && (
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
                    Esta dívida já possui pagamento registrado. Valor, parcelas e data da 1ª parcela não podem ser alterados.
                </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="valorBase">Valor do produto (R$)</label>
                    <input id="valorBase" inputMode="decimal" value={valorBase} disabled={temPagamento}
                    onChange={(e) => setValorBase(e.target.value)}
                    className={`${inputBase} ${temPagamento ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50"} ${erros.valorBase ? "border-red-400" : "border-gray-300"}`} />
                    {erros.valorBase && <p className="text-xs text-red-500 mt-1">{erros.valorBase}</p>}
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="numParcelas">Parcelas (máx. {PARCELAS_MAXIMO}x)</label>
                    <input id="numParcelas" type="number" min={1} max={PARCELAS_MAXIMO} value={numParcelas} disabled={temPagamento}
                    onChange={(e) => setNumParcelas(e.target.value)}
                    className={`${inputBase} ${temPagamento ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50"} ${erros.numParcelas ? "border-red-400" : "border-gray-300"}`} />
                    {erros.numParcelas && <p className="text-xs text-red-500 mt-1">{erros.numParcelas}</p>}
                    {!temPagamento && taxa !== null && (
                    <p className="text-xs text-bios-primary-700 mt-1 font-medium">Taxa aplicada: {(taxa * 100).toFixed(0)}%</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="dataPrimeira">1ª parcela em</label>
                    <input id="dataPrimeira" type="date" value={dataPrimeira} disabled={temPagamento}
                    onChange={(e) => setDataPrimeira(e.target.value)}
                    className={`${inputBase} ${temPagamento ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50"} ${erros.dataPrimeira ? "border-red-400" : "border-gray-300"}`} />
                    {erros.dataPrimeira && <p className="text-xs text-red-500 mt-1">{erros.dataPrimeira}</p>}
                </div>
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 uppercase">Total com juros</p>
                    <p className="text-lg font-bold text-gray-900">
                    {formatBRL(temPagamento ? divida.valor_total : total ?? divida.valor_total)}
                    </p>
                </div>
                {!temPagamento && (
                    <p className="text-xs text-gray-500 text-right max-w-[220px]">
                    Ao alterar valor, parcelas ou data, as parcelas são recalculadas e geradas novamente.
                    </p>
                )}
                </div>
            </section>

            <div className="flex gap-3 justify-end pt-1 pb-6">
                <button type="button" onClick={() => navigate(-1)}
                className="px-5 h-10 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={salvando}
                className="px-6 h-10 rounded-xl bg-bios-primary-600 text-white text-sm font-semibold hover:bg-bios-primary-700 disabled:opacity-50">
                {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
    }