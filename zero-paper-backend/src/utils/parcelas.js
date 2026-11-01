function addMonthsUTC(date, months) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
    const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(date.getUTCDate(), ultimoDia));
    return d;
}

function gerarParcelas(valorTotal, n, primeiraData) {
    const valorParcela = parseFloat((valorTotal / n).toFixed(2));
    const valorUltima  = parseFloat((valorTotal - valorParcela * (n - 1)).toFixed(2));
    return Array.from({ length: n }, (_, i) => ({
    numero:          i + 1,
    valor_parcela:   i === n - 1 ? valorUltima : valorParcela,
    data_vencimento: addMonthsUTC(primeiraData, i),
    status:          'pendente',
    }));
}

function erroHttp(status, mensagem) {
    const e = new Error(mensagem);
    e.status = status;
    return e;
}

module.exports = { addMonthsUTC, gerarParcelas, erroHttp };