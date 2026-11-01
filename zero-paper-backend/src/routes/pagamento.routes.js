// ============================================================
// ZERO PAPER – Rotas de Pagamentos
// POST /pagamentos/:id/estornar → estorno (somente admin, motivo obrigatório)
// ============================================================

const router      = require('express').Router();
const prisma      = require('../lib/prisma');
const autenticar  = require('../middlewares/autenticar');
const exigirPapel = require('../middlewares/exigirPapel');
const { erroHttp } = require('../utils/parcelas');

router.use(autenticar);

router.post('/:id/estornar', exigirPapel('admin'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ erro: 'ID de pagamento inválido.' });
        }

    const motivo = String(req.body.motivo ?? '').trim();
        if (motivo.length < 5) {
            return res.status(400).json({ erro: 'Informe o motivo do estorno (mínimo de 5 caracteres).' });
        }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const pagamento = await tx.pagamento.findUnique({
            where: { id_pagamento: id },
            include: { parcela: true },
            });
            if (!pagamento)           throw erroHttp(404, 'Pagamento não encontrado.');
            if (pagamento.estornado)  throw erroHttp(409, 'Este pagamento já foi estornado.');

    const parcela = pagamento.parcela;
    const novoAcumulado = Math.max(
        0,
        +(Number(parcela.valor_pago_acumulado) - Number(pagamento.valor_pago)).toFixed(2)
    );

      // Novo status da parcela
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    let statusParcela;
    if (novoAcumulado > 0)                      statusParcela = 'parcial';
    else if (parcela.data_vencimento < hoje)    statusParcela = 'atrasada';
    else                                        statusParcela = 'pendente';

      // 1. Marca o pagamento (NÃO apaga)
    const pagamentoAtualizado = await tx.pagamento.update({
        where: { id_pagamento: id },
        data: {
        estornado: true,
        data_estorno: new Date(),
        motivo_estorno: motivo,
        id_funcionario_estorno: req.funcionario.id,
        },
    });

      // 2. Recalcula a parcela
        const parcelaAtualizada = await tx.parcela.update({
            where: { id_parcela: parcela.id_parcela },
            data: { valor_pago_acumulado: novoAcumulado, status: statusParcela },
        });

      // 3. Reavalia a dívida (reabre se estava quitada)
        const parcelas = await tx.parcela.findMany({ where: { id_divida: parcela.id_divida } });
        const statusDivida =
        parcelas.every((p) => p.status === 'paga')      ? 'quitada'  :
        parcelas.some((p) => p.status === 'atrasada')   ? 'atrasada' : 'ativa';

        const dividaAtualizada = await tx.divida.update({
            where: { id_divida: parcela.id_divida },
            data: { status: statusDivida },
            select: { id_divida: true, status: true },
        });

        return { pagamento: pagamentoAtualizado, parcela: parcelaAtualizada, divida: dividaAtualizada };
    });

    return res.json({ mensagem: 'Pagamento estornado.', ...resultado });
    } catch (error) {
    if (error.status) return res.status(error.status).json({ erro: error.message });
    console.error('[PAGAMENTO] Erro ao estornar:', error);
    return res.status(500).json({ erro: 'Erro ao estornar pagamento.' });
    }
});

module.exports = router;