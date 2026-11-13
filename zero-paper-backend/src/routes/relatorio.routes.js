// ============================================================
// ZERO PAPER – Relatórios (versão enxuta, card 4.13)
// GET /relatorios/recebimentos?de=&ate=  → o que entrou no caixa
// GET /relatorios/vendas?de=&ate=        → vendas registradas (base, juros, total)
// GET /relatorios/inadimplencia          → parcelas vencidas e não pagas (hoje)
// Datas: aaaa-mm-dd. Padrão: do dia 1º do mês atual até hoje.
// Acesso: somente papel admin (plano 4.15).
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { isoData, hojeBR, arred, ehAVista } = require('../utils/formatadores');

router.use(autenticar);

// Só admin. Se já existir um middleware de papel das Configurações, pode trocar por ele.
router.use((req, res, next) => {
  if (req.funcionario?.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
  }
  next();
});

// ── helpers ──────────────────────────────────────────────────
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

function lerPeriodo(query) {
  const hoje = hojeBR();
  const de  = query.de  || `${hoje.slice(0, 7)}-01`;
  const ate = query.ate || hoje;

  for (const [nome, v] of [['de', de], ['ate', ate]]) {
    if (!REGEX_DATA.test(v) || isNaN(new Date(`${v}T00:00:00.000Z`))) {
      return { erro: `Data inválida em "${nome}". Use o formato aaaa-mm-dd.` };
    }
  }
  if (de > ate) return { erro: 'A data inicial não pode ser maior que a final.' };

  return {
    de, ate,
    inicio: new Date(`${de}T00:00:00.000Z`),
    fim:    new Date(`${ate}T00:00:00.000Z`), // colunas @db.Date: comparação por dia
  };
}

const num = (v) => Number(v ?? 0);

