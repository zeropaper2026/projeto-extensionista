// ============================================================
// ZERO PAPER – Rotas de Clientes
// GET    /clientes?q=            → buscar clientes (nome/CPF)
// GET    /clientes/inadimplentes → clientes com parcelas em atraso (4.5)
// POST   /clientes               → cadastrar cliente
// PATCH  /clientes/:id           → editar cliente (4.4)
// GET    /clientes/:id           → dados + dívidas do cliente
// ============================================================

const router     = require('express').Router();
const prisma     = require('../lib/prisma');
const autenticar = require('../middlewares/autenticar');
const { idInteiro, textoLimpo, cpfLimpo, emailValido, arredondar } = require('../lib/validacao');
const { atualizarStatusAtrasos, diasEmAtraso, hojeUTC } = require('../services/atrasos');

router.use(autenticar);

// ── GET /clientes ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const termo   = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const digitos = termo.replace(/\D/g, '');

    // Atenção: cpf contains '' casaria com todos — só busca CPF se houver dígitos
    const filtros = [{ nome: { contains: termo, mode: 'insensitive' } }];
    if (digitos) filtros.push({ cpf: { contains: digitos } });

    const clientes = await prisma.cliente.findMany({
      where: termo ? { OR: filtros } : undefined,
      orderBy: { nome: 'asc' },
      take: 100,
    });
    return res.json(clientes);
  } catch (error) {
    console.error('[CLIENTE] Erro ao buscar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao buscar clientes.' });
  }
});

// ── GET /clientes/inadimplentes ───────────────────────────────
// (declarada ANTES de /:id)
router.get('/inadimplentes', async (_req, res) => {
  try {
    await atualizarStatusAtrasos();
    const hoje = hojeUTC();

    const parcelas = await prisma.parcela.findMany({
      where: { status: 'atrasada' },
      orderBy: { data_vencimento: 'asc' },
      include: {
        divida: {
          select: {
            id_divida: true,
            descricao_produto: true,
            cliente: { select: { id_cliente: true, nome: true, cpf: true, telefone: true } },
          },
        },
      },
    });

    const porCliente = new Map();
    for (const p of parcelas) {
      const c = p.divida.cliente;
      if (!porCliente.has(c.id_cliente)) {
        porCliente.set(c.id_cliente, { cliente: c, totalEmAtraso: 0, maiorAtrasoDias: 0, parcelas: [] });
      }
      const g = porCliente.get(c.id_cliente);
      const restante = arredondar(Number(p.valor_parcela) - Number(p.valor_pago_acumulado));
      const dias = diasEmAtraso(p.data_vencimento, hoje);
      g.totalEmAtraso = arredondar(g.totalEmAtraso + restante);
      g.maiorAtrasoDias = Math.max(g.maiorAtrasoDias, dias);
      g.parcelas.push({
        id_parcela: p.id_parcela,
        id_divida: p.divida.id_divida,
        produto: p.divida.descricao_produto,
        numero: p.numero,
        data_vencimento: p.data_vencimento,
        dias_atraso: dias,
        valor_restante: restante,
      });
    }

    return res.json([...porCliente.values()].sort((a, b) => b.totalEmAtraso - a.totalEmAtraso));
  } catch (error) {
    console.error('[CLIENTE] Erro ao listar inadimplentes:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao listar inadimplentes.' });
  }
});

// ── POST /clientes ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const nome = textoLimpo(req.body?.nome, 150);
  const cpf  = cpfLimpo(req.body?.cpf);

  if (!nome || !cpf) {
    return res.status(400).json({ erro: 'Nome e CPF são obrigatórios.' });
  }
  if (cpf.length !== 11) {
    return res.status(400).json({ erro: 'CPF deve conter 11 dígitos.' });
  }
  const email = textoLimpo(req.body?.email, 120);
  if (email && !emailValido(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpf,
        telefone: textoLimpo(req.body?.telefone, 20) || undefined,
        endereco: textoLimpo(req.body?.endereco, 255) || undefined,
        email:    email || undefined,
      },
    });
    return res.status(201).json(cliente);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ erro: 'CPF já cadastrado.' });
    }
    console.error('[CLIENTE] Erro ao cadastrar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

// ── PATCH /clientes/:id ───────────────────────────────────────
// Envia apenas os campos a alterar. Telefone/endereço/e-mail vazios → limpa o campo.
router.patch('/:id', async (req, res) => {
  const id = idInteiro(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID de cliente inválido.' });

  const { nome, cpf, telefone, endereco, email } = req.body ?? {};
  const data = {};

  if (nome !== undefined) {
    const n = textoLimpo(nome, 150);
    if (!n) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    data.nome = n;
  }
  if (cpf !== undefined) {
    const c = cpfLimpo(cpf);
    if (c.length !== 11) return res.status(400).json({ erro: 'CPF deve conter 11 dígitos.' });
    data.cpf = c;
  }
  if (email !== undefined) {
    const e = textoLimpo(email, 120);
    if (e && !emailValido(e)) return res.status(400).json({ erro: 'E-mail inválido.' });
    data.email = e || null;
  }
  if (telefone !== undefined) data.telefone = textoLimpo(telefone, 20)  || null;
  if (endereco !== undefined) data.endereco = textoLimpo(endereco, 255) || null;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo válido para atualizar.' });
  }

  try {
    const cliente = await prisma.cliente.update({ where: { id_cliente: id }, data });
    return res.json(cliente);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ erro: 'Cliente não encontrado.' });
    if (error.code === 'P2002') return res.status(409).json({ erro: 'CPF já cadastrado.' });
    console.error('[CLIENTE] Erro ao editar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao editar cliente.' });
  }
});

// ── GET /clientes/:id ─────────────────────────────────────────
// Cliente + dívidas com parcelas (inclui dias_atraso por parcela)
router.get('/:id', async (req, res) => {
  const id = idInteiro(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID de cliente inválido.' });

  try {
    await atualizarStatusAtrasos();
    const hoje = hojeUTC();

    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        dividas: {
          orderBy: { data_registro: 'desc' },
          include: { parcelas: { orderBy: { numero: 'asc' } } },
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    let totalEmAtraso = 0;
    let maiorAtrasoDias = 0;
    const dividas = cliente.dividas.map((d) => ({
      ...d,
      parcelas: d.parcelas.map((p) => {
        const dias = p.status === 'atrasada' ? diasEmAtraso(p.data_vencimento, hoje) : 0;
        if (p.status === 'atrasada') {
          totalEmAtraso += Number(p.valor_parcela) - Number(p.valor_pago_acumulado);
          maiorAtrasoDias = Math.max(maiorAtrasoDias, dias);
        }
        return { ...p, dias_atraso: dias };
      }),
    }));

    const valorAberto = dividas
      .flatMap((d) => d.parcelas)
      .filter((p) => p.status !== 'paga')
      .reduce((acc, p) => acc + (Number(p.valor_parcela) - Number(p.valor_pago_acumulado)), 0);

    return res.json({
      ...cliente,
      dividas,
      resumo: {
        totalDividas:     dividas.length,
        dividasAtivas:    dividas.filter((d) => d.status === 'ativa').length,
        dividasAtrasadas: dividas.filter((d) => d.status === 'atrasada').length,
        valorAberto:      valorAberto.toFixed(2),
        totalEmAtraso:    arredondar(totalEmAtraso).toFixed(2),
        maiorAtrasoDias,
      },
    });
  } catch (error) {
    console.error('[CLIENTE] Erro ao buscar por ID:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

module.exports = router;
