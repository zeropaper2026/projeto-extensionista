// ============================================================
// ZERO PAPER – Helpers de validação de entrada (4.12 Segurança)
// ============================================================

/** Retorna inteiro positivo ou null (ids de rota/corpo). */
function idInteiro(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Texto aparado e limitado; '' se não for string. */
function textoLimpo(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function cpfLimpo(valor) {
  return typeof valor === 'string' ? valor.replace(/\D/g, '') : '';
}

function emailValido(valor) {
  return typeof valor === 'string' && valor.length <= 120 && /^\S+@\S+\.\S+$/.test(valor);
}

/** Arredonda para 2 casas (valores monetários). */
function arredondar(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

module.exports = { idInteiro, textoLimpo, cpfLimpo, emailValido, arredondar };
