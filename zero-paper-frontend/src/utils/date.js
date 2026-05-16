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