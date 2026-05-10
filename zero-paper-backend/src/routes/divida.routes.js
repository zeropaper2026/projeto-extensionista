// ============================================================
// ZERO PAPER – Rotas de Dívidas
// POST /dividas           → criar dívida + parcelas automáticas
// GET  /dividas/:id       → visualizar dívida com parcelas
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');

router.use(autenticar);

// ── POST /dividas ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    id_cliente,
    valor_total,
    descricao_produto,
    imei,
    informacoes_adicionais,
    parcelas_total,
    data_primeira_parcela, // formato: "YYYY-MM-DD"
  } = req.body;

  // Validações básicas
  if (!id_cliente || !valor_total || !descricao_produto || !parcelas_total) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: id_cliente, valor_total, descricao_produto, parcelas_total.',
    });
  }
  if (valor_total <= 0 || parcelas_total <= 0) {
    return res.status(400).json({ erro: 'Valor total e parcelas devem ser maiores que zero.' });
  }

  try {
    // Verifica se cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente } });
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    // Calcula valor por parcela
    const valorParcela = parseFloat((valor_total / parcelas_total).toFixed(2));
    // Ajuste de centavos na última parcela
    const valorUltima  = parseFloat(
      (valor_total - valorParcela * (parcelas_total - 1)).toFixed(2)
    );

    // Data de vencimento base (padrão: daqui 1 mês)
    const base = data_primeira_parcela ? new Date(data_primeira_parcela) : new Date();
    if (!data_primeira_parcela) base.setMonth(base.getMonth() + 1);

    // Monta parcelas
    const parcelasData = Array.from({ length: parcelas_total }, (_, i) => {
      const vencimento = new Date(base);
      vencimento.setMonth(vencimento.getMonth() + i);
      return {
        numero:          i + 1,
        valor_parcela:   i === parcelas_total - 1 ? valorUltima : valorParcela,
        data_vencimento: vencimento,
        status:          'pendente',
      };
    });

    // Cria dívida + parcelas em uma transação
    const divida = await prisma.divida.create({
      data: {
        id_cliente,
        id_funcionario:        req.funcionario.id,
        valor_total,
        data_registro:         new Date(),
        descricao_produto,
        imei:                  imei ?? null,
        informacoes_adicionais: informacoes_adicionais ?? null,
        parcelas_total,
        status:                'ativa',
        parcelas: { create: parcelasData },
      },
      include: {
        cliente:  { select: { nome: true } },
        parcelas: { orderBy: { numero: 'asc' } },
      },
    });

    return res.status(201).json(divida);
  } catch (error) {
    console.error('[DIVIDA] Erro ao criar:', error);
    return res.status(500).json({ erro: 'Erro ao criar dívida.' });
  }
});

// ── GET /dividas/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const divida = await prisma.divida.findUnique({
      where: { id_divida: id },
      include: {
        cliente:     { select: { id_cliente: true, nome: true, cpf: true, telefone: true } },
        funcionario: { select: { nome: true } },
        parcelas: {
          orderBy:  { numero: 'asc' },
          include:  { pagamentos: { orderBy: { data_pagamento: 'asc' } } },
        },
      },
    });

    if (!divida) {
      return res.status(404).json({ erro: 'Dívida não encontrada.' });
    }

    // Calcula saldo devedor
    const totalPago = divida.parcelas
      .reduce((acc, p) => acc + Number(p.valor_pago_acumulado), 0);
    const saldoDevedor = (Number(divida.valor_total) - totalPago).toFixed(2);

    return res.json({ ...divida, saldoDevedor });
  } catch (error) {
    console.error('[DIVIDA] Erro ao buscar:', error);
    return res.status(500).json({ erro: 'Erro ao buscar dívida.' });
  }
});

module.exports = router;
