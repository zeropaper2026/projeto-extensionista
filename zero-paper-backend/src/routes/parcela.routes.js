// ============================================================
// ZERO PAPER – Rotas de Parcelas
// POST /parcelas/:id/pagar  → registrar pagamento (total ou parcial)
// GET  /parcelas/:id        → visualizar parcela com pagamentos
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');

router.use(autenticar);

// ── POST /parcelas/:id/pagar ──────────────────────────────────
router.post('/:id/pagar', async (req, res) => {
  const id_parcela = parseInt(req.params.id);
  const { valor_pago, forma_pagamento, observacao } = req.body;

  if (!Number.isInteger(id_parcela)) {
    return res.status(400).json({ erro: 'ID da parcela inválido.' });
  }

  const valor = Number(valor_pago);
  if (!forma_pagamento || valor_pago === undefined || valor_pago === null) {
    return res.status(400).json({ erro: 'valor_pago e forma_pagamento são obrigatórios.' });
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ erro: 'Valor pago deve ser maior que zero.' });
  }

  const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
  if (!formasValidas.includes(forma_pagamento)) {
    return res.status(400).json({ erro: `forma_pagamento deve ser: ${formasValidas.join(', ')}.` });
  }

  try {
    const parcela = await prisma.parcela.findUnique({
      where: { id_parcela },
      include: { divida: { include: { parcelas: true } } },
    });

    if (!parcela) {
      return res.status(404).json({ erro: 'Parcela não encontrada.' });
    }
    if (parcela.status === 'paga') {
      return res.status(409).json({ erro: 'Parcela já está paga.' });
    }

    const valorTotal     = Number(parcela.valor_parcela);
    const acumuladoAtual = Number(parcela.valor_pago_acumulado);
    const restante       = parseFloat((valorTotal - acumuladoAtual).toFixed(2));

    // Pagamento acima do restante da parcela → 400
    if (valor > restante) {
      return res.status(400).json({
        erro: `Valor excede o restante da parcela (R$ ${restante.toFixed(2).replace('.', ',')}).`,
      });
    }

    const novoAcumulado = parseFloat((acumuladoAtual + valor).toFixed(2));

    // Define novo status da parcela (parcial → paga quando completa)
    const novoStatus = novoAcumulado >= valorTotal ? 'paga' : 'parcial';

    // Executa tudo em transação
    const [pagamento, parcelaAtualizada] = await prisma.$transaction([
      // 1. Registra pagamento
      prisma.pagamento.create({
        data: {
          id_parcela,
          data_pagamento:  new Date(),
          valor_pago:      valor,
          forma_pagamento,
          observacao:      observacao ?? null,
        },
      }),
      // 2. Atualiza parcela
      prisma.parcela.update({
        where: { id_parcela },
        data: {
          valor_pago_acumulado: novoAcumulado,
          status: novoStatus,
        },
      }),
    ]);

    // 3. Verifica se todas as parcelas da dívida estão pagas → quita a dívida
    const todasParcelas = await prisma.parcela.findMany({
      where: { id_divida: parcela.id_divida },
    });
    const todasPagas = todasParcelas.every(p =>
      p.id_parcela === id_parcela ? novoStatus === 'paga' : p.status === 'paga'
    );

    if (todasPagas) {
      await prisma.divida.update({
        where: { id_divida: parcela.id_divida },
        data:  { status: 'quitada' },
      });
    }

    return res.status(201).json({
      mensagem:  novoStatus === 'paga' ? 'Parcela quitada!' : 'Pagamento parcial registrado.',
      pagamento,
      parcela:   parcelaAtualizada,
      dividaQuitada: todasPagas,
    });
  } catch (error) {
    console.error('[PARCELA] Erro ao registrar pagamento:', error);
    return res.status(500).json({ erro: 'Erro ao registrar pagamento.' });
  }
});

// ── GET /parcelas/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id_parcela = parseInt(req.params.id);

  if (!Number.isInteger(id_parcela)) {
    return res.status(400).json({ erro: 'ID da parcela inválido.' });
  }

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

    if (!parcela) {
      return res.status(404).json({ erro: 'Parcela não encontrada.' });
    }

    return res.json(parcela);
  } catch (error) {
    console.error('[PARCELA] Erro ao buscar:', error);
    return res.status(500).json({ erro: 'Erro ao buscar parcela.' });
  }
});

module.exports = router;