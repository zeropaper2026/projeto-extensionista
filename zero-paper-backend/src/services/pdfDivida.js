// ============================================================
// ZERO PAPER – Geração do PDF da dívida (comprovante + extrato)
// Biblioteca: pdfkit (servidor). Identidade BIOS iPhones (#414A85).
// ============================================================

const fs   = require('fs');
const path = require('path');
const {
  brl, dataUTC, dataHoraBR, cpfMask, arred, ehAVista,
  FORMA_LABEL, STATUS_PARCELA_LABEL, STATUS_DIVIDA_LABEL,
} = require('../utils/formatadores');

const COR   = '#414A85';
const TEXTO = '#111827';
const CINZA = '#6B7280';
const ZEBRA = '#F1F2F8';
const LOGO  = path.join(__dirname, '..', 'assets', 'bios-logo.jpg'); // opcional

function garantir(doc, altura) {
  if (doc.y + altura > doc.page.height - 60) doc.addPage();
}

function secao(doc, titulo, L, W) {
  garantir(doc, 50);
  doc.y += 8;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COR).text(titulo.toUpperCase(), L, doc.y, { width: W });
  const y = doc.y + 2;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.8).strokeColor(COR).stroke();
  doc.y = y + 8;
}

function campo(doc, rotulo, valor, x, y, w) {
  const txt = valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  doc.font('Helvetica').fontSize(8).fillColor(CINZA).text(rotulo, x, y, { width: w });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXTO).text(txt, x, y + 11, { width: w });
  return 11 + doc.heightOfString(txt, { width: w }) + 8;
}

function grade(doc, pares, colunas, L, W) {
  const gap = 12;
  const w = (W - gap * (colunas - 1)) / colunas;
  for (let i = 0; i < pares.length; i += colunas) {
    garantir(doc, 45);
    const y0 = doc.y;
    let alturaLinha = 0;
    pares.slice(i, i + colunas).forEach(([rot, val], j) => {
      alturaLinha = Math.max(alturaLinha, campo(doc, rot, val, L + j * (w + gap), y0, w));
    });
    doc.y = y0 + alturaLinha;
  }
}

function tabela(doc, cols, linhas, L, W) {
  const H = 18;
  const cabecalho = () => {
    const y = doc.y;
    doc.rect(L, y, W, H).fill(COR);
    let x = L;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
    cols.forEach((c) => {
      doc.text(c.t, x + 4, y + 5, { width: c.w - 8, align: c.a || 'left', lineBreak: false });
      x += c.w;
    });
    doc.y = y + H;
  };

  garantir(doc, 60);
  cabecalho();

  linhas.forEach((linha, i) => {
    if (doc.y + H > doc.page.height - 60) {
      doc.addPage();
      cabecalho();
    }
    const y = doc.y;
    if (i % 2 === 0) doc.rect(L, y, W, H).fill(ZEBRA);
    let x = L;
    doc.font('Helvetica').fontSize(9).fillColor(TEXTO);
    cols.forEach((c, k) => {
      doc.text(String(linha[k] ?? '—'), x + 4, y + 5, {
        width: c.w - 8, height: 12, ellipsis: true, align: c.a || 'left',
      });
      x += c.w;
    });
    doc.y = y + H;
  });
  doc.y += 4;
}

/**
 * Desenha o PDF no `doc` (PDFKit) e NÃO finaliza (quem chama faz doc.end()).
 * Requer `bufferPages: true` no PDFDocument (rodapé com "Página X de Y").
 * @param {PDFDocument} doc
 * @param {object} d          dívida com cliente e parcelas(+pagamentos)
 * @param {string} emitidoPor nome do funcionário que emitiu
 */
