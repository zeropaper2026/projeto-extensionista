// src/utils/currency.js
// Zero Paper – Formatação monetária BRL

/**
 * Formata número como moeda brasileira.
 * Ex.: 1500.5 → "R$ 1.500,50"
 */
export function formatBRL(value) {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style:                 "currency",
    currency:              "BRL",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

/**
 * Remove formatação e retorna float.
 * Ex.: "1.500,50" → 1500.50
 */
export function parseBRL(str) {
  if (!str) return 0;
  return parseFloat(
    String(str)
      .replace(/\./g, "")   // remove separadores de milhar
      .replace(",", ".")     // troca vírgula decimal por ponto
  ) || 0;
}
