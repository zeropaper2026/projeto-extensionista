// ============================================================
// ZERO PAPER – Taxas de juros por faixa de parcelas
// Fonte: tabela de taxas praticada pela maquininha (BIOS iPhones)
// Regra de negócio: parcelamento limitado a no máximo 12x.
// ============================================================

const TAXAS_JUROS = [
  { min: 1, max: 7, taxa: 0.08 },   // até 7 vezes  → 8%
  { min: 8, max: 12, taxa: 0.12 },  // 8 até 12 vezes → 12%
];

const PARCELAS_MAXIMO = 12;

/**
 * Retorna a taxa de juros aplicável para uma quantidade de parcelas.
 * @param {number} parcelasTotal
 * @returns {number} taxa em decimal (ex.: 0.08 = 8%)
 * @throws {Error} se parcelasTotal estiver fora da faixa permitida (1 a 12)
 */
function obterTaxaJuros(parcelasTotal) {
  const faixa = TAXAS_JUROS.find(
    (f) => parcelasTotal >= f.min && parcelasTotal <= f.max
  );
  if (!faixa) {
    throw new Error(
      `Número de parcelas inválido: ${parcelasTotal}. O parcelamento é permitido em no máximo ${PARCELAS_MAXIMO}x.`
    );
  }
  return faixa.taxa;
}

/**
 * Calcula o valor total com juros a partir do valor base.
 * @param {number} valorBase
 * @param {number} parcelasTotal
 * @returns {{ valorBase: number, taxaAplicada: number, valorTotalComJuros: number }}
 */
function calcularValorComJuros(valorBase, parcelasTotal) {
  const taxaAplicada = obterTaxaJuros(parcelasTotal);
  const valorTotalComJuros = parseFloat((valorBase * (1 + taxaAplicada)).toFixed(2));
  return { valorBase, taxaAplicada, valorTotalComJuros };
}

module.exports = {
  TAXAS_JUROS,
  PARCELAS_MAXIMO,
  obterTaxaJuros,
  calcularValorComJuros,
};
