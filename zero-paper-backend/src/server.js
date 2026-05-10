// ============================================================
// ZERO PAPER – Servidor Express (entry point)
// ============================================================

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3333;

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rotas ────────────────────────────────────────────────────
app.use('/auth',      require('./routes/auth.routes'));
app.use('/clientes',  require('./routes/cliente.routes'));
app.use('/dividas',   require('./routes/divida.routes'));
app.use('/parcelas',  require('./routes/parcela.routes'));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', projeto: 'ZERO PAPER', versao: '1.0.0' });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 ZERO PAPER rodando em http://localhost:${PORT}`);
});
