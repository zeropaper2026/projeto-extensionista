// ============================================================
// ZERO PAPER – Autorização de estorno (Configurações do admin)
// Permite: admin, ou funcionário com pode_estornar = true.
// A permissão é conferida NO BANCO (não só no token), para que a
// revogação feita nas Configurações valha imediatamente.
// Usar DEPOIS de autenticar.
// ============================================================

const prisma = require('../lib/prisma');

module.exports = async function podeEstornar(req, res, next) {
  try {
    const f = await prisma.funcionario.findUnique({
      where:  { id_funcionario: req.funcionario.id },
      select: { papel: true, pode_estornar: true },
    });
    if (!f || (f.papel !== 'admin' && !f.pode_estornar)) {
      return res.status(403).json({
        erro: 'Estorno permitido somente ao administrador ou a funcionário autorizado.',
      });
    }
    next();
  } catch (error) {
    console.error('[ESTORNO] Erro ao verificar permissão:', error.code ?? error.name);
    return res.status(500).json({ erro: 'Erro ao verificar permissão.' });
  }
};
