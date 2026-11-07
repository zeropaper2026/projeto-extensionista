// ============================================================
// ZERO PAPER – Rotas de Funcionários (Configurações do administrador)
// PATCH /funcionarios/:id/senha       → trocar senha (própria; admin troca a de qualquer um)
// GET   /funcionarios                 → listar (admin)
// POST  /funcionarios                 → cadastrar (admin)
// PATCH /funcionarios/:id/permissoes  → autorizar/revogar estorno (admin)
// ============================================================

const router      = require('express').Router();
const bcrypt      = require('bcryptjs');
const prisma      = require('../lib/prisma');
const autenticar  = require('../middlewares/autenticar');
const exigirPapel = require('../middlewares/exigirPapel');
const { idInteiro, textoLimpo } = require('../lib/validacao');

router.use(autenticar);

const PAPEIS = ['admin', 'atendente'];
const SELECT_PUBLICO = {           // a senha NUNCA é exposta
  id_funcionario: true,
  nome:           true,
  login:          true,
  papel:          true,
  pode_estornar:  true,
};

// Mesma régua do prisma/criarFuncionario.js (mín. 12 caracteres), com letra e número.
const MSG_SENHA = 'A senha deve ter no mínimo 12 caracteres, com letras e números.';
const senhaForte = (s) =>
  typeof s === 'string' && s.length >= 12 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);
// (72 = limite do bcrypt)

// ── PATCH /funcionarios/:id/senha ─────────────────────────────
// Erros de "senha atual" usam 400 (e não 401): o front faz logout em qualquer 401.
router.patch('/:id/senha', async (req, res) => {
  const id = idInteiro(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  const { senha_atual, nova_senha } = req.body ?? {};
  if (!senhaForte(nova_senha)) return res.status(400).json({ erro: MSG_SENHA });

  try {
    const alvo = await prisma.funcionario.findUnique({ where: { id_funcionario: id } });
    if (!alvo) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

    if (id === req.funcionario.id) {
      const confere = typeof senha_atual === 'string' && (await bcrypt.compare(senha_atual, alvo.senha));
      if (!confere) return res.status(400).json({ erro: 'Senha atual incorreta.' });
    } else if (req.funcionario.papel !== 'admin') {
      return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }

    await prisma.funcionario.update({
      where: { id_funcionario: id },
      data:  { senha: await bcrypt.hash(nova_senha, 12) },
    });
    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('[FUNCIONARIO] Erro ao trocar senha:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao trocar senha.' });
  }
});

// Daqui em diante: somente administrador
router.use(exigirPapel('admin'));

// ── GET /funcionarios ─────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const lista = await prisma.funcionario.findMany({
      select:  SELECT_PUBLICO,
      orderBy: { nome: 'asc' },
    });
    return res.json(lista);
  } catch (error) {
    console.error('[FUNCIONARIO] Erro ao listar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao listar funcionários.' });
  }
});

// ── POST /funcionarios ────────────────────────────────────────
router.post('/', async (req, res) => {
  const body  = req.body ?? {};
  const nome  = textoLimpo(body.nome, 100);
  const login = textoLimpo(body.login, 50);
  const papel = body.papel ?? 'atendente';

  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(login)) {
    return res.status(400).json({
      erro: 'Login deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou underline).',
    });
  }
  if (!senhaForte(body.senha)) return res.status(400).json({ erro: MSG_SENHA });
  if (!PAPEIS.includes(papel)) return res.status(400).json({ erro: `Papel deve ser: ${PAPEIS.join(', ')}.` });

  try {
    const criado = await prisma.funcionario.create({
      data:   { nome, login, senha: await bcrypt.hash(body.senha, 12), papel },
      select: SELECT_PUBLICO,
    });
    return res.status(201).json(criado);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ erro: 'Login já cadastrado.' });
    console.error('[FUNCIONARIO] Erro ao cadastrar:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao cadastrar funcionário.' });
  }
});

// ── PATCH /funcionarios/:id/permissoes ────────────────────────
router.patch('/:id/permissoes', async (req, res) => {
  const id = idInteiro(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  const { pode_estornar } = req.body ?? {};
  if (typeof pode_estornar !== 'boolean') {
    return res.status(400).json({ erro: 'pode_estornar deve ser verdadeiro ou falso.' });
  }

  try {
    const alvo = await prisma.funcionario.findUnique({ where: { id_funcionario: id } });
    if (!alvo) return res.status(404).json({ erro: 'Funcionário não encontrado.' });
    if (alvo.papel === 'admin') {
      return res.status(400).json({ erro: 'O administrador sempre pode estornar.' });
    }

    const atualizado = await prisma.funcionario.update({
      where:  { id_funcionario: id },
      data:   { pode_estornar },
      select: SELECT_PUBLICO,
    });
    return res.json(atualizado);
  } catch (error) {
    console.error('[FUNCIONARIO] Erro ao atualizar permissões:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao atualizar permissões.' });
  }
});

module.exports = router;
