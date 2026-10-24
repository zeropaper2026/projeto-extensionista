// ============================================================
// ZERO PAPER – Rotas de Parcelas
// POST /parcelas/:id/pagar  → registrar pagamento + atualizar status
// GET  /parcelas/:id        → visualizar parcela com pagamentos
// Ajustes A12: rejeita valor acima do restante (400); parcela vencida
// não paga por completo continua 'atrasada'; status da dívida recalculado.
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { idInteiro, textoLimpo, arredondar } = require('../lib/validacao');
const { hojeUTC, recalcularStatusDivida } = require('../services/atrasos');

router.use(autenticar);

const FORMAS_VALIDAS = ['dinheiro', 'pix', 'debito', 'credito'];

// ── POST /parcelas/:id/pagar ──────────────────────────────────
router.post('/:id/pagar', async (req, res) => {
  const id_parcela = idInteiro(req.params.id);
  if (!id_parcela) return res.status(400).json({ erro: 'ID de parcela inválido.' });

  const { forma_pagamento } = req.body ?? {};
  const valor_pago = arredondar(req.body?.valor_pago);
  const observacao = textoLimpo(req.body?.observacao, 500) || null;

  if (!req.body?.valor_pago || !forma_pagamento) {
    return res.status(400).json({ erro: 'valor_pago e forma_pagamento são obrigatórios.' });
  }
  if (!Number.isFinite(valor_pago) || valor_pago <= 0) {
    return res.status(400).json({ erro: 'Valor pago deve ser maior que zero.' });
  }
  if (!FORMAS_VALIDAS.includes(forma_pagamento)) {
    return res.status(400).json({ erro: `forma_pagamento deve ser: ${FORMAS_VALIDAS.join(', ')}.` });
  }

  try {
    const parcela = await prisma.parcela.findUnique({ where: { id_parcela } });

    if (!parcela) return res.status(404).json({ erro: 'Parcela não encontrada.' });
    if (parcela.status === 'paga') return res.status(409).json({ erro: 'Parcela já está paga.' });

    const valorParcela = Number(parcela.valor_parcela);
    const restante     = arredondar(valorParcela - Number(parcela.valor_pago_acumulado));

    if (valor_pago > restante) {
      return res.status(400).json({
        erro: `Valor pago (R$ ${valor_pago.toFixed(2)}) excede o restante da parcela (R$ ${restante.toFixed(2)}).`,
      });
    }

    const novoAcumulado = arredondar(Number(parcela.valor_pago_acumulado) + valor_pago);
    const venceu = new Date(parcela.data_vencimento) < hojeUTC();

    let novoStatus;
    if (novoAcumulado >= valorParcela) novoStatus = 'paga';
    else novoStatus = venceu ? 'atrasada' : 'parcial'; // pagamento parcial não "limpa" o atraso

    const resultado = await prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.create({
        data: {
          id_parcela,
          data_pagamento: new Date(),
          valor_pago,
          forma_pagamento,
          observacao,
        },
      });
      const parcelaAtualizada = await tx.parcela.update({
        where: { id_parcela },
        data: { valor_pago_acumulado: novoAcumulado, status: novoStatus },
      });
      const statusDivida = await recalcularStatusDivida(tx, parcela.id_divida);
      return { pagamento, parcelaAtualizada, statusDivida };
    });

    return res.status(201).json({
      mensagem: novoStatus === 'paga' ? 'Parcela quitada!' : 'Pagamento parcial registrado.',
      pagamento: resultado.pagamento,
      parcela:   resultado.parcelaAtualizada,
      dividaQuitada: resultado.statusDivida === 'quitada',
      statusDivida:  resultado.statusDivida,
    });
  } catch (error) {
    console.error('[PARCELA] Erro ao registrar pagamento:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao registrar pagamento.' });
  }
});

// ── GET /parcelas/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id_parcela = idInteiro(req.params.id);
  if (!id_parcela) return res.status(400).json({ erro: 'ID de parcela inválido.' });

  try {
    const parcela = await prisma.parcela.findUnique({
      where: { id_parcela },
      include: {
        pagamentos: { orderBy: { data_pagamento: 'asc' } },
        divida: {
          select: {
            descricao_produto: true,
            valor_total:       true,
            status:            true,
            cliente: { select: { nome: true } },
          },
        },
      },
    });

    if (!parcela) return res.status(404).json({ erro: 'Parcela não encontrada.' });
    return res.json(parcela);
  } catch (error) {
    console.error('[PARCELA] Erro ao buscar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao buscar parcela.' });
  }
});

module.exports = router;
