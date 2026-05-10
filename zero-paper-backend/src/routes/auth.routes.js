// ============================================================
// ZERO PAPER – Rotas de Autenticação
// POST /auth/login
// ============================================================

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../lib/prisma');

/**
 * POST /auth/login
 * Body: { login, senha }
 * Retorna: { token, funcionario: { id, nome, login, papel } }
 */
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ erro: 'Login e senha são obrigatórios.' });
  }

  try {
    // Busca funcionário pelo login
    const funcionario = await prisma.funcionario.findUnique({
      where: { login },
    });

    if (!funcionario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    // Verifica senha
    const senhaCorreta = await bcrypt.compare(senha, funcionario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    // Gera token JWT
    const token = jwt.sign(
      {
        id:    funcionario.id_funcionario,
        login: funcionario.login,
        papel: funcionario.papel,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      funcionario: {
        id:    funcionario.id_funcionario,
        nome:  funcionario.nome,
        login: funcionario.login,
        papel: funcionario.papel,
      },
    });
  } catch (error) {
    console.error('[AUTH] Erro no login:', error);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
