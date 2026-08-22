// src/constants/taxasJuros.js
// Zero Paper – Taxas de juros por faixa de parcelas (espelha o backend)
// Fonte: tabela de taxas da maquininha (BIOS iPhones)

export const TAXAS_JUROS = [
  { min: 1, max: 7, taxa: 0.08 },   // até 7 vezes  → 8%
  { min: 8, max: 12, taxa: 0.12 },  // 8 até 12 vezes → 12%
];

export const PARCELAS_MAXIMO = 12;

/**
 * Retorna a taxa aplicável (decimal) para uma quantidade de parcelas,
 * ou null se estiver fora da faixa permitida.
 */
export function obterTaxaJuros(parcelasTotal) {
  const faixa = TAXAS_JUROS.find(
    (f) => parcelasTotal >= f.min && parcelasTotal <= f.max
  );
  return faixa ? faixa.taxa : null;
}
