// ============================================================
// ZERO PAPER – PDF da dívida
// GET /dividas/:id/pdf  → comprovante da venda + extrato (application/pdf)
// Montado em /dividas ANTES de divida.routes.js (ver server.js).
// ============================================================

const router      = require('express').Router();
const PDFDocument = require('pdfkit');
const prisma      = require('../lib/prisma');
const autenticar  = require('../middlewares/autenticar');
const { montarPdfDivida } = require('../services/pdfDivida');

router.get('/:id/pdf', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID da dívida inválido.' });
  }

  try {
    const divida = await prisma.divida.findUnique({
      where: { id_divida: id },
      include: {
        cliente: true,
        parcelas: {
          orderBy: { numero: 'asc' },
          include: { pagamentos: { orderBy: [{ data_pagamento: 'asc' }, { id_pagamento: 'asc' }] } },
        },
      },
    });
    if (!divida) return res.status(404).json({ erro: 'Dívida não encontrada.' });

    const func = await prisma.funcionario.findUnique({
      where: { id_funcionario: req.funcionario.id },
      select: { nome: true },
    });

    // Gera tudo antes de responder: um erro vira JSON 500, e não um PDF quebrado
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 50, left: 40, right: 40 },
      bufferPages: true,
      info: { Title: 'Comprovante de venda – BIOS iPhones', Author: 'ZERO PAPER' },
    });
    const partes = [];
    doc.on('data', (c) => partes.push(c));
    const pronto = new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    montarPdfDivida(doc, divida, func?.nome);
    doc.end();
    await pronto;

    const pdf = Buffer.concat(partes);
    res.setHeader('Content-Type', 'application/pdf');
    // Nome do arquivo = nome do cliente (ex.: "comprovante-Luís Paulo.pdf")
    const nomeLimpo = divida.cliente.nome.replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() || 'cliente';
    const nomeAscii = nomeLimpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comprovante-${nomeAscii || 'cliente'}.pdf"; filename*=UTF-8''${encodeURIComponent(`comprovante-${nomeLimpo}.pdf`)}`
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); // o frontend lê o nome
    res.setHeader('Content-Length', pdf.length);
    return res.send(pdf);
  } catch (error) {
    // sem CPF nem dados pessoais no log (LGPD)
    console.error('[PDF] Erro ao gerar PDF da dívida', id, error.message);
    return res.status(500).json({ erro: 'Erro ao gerar o PDF.' });
  }
});

module.exports = router;