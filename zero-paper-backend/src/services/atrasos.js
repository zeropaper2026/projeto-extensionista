// ============================================================
// ZERO PAPER – Pagamento atrasado (4.5)
// - Marca como 'atrasada' parcelas vencidas e não pagas
// - Mantém o status da dívida coerente (ativa / atrasada / quitada)
// - Venda à vista (nasce quitada, parcela 'paga') nunca entra em atraso:
//   só são tocadas parcelas 'pendente' / 'parcial'.
// ============================================================

const prisma = require('../lib/prisma');

const UM_DIA_MS = 86_400_000;
let ultimaExecucao = 0;

/** "Hoje" no fuso de Tocantins (UTC-3), como data UTC à meia-noite. */
function hojeUTC() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return new Date(`${s}T00:00:00.000Z`);
}

/** Dias de atraso (0 se ainda não venceu). Vence hoje = não atrasada. */
function diasEmAtraso(vencimento, hoje = hojeUTC()) {
  const diff = hoje.getTime() - new Date(vencimento).getTime();
  return diff > 0 ? Math.floor(diff / UM_DIA_MS) : 0;
}

/**
 * Atualiza parcelas/dívidas atrasadas. Com throttle de 60 s para poder ser
 * chamada em cada consulta sem pesar no banco (use force=true para ignorar).
 */
async function atualizarStatusAtrasos(force = false) {
  const agora = Date.now();
  if (!force && agora - ultimaExecucao < 60_000) return;
  ultimaExecucao = agora;

  const hoje = hojeUTC();
  await prisma.$transaction([
    prisma.parcela.updateMany({
      where: { status: { in: ['pendente', 'parcial'] }, data_vencimento: { lt: hoje } },
      data: { status: 'atrasada' },
    }),
    prisma.divida.updateMany({
      where: { status: 'ativa', parcelas: { some: { status: 'atrasada' } } },
      data: { status: 'atrasada' },
    }),
    prisma.divida.updateMany({
      where: { status: 'atrasada', parcelas: { none: { status: 'atrasada' } } },
      data: { status: 'ativa' },
    }),
  ]);
}

/** Recalcula o status da dívida a partir das parcelas (usar após pagamento). */
async function recalcularStatusDivida(db, id_divida) {
  const parcelas = await db.parcela.findMany({ where: { id_divida }, select: { status: true } });
  let status = 'ativa';
  if (parcelas.length && parcelas.every((p) => p.status === 'paga')) status = 'quitada';
  else if (parcelas.some((p) => p.status === 'atrasada')) status = 'atrasada';
  await db.divida.update({ where: { id_divida }, data: { status } });
  return status;
}

/** Rotina automática: roda ao iniciar e a cada hora. */
function iniciarRotinaAtrasos() {
  const rodar = () =>
    atualizarStatusAtrasos(true).catch((e) => console.error('[ATRASOS] Falha na rotina:', e.code ?? e.message));
  rodar();
  setInterval(rodar, 60 * 60 * 1000).unref();
}

module.exports = { hojeUTC, diasEmAtraso, atualizarStatusAtrasos, recalcularStatusDivida, iniciarRotinaAtrasos };
