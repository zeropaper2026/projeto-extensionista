// ============================================================
// ZERO PAPER – Servidor Express (entry point) — endurecido (4.12)
// Novas dependências: npm install helmet express-rate-limit
// ============================================================

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { iniciarRotinaAtrasos } = require('./services/atrasos');

const app  = express();
const PORT = process.env.PORT || 3333;
const PROD = process.env.NODE_ENV === 'production';

// ── Segredos obrigatórios ────────────────────────────────────
const secret = process.env.JWT_SECRET || '';
const secretFraco = secret.length < 32 || /troque|secret|123|senha/i.test(secret);
if (secretFraco) {
  const msg = 'JWT_SECRET ausente ou fraco (mín. 32 caracteres aleatórios).';
  if (PROD) { console.error(`❌ ${msg}`); process.exit(1); }
  console.warn(`⚠️  ${msg} Aceito apenas em desenvolvimento.`);
}

// ── CORS restrito à(s) origem(ns) do frontend ────────────────
// CORS_ORIGIN="https://seu-front.vercel.app" (várias: separar por vírgula)
const origens = (process.env.CORS_ORIGIN || (PROD ? '' : 'http://localhost:5173'))
  .split(',').map((o) => o.trim()).filter(Boolean);
if (PROD && origens.length === 0) {
  console.error('❌ CORS_ORIGIN obrigatório em produção.');
  process.exit(1);
}

app.set('trust proxy', 1); // Railway: IP real do cliente para o rate limit
app.use(helmet());
app.use(cors({ origin: origens, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '50kb' }));

// ── Rate limit ───────────────────────────────────────────────
const msgLimite = { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false, message: msgLimite,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false, message: msgLimite,
});
app.use('/auth/login', loginLimiter);
app.use(apiLimiter);

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

// ── Erros (JSON inválido, CORS etc.) — sem vazar detalhes ────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (err.type === 'entity.too.large')    return res.status(413).json({ erro: 'Requisição muito grande.' });
  console.error('[ERRO]', err.name, err.code ?? '');
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 ZERO PAPER rodando na porta ${PORT}`);
  iniciarRotinaAtrasos();
});