function montarPdfDivida(doc, d, emitidoPor) {
  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const aVista = ehAVista(d);

  // Faixa pequena nas páginas seguintes
  doc.on('pageAdded', () => {
    doc.rect(0, 0, doc.page.width, 26).fill(COR);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
      .text('BIOS iPHONES', L, 9, { width: W, lineBreak: false });
    doc.y = 46;
  });

  // ── Cabeçalho ──────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 78).fill(COR);
  let xTitulo = L;
  if (fs.existsSync(LOGO)) {
    try { doc.image(LOGO, L, 16, { height: 46 }); xTitulo = L + 60; } catch { /* ignora logo inválido */ }
  }
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF').text('BIOS iPHONES', xTitulo, 20, { lineBreak: false });
  doc.font('Helvetica').fontSize(10).fillColor('#D7D9EA')
    .text('Comprovante de venda e extrato de pagamentos', xTitulo, 46, { lineBreak: false });
  doc.y = 92;

  // ── Valores ────────────────────────────────────────────
  const totalPago = arred(d.parcelas.reduce((s, p) => s + Number(p.valor_pago_acumulado), 0));
  const saldo     = aVista ? 0 : Math.max(0, arred(Number(d.valor_total) - totalPago));
  const taxaPct   = `${arred(Number(d.taxa_aplicada ?? 0) * 100).toString().replace('.', ',')}%`;
  const valorBase = d.valor_base ?? d.valor_total;

  // ── Cliente ────────────────────────────────────────────
  secao(doc, 'Cliente', L, W);
  grade(doc, [
    ['Nome', d.cliente.nome],
    ['CPF', cpfMask(d.cliente.cpf)],
    ['Telefone', d.cliente.telefone],
  ], 3, L, W);

  // ── Produto ────────────────────────────────────────────
  secao(doc, 'Produto', L, W);
  grade(doc, [
    ['Descrição', d.descricao_produto],
    ['IMEI / Nº de série', d.imei],
  ], 2, L, W);
  if (d.informacoes_adicionais) {
    doc.font('Helvetica').fontSize(8).fillColor(CINZA).text('Informações adicionais', L, doc.y, { width: W });
    doc.font('Helvetica').fontSize(9.5).fillColor(TEXTO).text(d.informacoes_adicionais, L, doc.y + 2, { width: W });
    doc.y += 6;
  }

  // ── Condições ──────────────────────────────────────────
  secao(doc, 'Condições da venda', L, W);
  const condicoes = [
    ['Tipo de venda', aVista ? 'À vista' : `Parcelado em ${d.parcelas_total}x`],
  ];
  if (d.forma_pagamento) condicoes.push(['Forma de pagamento', FORMA_LABEL[d.forma_pagamento] ?? d.forma_pagamento]);
  condicoes.push([aVista ? 'Data da compra' : 'Data do registro', dataUTC(d.data_registro)]);
  condicoes.push(
    ['Valor do produto', brl(valorBase)],
    ['Taxa aplicada', aVista ? 'Sem taxa' : taxaPct],
    ['Total da venda', brl(d.valor_total)],
    ['Total pago', brl(totalPago)],
    ['Saldo devedor', brl(saldo)],
    ['Situação', STATUS_DIVIDA_LABEL[d.status] ?? d.status],
  );
  grade(doc, condicoes, 3, L, W);

  // ── Parcelas ───────────────────────────────────────────
  secao(doc, aVista ? 'Pagamento' : 'Parcelas e vencimentos', L, W);
  if (aVista) {
    doc.font('Helvetica').fontSize(10).fillColor(TEXTO)
      .text(`Venda à vista, sem parcelas. Data da compra: ${dataUTC(d.data_registro)}.`, L, doc.y, { width: W });
    doc.y += 4;
  } else {
    const fixas = [55, 110, 105, 105];
    const cols = [
      { t: 'Parcela', w: fixas[0] },
      { t: 'Vencimento', w: fixas[1] },
      { t: 'Valor', w: fixas[2], a: 'right' },
      { t: 'Pago', w: fixas[3], a: 'right' },
      { t: 'Situação', w: W - fixas.reduce((a, b) => a + b, 0) },
    ];
    tabela(doc, cols, d.parcelas.map((p) => [
      `${p.numero}/${d.parcelas_total}`,
      dataUTC(p.data_vencimento),
      brl(p.valor_parcela),
      brl(p.valor_pago_acumulado),
      STATUS_PARCELA_LABEL[p.status] ?? p.status,
    ]), L, W);
  }

  // ── Extrato de pagamentos ──────────────────────────────
  secao(doc, 'Extrato de pagamentos', L, W);
  const pagamentos = d.parcelas
    .flatMap((p) => p.pagamentos.map((pg) => ({ ...pg, numero: p.numero })))
    .sort((a, b) => new Date(a.data_pagamento) - new Date(b.data_pagamento) || a.id_pagamento - b.id_pagamento);

  if (pagamentos.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(CINZA).text('Nenhum pagamento registrado.', L, doc.y, { width: W });
  } else {
    const fixas = [70, 55, 75, 90];
    const cols = [
      { t: 'Data', w: fixas[0] },
      { t: 'Parcela', w: fixas[1] },
      { t: 'Forma', w: fixas[2] },
      { t: 'Valor', w: fixas[3], a: 'right' },
      { t: 'Observação', w: W - fixas.reduce((a, b) => a + b, 0) },
    ];
    tabela(doc, cols, pagamentos.map((pg) => [
      dataUTC(pg.data_pagamento),
      pg.numero,
      FORMA_LABEL[pg.forma_pagamento] ?? pg.forma_pagamento,
      brl(pg.valor_pago),
      // campo opcional: só existe depois do card de Estorno
      (pg.estornado_em ? '[ESTORNADO] ' : '') + (pg.observacao ?? ''),
    ]), L, W);
  }

  // ── Rodapé em todas as páginas ─────────────────────────
  const emissao = `Emitido em ${dataHoraBR()}${emitidoPor ? ` por ${emitidoPor}` : ''}  ·  ZERO PAPER`;
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const margemInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita o pdfkit criar página nova ao escrever no rodapé
    const y = doc.page.height - 32;
    doc.moveTo(L, y - 6).lineTo(L + W, y - 6).lineWidth(0.5).strokeColor('#D1D5DB').stroke();
    doc.font('Helvetica').fontSize(8).fillColor(CINZA)
      .text(emissao, L, y, { width: W - 80, lineBreak: false })
      .text(`Página ${i - start + 1} de ${count}`, L, y, { width: W, align: 'right', lineBreak: false });
    doc.page.margins.bottom = margemInferior;
  }
}

module.exports = { montarPdfDivida };