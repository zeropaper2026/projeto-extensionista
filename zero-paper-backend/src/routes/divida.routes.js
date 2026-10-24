// ============================================================
// ZERO PAPER – Rotas de Dívidas
// GET  /dividas?q=&status=  → busca de dívida (4.6)
// POST /dividas             → criar dívida + parcelas automáticas
// GET  /dividas/:id         → visualizar dívida com parcelas
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { calcularValorComJuros, PARCELAS_MAXIMO } = require('../constants/taxasJuros');
const { idInteiro, textoLimpo, arredondar } = require('../lib/validacao');
const { atualizarStatusAtrasos } = require('../services/atrasos');

router.use(autenticar);

const STATUS_VALIDOS = ['ativa', 'quitada', 'atrasada'];

// ── GET /dividas?q=&status= ───────────────────────────────────
// Busca por nome/CPF do cliente, produto e IMEI, com filtro de status.
// (declarada ANTES de /:id)
router.get('/', async (req, res) => {
  const q      = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  if (status && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `status deve ser: ${STATUS_VALIDOS.join(', ')}.` });
  }

  try {
    await atualizarStatusAtrasos();

    const and = [];
    if (q) {
      const ou = [
        { descricao_produto: { contains: q, mode: 'insensitive' } },
        { imei:              { contains: q } },
        { cliente: { nome:   { contains: q, mode: 'insensitive' } } },
      ];
      // CPF só quando o termo parece um CPF (evita casar "iPhone 14" com CPFs)
      const digitos = q.replace(/\D/g, '');
      if (digitos.length >= 3 && /^[\d.\-\s]+$/.test(q)) {
        ou.push({ cliente: { cpf: { contains: digitos } } });
      }
      and.push({ OR: ou });
    }
    if (status) and.push({ status });

    const dividas = await prisma.divida.findMany({
      where: and.length ? { AND: and } : undefined,
      orderBy: { id_divida: 'desc' },
      take: 50,
      include: {
        cliente:  { select: { id_cliente: true, nome: true, cpf: true } },
        parcelas: { select: { status: true, valor_pago_acumulado: true } },
      },
    });

    return res.json(
      dividas.map((d) => {
        const pago = d.parcelas.reduce((acc, p) => acc + Number(p.valor_pago_acumulado), 0);
        return {
          id_divida:         d.id_divida,
          id_cliente:        d.cliente.id_cliente,
          cliente_nome:      d.cliente.nome,
          cliente_cpf:       d.cliente.cpf,
          descricao_produto: d.descricao_produto,
          imei:              d.imei,
          valor_total:       d.valor_total,
          saldo:             arredondar(Number(d.valor_total) - pago).toFixed(2),
          parcelas_total:    d.parcelas_total,
          parcelas_pagas:    d.parcelas.filter((p) => p.status === 'paga').length,
          status:            d.status,
          data_registro:     d.data_registro,
        };
      })
    );
  } catch (error) {
    console.error('[DIVIDA] Erro ao buscar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao buscar dívidas.' });
  }
});

// ── POST /dividas ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const id_cliente        = idInteiro(body.id_cliente);
  const valor_base        = Number(body.valor_base);
  const parcelas_total    = Number(body.parcelas_total);
  const descricao_produto = textoLimpo(body.descricao_produto, 255);
  const imei              = textoLimpo(body.imei, 30);
  const informacoes_adicionais = typeof body.informacoes_adicionais === 'string'
    ? body.informacoes_adicionais.trim().slice(0, 2000) : '';
  const data_primeira_parcela = body.data_primeira_parcela; // "YYYY-MM-DD"

  // Validações básicas
  if (!id_cliente || !valor_base || !descricao_produto || !parcelas_total) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: id_cliente, valor_base, descricao_produto, parcelas_total.',
    });
  }
  if (!Number.isFinite(valor_base) || valor_base <= 0 || !Number.isInteger(parcelas_total) || parcelas_total <= 0) {
    return res.status(400).json({ erro: 'Valor base e parcelas devem ser maiores que zero.' });
  }
  if (parcelas_total > PARCELAS_MAXIMO) {
    return res.status(400).json({
      erro: `O parcelamento é permitido em no máximo ${PARCELAS_MAXIMO}x.`,
    });
  }
  if (data_primeira_parcela !== undefined && data_primeira_parcela !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(String(data_primeira_parcela))) {
    return res.status(400).json({ erro: 'data_primeira_parcela deve estar no formato YYYY-MM-DD.' });
  }

  // Calcula valor com juros conforme a faixa de parcelas
  let valorBase, taxaAplicada, valorTotal;
  try {
    ({ valorBase, taxaAplicada, valorTotalComJuros: valorTotal } =
      calcularValorComJuros(valor_base, parcelas_total));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }

  try {
    // Verifica se cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente } });
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    // Calcula valor por parcela (sobre o valor já com juros)
    const valorParcela = parseFloat((valorTotal / parcelas_total).toFixed(2));
    // Ajuste de centavos na última parcela
    const valorUltima  = parseFloat(
      (valorTotal - valorParcela * (parcelas_total - 1)).toFixed(2)
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
        valor_base:            valorBase,
        taxa_aplicada:         taxaAplicada,
        valor_total:           valorTotal,
        data_registro:         new Date(),
        descricao_produto,
        imei:                  imei || null,
        informacoes_adicionais: informacoes_adicionais || null,
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
    console.error('[DIVIDA] Erro ao criar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao criar dívida.' });
  }
});

// ── GET /dividas/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = idInteiro(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID de dívida inválido.' });

  try {
    await atualizarStatusAtrasos();

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
    console.error('[DIVIDA] Erro ao buscar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao buscar dívida.' });
  }
});

module.exports = router;
