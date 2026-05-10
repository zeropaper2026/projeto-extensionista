// ============================================================
// ZERO PAPER – Rotas de Clientes
// GET    /clientes?nome=&cpf=   → buscar clientes
// POST   /clientes              → cadastrar cliente
// GET    /clientes/:id          → dados + dívidas do cliente
// ============================================================

const router      = require('express').Router();
const prisma      = require('../lib/prisma');
const autenticar  = require('../middlewares/autenticar');

// Todas as rotas exigem autenticação
router.use(autenticar);

// ── GET /clientes ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { nome, cpf } = req.query;

  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        ...(nome && { nome: { contains: nome } }),
        ...(cpf  && { cpf:  { contains: cpf.replace(/\D/g, '') } }),
      },
      orderBy: { nome: 'asc' },
    });

    return res.json(clientes);
  } catch (error) {
    console.error('[CLIENTE] Erro ao buscar:', error);
    return res.status(500).json({ erro: 'Erro ao buscar clientes.' });
  }
});

// ── POST /clientes ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { nome, cpf, telefone, endereco, email } = req.body;

  if (!nome || !cpf) {
    return res.status(400).json({ erro: 'Nome e CPF são obrigatórios.' });
  }

  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ erro: 'CPF deve conter 11 dígitos.' });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: { nome, cpf: cpfLimpo, telefone, endereco, email },
    });

    return res.status(201).json(cliente);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ erro: 'CPF já cadastrado.' });
    }
    console.error('[CLIENTE] Erro ao cadastrar:', error);
    return res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

// ── GET /clientes/:id ─────────────────────────────────────────
// Retorna cliente + todas as dívidas com parcelas (situação financeira)
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        dividas: {
          orderBy: { data_registro: 'desc' },
          include: {
            parcelas: {
              orderBy: { numero: 'asc' },
            },
          },
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    // Resumo financeiro
    const totalDividas   = cliente.dividas.length;
    const dividasAtivas  = cliente.dividas.filter(d => d.status === 'ativa').length;
    const dividasAtrasadas = cliente.dividas.filter(d => d.status === 'atrasada').length;
    const valorAberto    = cliente.dividas
      .flatMap(d => d.parcelas)
      .filter(p => p.status !== 'paga')
      .reduce((acc, p) => acc + (Number(p.valor_parcela) - Number(p.valor_pago_acumulado)), 0);

    return res.json({
      ...cliente,
      resumo: {
        totalDividas,
        dividasAtivas,
        dividasAtrasadas,
        valorAberto: valorAberto.toFixed(2),
      },
    });
  } catch (error) {
    console.error('[CLIENTE] Erro ao buscar por ID:', error);
    return res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

module.exports = router;