// ── GET /relatorios/recebimentos ─────────────────────────────
router.get('/recebimentos', async (req, res) => {
  const p = lerPeriodo(req.query);
  if (p.erro) return res.status(400).json({ erro: p.erro });

  // Quando o Estorno existir, excluir os pagamentos estornados aqui (ex.: estornado_em: null)
  const where = { data_pagamento: { gte: p.inicio, lte: p.fim } };

  try {
    const [porForma, pagamentos] = await Promise.all([
      prisma.pagamento.groupBy({
        by: ['forma_pagamento'],
        where,
        _sum: { valor_pago: true },
        _count: { _all: true },
      }),
      prisma.pagamento.findMany({
        where,
        orderBy: [{ data_pagamento: 'desc' }, { id_pagamento: 'desc' }],
        include: {
          parcela: {
            select: {
              numero: true,
              divida: {
                select: {
                  id_divida: true,
                  descricao_produto: true,
                  parcelas_total: true,
                  cliente: { select: { id_cliente: true, nome: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formas = porForma.map((f) => ({
      forma: f.forma_pagamento,
      total: arred(num(f._sum.valor_pago)),
      quantidade: f._count._all,
    }));

    return res.json({
      periodo: { de: p.de, ate: p.ate },
      total: arred(formas.reduce((s, f) => s + f.total, 0)),
      quantidade: pagamentos.length,
      porForma: formas,
      itens: pagamentos.map((pg) => ({
        id_pagamento: pg.id_pagamento,
        data: isoData(pg.data_pagamento),
        valor: arred(num(pg.valor_pago)),
        forma: pg.forma_pagamento,
        parcela: `${pg.parcela.numero}/${pg.parcela.divida.parcelas_total}`,
        id_divida: pg.parcela.divida.id_divida,
        id_cliente: pg.parcela.divida.cliente.id_cliente,
        cliente: pg.parcela.divida.cliente.nome,
        produto: pg.parcela.divida.descricao_produto,
      })),
    });
  } catch (error) {
    console.error('[RELATORIO] recebimentos:', error.message);
    return res.status(500).json({ erro: 'Erro ao gerar o relatório de recebimentos.' });
  }
});

// ── GET /relatorios/vendas ───────────────────────────────────
router.get('/vendas', async (req, res) => {
  const p = lerPeriodo(req.query);
  if (p.erro) return res.status(400).json({ erro: p.erro });

  try {
    const dividas = await prisma.divida.findMany({
      where: { data_registro: { gte: p.inicio, lte: p.fim } },
      orderBy: [{ data_registro: 'desc' }, { id_divida: 'desc' }],
      include: {
        cliente: { select: { id_cliente: true, nome: true } },
        parcelas: { select: { valor_pago_acumulado: true } },
      },
    });

    const zerado = () => ({ quantidade: 0, valorBase: 0, juros: 0, total: 0, recebido: 0, emAberto: 0 });
    const resumo = { parcelado: zerado(), aVista: zerado() };

    const itens = dividas.map((d) => {
      const aVista   = ehAVista(d);
      const base     = num(d.valor_base ?? d.valor_total);
      const total    = num(d.valor_total);
      const juros    = arred(total - base);
      const recebido = arred(d.parcelas.reduce((s, x) => s + num(x.valor_pago_acumulado), 0));
      // à vista é histórico: nunca entra em "em aberto"
      const emAberto = aVista ? 0 : Math.max(0, arred(total - recebido));

      const grupo = resumo[aVista ? 'aVista' : 'parcelado'];
      grupo.quantidade += 1;
      grupo.valorBase  += base;
      grupo.juros      += juros;
      grupo.total      += total;
      grupo.recebido   += recebido;
      grupo.emAberto   += emAberto;

      return {
        id_divida: d.id_divida,
        data: isoData(d.data_registro),
        id_cliente: d.cliente.id_cliente,
        cliente: d.cliente.nome,
        produto: d.descricao_produto,
        tipo: aVista ? 'a_vista' : 'parcelado',
        parcelas: d.parcelas_total,
        taxa: num(d.taxa_aplicada),
        valorBase: base,
        juros,
        total,
        recebido,
        emAberto,
        status: d.status,
      };
    });

    for (const g of Object.values(resumo)) {
      for (const k of ['valorBase', 'juros', 'total', 'recebido', 'emAberto']) g[k] = arred(g[k]);
    }
    const geral = zerado();
    for (const g of Object.values(resumo)) {
      for (const k of Object.keys(geral)) geral[k] = arred(geral[k] + g[k]);
    }

    return res.json({ periodo: { de: p.de, ate: p.ate }, geral, ...resumo, itens });
  } catch (error) {
    console.error('[RELATORIO] vendas:', error.message);
    return res.status(500).json({ erro: 'Erro ao gerar o relatório de vendas.' });
  }
});

// ── GET /relatorios/inadimplencia ────────────────────────────
// Foto de hoje: parcelas vencidas e ainda com saldo. Calculado pela data de
// vencimento, sem depender do status "atrasada" ter sido atualizado.
router.get('/inadimplencia', async (_req, res) => {
  const hoje = hojeBR();
  const hojeData = new Date(`${hoje}T00:00:00.000Z`);

  try {
    const parcelas = await prisma.parcela.findMany({
      where: {
        status: { in: ['pendente', 'atrasada', 'parcial'] },
        data_vencimento: { lt: hojeData },
      },
      orderBy: { data_vencimento: 'asc' },
      include: {
        divida: {
          include: { cliente: { select: { id_cliente: true, nome: true, telefone: true } } },
        },
      },
    });

    const clientes = new Map();
    let totalGeral = 0;
    let qtdParcelas = 0;

    for (const pa of parcelas) {
      if (ehAVista(pa.divida)) continue; // à vista nunca entra em atraso
      const restante = arred(num(pa.valor_parcela) - num(pa.valor_pago_acumulado));
      if (restante <= 0) continue;

      const dias = Math.floor((hojeData - new Date(pa.data_vencimento)) / 86400000);
      const c = pa.divida.cliente;
      if (!clientes.has(c.id_cliente)) {
        clientes.set(c.id_cliente, {
          id_cliente: c.id_cliente, nome: c.nome, telefone: c.telefone,
          totalEmAtraso: 0, parcelasEmAtraso: 0, maiorAtrasoDias: 0, parcelas: [],
        });
      }
      const cli = clientes.get(c.id_cliente);
      cli.totalEmAtraso = arred(cli.totalEmAtraso + restante);
      cli.parcelasEmAtraso += 1;
      cli.maiorAtrasoDias = Math.max(cli.maiorAtrasoDias, dias);
      cli.parcelas.push({
        id_divida: pa.divida.id_divida,
        produto: pa.divida.descricao_produto,
        parcela: `${pa.numero}/${pa.divida.parcelas_total}`,
        vencimento: isoData(pa.data_vencimento),
        diasEmAtraso: dias,
        valorParcela: num(pa.valor_parcela),
        pago: num(pa.valor_pago_acumulado),
        restante,
      });
      totalGeral = arred(totalGeral + restante);
      qtdParcelas += 1;
    }

    const lista = [...clientes.values()].sort((a, b) => b.totalEmAtraso - a.totalEmAtraso);

    return res.json({
      referencia: hoje,
      totalEmAtraso: totalGeral,
      clientesEmAtraso: lista.length,
      parcelasEmAtraso: qtdParcelas,
      clientes: lista,
    });
  } catch (error) {
    console.error('[RELATORIO] inadimplencia:', error.message);
    return res.status(500).json({ erro: 'Erro ao gerar o relatório de inadimplência.' });
  }
});

module.exports = router;
