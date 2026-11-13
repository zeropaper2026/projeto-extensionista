// ============================================================
// ZERO PAPER – Formatadores e helpers compartilhados
// (PDF e Relatórios). Datas sempre em UTC para não "voltar um dia".
// ============================================================

/** R$ 1.234,56 (troca o espaço não separável por espaço comum, p/ o PDF) */
function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(valor) || 0)
    .replace(/\u00a0/g, ' ');
}

/** Date (@db.Date, meia-noite UTC) → dd/mm/aaaa, sem deslocar fuso */
function dataUTC(data) {
  if (!data) return '—';
  const d = new Date(data);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Date → "aaaa-mm-dd" (UTC) */
function isoData(data) {
  return new Date(data).toISOString().slice(0, 10);
}

/** Data/hora de emissão no horário de Brasília/Tocantins (UTC-3) */
function dataHoraBR(d = new Date()) {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** "hoje" no Brasil (UTC-3) em aaaa-mm-dd */
function hojeBR() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function cpfMask(cpf) {
  const d = String(cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d || '—';
}

/** Arredonda a 2 casas (evita 0.1 + 0.2) */
function arred(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Venda à vista? Lê o campo de tipo de venda da dívida (card 4.2).
 * Aceita "a_vista", "avista", "A_VISTA", "À vista"... Se o campo não existir,
 * considera parcelada. Se o seu schema usar outro nome de campo, ajuste AQUI.
 */
const CAMPO_TIPO_VENDA = 'tipo_venda';
function ehAVista(divida) {
  const t = divida?.[CAMPO_TIPO_VENDA];
  if (t == null) return false;
  return String(t).normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase().includes('vista');
}

const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito' };
const STATUS_PARCELA_LABEL = { pendente: 'Pendente', paga: 'Paga', atrasada: 'Atrasada', parcial: 'Parcial' };
const STATUS_DIVIDA_LABEL = { ativa: 'Ativa', quitada: 'Quitada', atrasada: 'Atrasada' };

module.exports = {
  brl, dataUTC, isoData, dataHoraBR, hojeBR, cpfMask, arred,
  ehAVista, CAMPO_TIPO_VENDA, FORMA_LABEL, STATUS_PARCELA_LABEL, STATUS_DIVIDA_LABEL,
};
