export function addMonths(date, months) {
  const d = new Date(date);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== dia) {
    d.setDate(0);
  }
  return d;
}

export function formatDateBR(date) {
  if (!(date instanceof Date) || isNaN(date)) return "—";
  return date.toLocaleDateString("pt-BR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}

export function toISODate(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  return date.toISOString().split("T")[0];
}

export function parseISODate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Datas vindas da API (@db.Date = meia-noite UTC): formata em UTC p/ não voltar 1 dia
export function formatDateUTC(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Hoje no fuso local (YYYY-MM-DD), sem o desvio do toISOString()
export function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}