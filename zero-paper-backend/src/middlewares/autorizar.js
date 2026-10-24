// ============================================================
// ZERO PAPER – Autorização por papel (usar DEPOIS de autenticar)
// Uso: router.post('/x', autorizar('admin'), handler)
// ============================================================

module.exports = function autorizar(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.funcionario || !papeisPermitidos.includes(req.funcionario.papel)) {
      return res.status(403).json({ erro: 'Acesso negado para o seu perfil.' });
    }
    next();
  };
};
