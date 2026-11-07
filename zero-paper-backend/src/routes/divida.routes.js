// ============================================================
// ZERO PAPER – Rotas de Dívidas
// GET  /dividas?q=&status=  → busca de dívida (4.6)
// POST /dividas             → criar dívida (parcelada ou à vista) + parcelas automáticas
// GET  /dividas/:id         → visualizar dívida com parcelas
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { calcularValorComJuros, PARCELAS_MAXIMO } = require('../constants/taxasJuros');
const { idInteiro, textoLimpo, arredondar } = require('../lib/validacao');
const { atualizarStatusAtrasos, hojeUTC } = require('../services/atrasos');
const exigirPapel = require('../middlewares/exigirPapel');
const { gerarParcelas, addMonthsUTC, erroHttp } = require('../utils/parcelas');

router.use(autenticar);

const STATUS_VALIDOS = ['ativa', 'quitada', 'atrasada'];
const FORMAS_VALIDAS = ['dinheiro', 'pix', 'debito', 'credito'];
const TIPOS_VENDA    = ['avista', 'parcelada'];

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
// tipo_venda 'parcelada' (padrão): juros por faixa, N parcelas pendentes.
// tipo_venda 'avista': sem taxa, 1 parcela já paga na data da compra, dívida nasce
// quitada (registro de histórico). Em qualquer caso grava forma_pagamento.
router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const id_cliente        = idInteiro(body.id_cliente);
  const valor_base        = Number(body.valor_base);
  const descricao_produto = textoLimpo(body.descricao_produto, 255);
  const imei              = textoLimpo(body.imei, 30);
  const informacoes_adicionais = typeof body.informacoes_adicionais === 'string'
    ? body.informacoes_adicionais.trim().slice(0, 2000) : '';
  const data_primeira_parcela = body.data_primeira_parcela; // parcelado: 1º vencimento | à vista: data da compra
  const tipo_venda      = body.tipo_venda ?? 'parcelada';
  const forma_pagamento = body.forma_pagamento;

  if (!TIPOS_VENDA.includes(tipo_venda)) {
    return res.status(400).json({ erro: "tipo_venda deve ser 'avista' ou 'parcelada'." });
  }
  const avista = tipo_venda === 'avista';

  // Validações básicas
  if (!id_cliente || !valor_base || !descricao_produto) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: id_cliente, valor_base, descricao_produto.',
    });
  }
  if (!Number.isFinite(valor_base) || valor_base <= 0) {
    return res.status(400).json({ erro: 'Valor base deve ser maior que zero.' });
  }
  if (forma_pagamento !== undefined && forma_pagamento !== null && !FORMAS_VALIDAS.includes(forma_pagamento)) {
    return res.status(400).json({ erro: `forma_pagamento deve ser: ${FORMAS_VALIDAS.join(', ')}.` });
  }
  if (avista && !forma_pagamento) {
    return res.status(400).json({ erro: 'Informe a forma de pagamento da venda à vista.' });
  }

  const parcelas_total = avista ? 1 : Number(body.parcelas_total);
  if (!Number.isInteger(parcelas_total) || parcelas_total <= 0) {
    return res.status(400).json({ erro: 'Informe o número de parcelas (maior que zero).' });
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

  // "Hoje" no fuso de Tocantins; data da compra à vista: aceita passada, não aceita futura
  const hoje = hojeUTC();
  const hojeStr = hoje.toISOString().slice(0, 10);
  if (avista && data_primeira_parcela && String(data_primeira_parcela) > hojeStr) {
    return res.status(400).json({ erro: 'A data da compra não pode ser futura.' });
  }

  try {
    // Verifica se cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente } });
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    let valorBase = valor_base, taxaAplicada, valorTotal, parcelasData, dataRegistro, statusDivida;

    if (avista) {
      // À vista: sem taxa, 1 parcela já paga, dívida nasce quitada
      const dataCompra = new Date(`${data_primeira_parcela || hojeStr}T00:00:00Z`);
      taxaAplicada = 0;
      valorTotal   = parseFloat(valor_base.toFixed(2));
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
      // Calcula valor com juros conforme a faixa de parcelas
      let calc;
      try {
        calc = calcularValorComJuros(valor_base, parcelas_total);
      } catch (err) {
        return res.status(400).json({ erro: err.message });
      }
      valorBase    = calc.valorBase;
      taxaAplicada = calc.taxaAplicada;
      valorTotal   = calc.valorTotalComJuros;
      dataRegistro = hoje;
      statusDivida = 'ativa';

      // Valor por parcela (sobre o valor já com juros)
      const valorParcela = parseFloat((valorTotal / parcelas_total).toFixed(2));
      // Ajuste de centavos na última parcela
      const valorUltima  = parseFloat(
        (valorTotal - valorParcela * (parcelas_total - 1)).toFixed(2)
      );

      // Data de vencimento base (padrão: daqui 1 mês)
      const base = data_primeira_parcela
        ? new Date(`${data_primeira_parcela}T00:00:00Z`)
        : addMonthsUTC(hoje, 1);

      parcelasData = Array.from({ length: parcelas_total }, (_, i) => ({
        numero:          i + 1,
        valor_parcela:   i === parcelas_total - 1 ? valorUltima : valorParcela,
        data_vencimento: addMonthsUTC(base, i),
        status:          'pendente',
      }));
    }

    // Cria dívida + parcelas (+ pagamento, se à vista) em uma transação
    const divida = await prisma.divida.create({
      data: {
        id_cliente,
        id_funcionario:        req.funcionario.id,
        valor_base:            valorBase,
        taxa_aplicada:         taxaAplicada,
        valor_total:           valorTotal,
        data_registro:         dataRegistro,
        descricao_produto,
        imei:                  imei || null,
        informacoes_adicionais: informacoes_adicionais || null,
        parcelas_total,
        status:                statusDivida,
        tipo_venda,
        forma_pagamento:       forma_pagamento ?? 'dinheiro',
        parcelas:              { create: parcelasData },
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

// ── PATCH /dividas/:id ────────────────────────────────────────
// Campos descritivos: sempre editáveis.
// valor_base / parcelas_total / data_primeira_parcela: só se NENHUM pagamento foi registrado.
router.patch('/:id', exigirPapel('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID de dívida inválido.' });
  }

  const {
    descricao_produto, imei, informacoes_adicionais,
    valor_base, parcelas_total, data_primeira_parcela,
  } = req.body;

  if (descricao_produto !== undefined && !String(descricao_produto).trim()) {
    return res.status(400).json({ erro: 'Descrição do produto não pode ficar vazia.' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const divida = await tx.divida.findUnique({
        where: { id_divida: id },
        include: { parcelas: { orderBy: { numero: 'asc' } } },
      });
      if (!divida) throw erroHttp(404, 'Dívida não encontrada.');

      const dados = {};
      if (descricao_produto !== undefined)      dados.descricao_produto = String(descricao_produto).trim();
      if (imei !== undefined)                   dados.imei = String(imei ?? '').trim() || null;
      if (informacoes_adicionais !== undefined) dados.informacoes_adicionais = String(informacoes_adicionais ?? '').trim() || null;

      // Valores "novos" (se não vieram, mantém os atuais)
      const valorAtual    = Number(divida.valor_base);
      const vencAtual     = divida.parcelas[0].data_vencimento.toISOString().slice(0, 10);
      const novoValor     = valor_base !== undefined ? Number(String(valor_base).replace(',', '.')) : valorAtual;
      const novasParcelas = parcelas_total !== undefined ? Number(parcelas_total) : divida.parcelas_total;
      const novaData      = data_primeira_parcela || vencAtual;

      if (!Number.isFinite(novoValor) || novoValor <= 0) {
        throw erroHttp(400, 'Valor base deve ser maior que zero.');
      }
      if (!Number.isInteger(novasParcelas) || novasParcelas < 1 || novasParcelas > PARCELAS_MAXIMO) {
        throw erroHttp(400, `O parcelamento é permitido de 1 a ${PARCELAS_MAXIMO}x.`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) || isNaN(new Date(novaData + 'T00:00:00Z'))) {
        throw erroHttp(400, 'Data da 1ª parcela inválida (use AAAA-MM-DD).');
      }

      const mudouFinanceiro =
        novoValor !== valorAtual ||
        novasParcelas !== divida.parcelas_total ||
        novaData !== vencAtual;

      if (mudouFinanceiro) {
        const qtdPagamentos = await tx.pagamento.count({
          where: { parcela: { id_divida: id } },
        });
        if (qtdPagamentos > 0) {
          throw erroHttp(
            409,
            'Não é possível alterar valor, parcelas ou data: a dívida já possui pagamento registrado. Apenas descrição, IMEI e informações adicionais podem ser editados.'
          );
        }

        const { taxaAplicada, valorTotalComJuros } = calcularValorComJuros(novoValor, novasParcelas);
        dados.valor_base      = novoValor;
        dados.taxa_aplicada   = taxaAplicada;
        dados.valor_total     = valorTotalComJuros;
        dados.parcelas_total  = novasParcelas;
        dados.status          = 'ativa';

        // Regera as parcelas na MESMA transação
        await tx.parcela.deleteMany({ where: { id_divida: id } });
        await tx.parcela.createMany({
          data: gerarParcelas(valorTotalComJuros, novasParcelas, new Date(novaData + 'T00:00:00Z'))
                  .map((p) => ({ ...p, id_divida: id })),
        });
      }

      if (Object.keys(dados).length > 0) {
        await tx.divida.update({ where: { id_divida: id }, data: dados });
      }

      return tx.divida.findUnique({
        where: { id_divida: id },
        include: {
          cliente:  { select: { id_cliente: true, nome: true } },
          parcelas: { orderBy: { numero: 'asc' } },
        },
      });
    });

    return res.json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ erro: error.message });
    console.error('[DIVIDA] Erro ao editar:', error);
    return res.status(500).json({ erro: 'Erro ao editar dívida.' });
  }
});
module.exports = router;
