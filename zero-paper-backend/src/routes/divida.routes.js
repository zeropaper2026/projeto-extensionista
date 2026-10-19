// ============================================================
// ZERO PAPER – Rotas de Dívidas
// POST /dividas           → criar dívida (parcelada ou à vista)
// GET  /dividas/:id       → visualizar dívida com parcelas
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { calcularValorComJuros, PARCELAS_MAXIMO } = require('../constants/taxasJuros');

router.use(autenticar);

const FORMAS = ['dinheiro', 'pix', 'debito', 'credito'];

// Data de hoje no fuso de Tocantins (YYYY-MM-DD)
const hojeBR = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// Soma meses em UTC, sem estourar o dia (31/01 + 1 mês = 28/02)
function addMonthsUTC(date, n) {
  const d = new Date(date);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d;
}

// ── POST /dividas ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    id_cliente,
    valor_base,
    descricao_produto,
    imei,
    informacoes_adicionais,
    parcelas_total,
    data_primeira_parcela, // parcelado: 1º vencimento | à vista: data da compra
    tipo_venda = 'parcelada',
    forma_pagamento,
  } = req.body;

  if (!['avista', 'parcelada'].includes(tipo_venda)) {
    return res.status(400).json({ erro: "tipo_venda deve ser 'avista' ou 'parcelada'." });
  }
  const avista = tipo_venda === 'avista';

  const idCliente    = Number(id_cliente);
  const valorBaseNum = Number(valor_base);
  if (!Number.isInteger(idCliente) || !descricao_produto || !(valorBaseNum > 0)) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: id_cliente, valor_base (> 0), descricao_produto.',
    });
  }
  if (forma_pagamento && !FORMAS.includes(forma_pagamento)) {
    return res.status(400).json({ erro: `forma_pagamento deve ser: ${FORMAS.join(', ')}.` });
  }
  if (avista && !forma_pagamento) {
    return res.status(400).json({ erro: 'Informe a forma de pagamento da venda à vista.' });
  }

  const nParcelas = avista ? 1 : Number(parcelas_total);
  if (!Number.isInteger(nParcelas) || nParcelas < 1) {
    return res.status(400).json({ erro: 'Informe o número de parcelas.' });
  }
  if (nParcelas > PARCELAS_MAXIMO) {
    return res.status(400).json({
      erro: `O parcelamento é permitido em no máximo ${PARCELAS_MAXIMO}x.`,
    });
  }

  // Data da compra (à vista): aceita passada, não aceita futura
  const hoje = hojeBR();
  if (data_primeira_parcela && !/^\d{4}-\d{2}-\d{2}$/.test(data_primeira_parcela)) {
    return res.status(400).json({ erro: 'Data inválida. Use o formato AAAA-MM-DD.' });
  }
  if (avista && data_primeira_parcela && data_primeira_parcela > hoje) {
    return res.status(400).json({ erro: 'A data da compra não pode ser futura.' });
  }

  try {
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } });
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    let taxaAplicada, valorTotal, parcelasData, dataRegistro, statusDivida;

    if (avista) {
      // À vista: sem taxa, 1 parcela já paga, dívida nasce quitada
      const dataCompra = new Date(`${data_primeira_parcela || hoje}T00:00:00Z`);
      taxaAplicada = 0;
      valorTotal   = parseFloat(valorBaseNum.toFixed(2));
      dataRegistro = dataCompra;
      statusDivida = 'quitada';
      parcelasData = [{
        numero:               1,
        valor_parcela:        valorTotal,
        valor_pago_acumulado: valorTotal,
        data_vencimento:      dataCompra,
        status:               'paga',
        pagamentos: {
          create: [{
            data_pagamento:  dataCompra,
            valor_pago:      valorTotal,
            forma_pagamento,
            observacao:      'Venda à vista',
          }],
        },
      }];
    } else {
      let calc;
      try {
        calc = calcularValorComJuros(valorBaseNum, nParcelas);
      } catch (err) {
        return res.status(400).json({ erro: err.message });
      }
      taxaAplicada = calc.taxaAplicada;
      valorTotal   = calc.valorTotalComJuros;
      dataRegistro = new Date(`${hoje}T00:00:00Z`);
      statusDivida = 'ativa';

      const valorParcela = parseFloat((valorTotal / nParcelas).toFixed(2));
      // Ajuste de centavos na última parcela
      const valorUltima  = parseFloat((valorTotal - valorParcela * (nParcelas - 1)).toFixed(2));

      const base = data_primeira_parcela
        ? new Date(`${data_primeira_parcela}T00:00:00Z`)
        : addMonthsUTC(new Date(`${hoje}T00:00:00Z`), 1);

      parcelasData = Array.from({ length: nParcelas }, (_, i) => ({
        numero:          i + 1,
        valor_parcela:   i === nParcelas - 1 ? valorUltima : valorParcela,
        data_vencimento: addMonthsUTC(base, i),
        status:          'pendente',
      }));
    }

    // Cria dívida + parcelas (+ pagamento, se à vista) em uma transação
    const divida = await prisma.divida.create({
      data: {
        id_cliente:             idCliente,
        id_funcionario:         req.funcionario.id,
        valor_base:             valorBaseNum,
        taxa_aplicada:          taxaAplicada,
        valor_total:            valorTotal,
        data_registro:          dataRegistro,
        descricao_produto,
        imei:                   imei ?? null,
        informacoes_adicionais: informacoes_adicionais ?? null,
        parcelas_total:         nParcelas,
        status:                 statusDivida,
        tipo_venda,
        forma_pagamento:        forma_pagamento ?? 'dinheiro',
        parcelas:               { create: parcelasData },
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

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID da dívida inválido.' });
  }

  try {
    const divida = await prisma.divida.findUnique({
      where: { id_divida: id },
      include: {
        cliente:     { select: { id_cliente: true, nome: true, cpf: true, telefone: true } },
        funcionario: { select: { nome: true } },
        parcelas: {
          orderBy: { numero: 'asc' },
          include: { pagamentos: { orderBy: { data_pagamento: 'asc' } } },
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