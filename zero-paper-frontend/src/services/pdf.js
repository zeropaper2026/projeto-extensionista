// src/services/pdf.js
// Zero Paper – Baixa o PDF da dívida (rota autenticada: precisa do Bearer do api.js)

import api from "./api";

// Lê o nome enviado pelo backend (filename* em UTF-8 ou filename simples)
function nomeDoArquivo(cd) {
  if (!cd) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf8) { try { return decodeURIComponent(utf8[1]); } catch { /* cai no próximo */ } }
  const simples = /filename="?([^";]+)"?/i.exec(cd);
  return simples ? simples[1] : null;
}

export async function baixarPdfDivida(idDivida) {
  const res = await api.get(`/dividas/${idDivida}/pdf`, {
    responseType: "blob",
    timeout: 30_000,
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoArquivo(res.headers["content-disposition"]) ?? `comprovante-${idDivida}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Com responseType "blob", o erro do backend chega como Blob: lê o campo "erro" */
export async function mensagemErroPdf(err) {
  try {
    const data = err.response?.data;
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      if (json?.erro) return json.erro;
    }
  } catch { /* usa a mensagem padrão */ }
  if (err.code === "ERR_NETWORK") return "Erro de rede: backend offline.";
  return "Não foi possível gerar o PDF.";
}