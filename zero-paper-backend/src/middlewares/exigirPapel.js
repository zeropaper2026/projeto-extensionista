// Autorização por papel (o papel já vai no JWT: { id, login, papel })
module.exports = (...papeis) => (req, res, next) => {
    if (!req.funcionario || !papeis.includes(req.funcionario.papel)) {
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }
    next();
};