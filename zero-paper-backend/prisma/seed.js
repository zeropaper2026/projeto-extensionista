// ============================================================
// ZERO PAPER – Seed (dados iniciais para teste)
// Executar: node prisma/seed.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ── 1. Funcionários ───────────────────────────────────────
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaAtend = await bcrypt.hash('atend123', 10);

  const admin = await prisma.funcionario.upsert({
    where: { login: 'admin' },
    update: {},
    create: { nome: 'Administrador', login: 'admin', senha: senhaAdmin, papel: 'admin' },
  });

  const atendente = await prisma.funcionario.upsert({
    where: { login: 'aline.almeida' },
    update: {},
    create: { nome: 'Aline Almeida', login: 'aline.almeida', senha: senhaAtend, papel: 'atendente' },
  });

  console.log(`✅ Funcionários criados: ${admin.nome}, ${atendente.nome}`);

  // ── 2. Clientes ───────────────────────────────────────────
  const cliente1 = await prisma.cliente.upsert({
    where: { cpf: '12345678901' },
    update: {},
    create: {
      nome: 'Maria Oliveira',
      cpf: '12345678901',
      telefone: '(63) 99999-1111',
      endereco: 'Rua das Palmeiras, 10 – Palmas/TO',
      email: 'maria@email.com',
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { cpf: '98765432100' },
    update: {},
    create: {
      nome: 'Carlos Souza',
      cpf: '98765432100',
      telefone: '(63) 98888-2222',
      endereco: 'Av. Teotônio Segurado, 200 – Palmas/TO',
      email: 'carlos@email.com',
    },
  });

  console.log(`✅ Clientes criados: ${cliente1.nome}, ${cliente2.nome}`);

  // ── 3. Dívida com parcelas para Maria ─────────────────────
  const valorTotal = 900.00;
  const numParcelas = 3;
  const valorParcela = valorTotal / numParcelas; // 300,00 cada

  const divida1 = await prisma.divida.create({
    data: {
      id_cliente:    cliente1.id_cliente,
      id_funcionario: atendente.id_funcionario,
      valor_total:    valorTotal,
      data_registro:  new Date(),
      descricao_produto: 'Samsung Galaxy A55 – 128GB',
      imei: '351234567890123',
      parcelas_total: numParcelas,
      status: 'ativa',
      parcelas: {
        create: Array.from({ length: numParcelas }, (_, i) => {
          const vencimento = new Date();
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          return {
            numero: i + 1,
            valor_parcela: valorParcela,
            valor_pago_acumulado: i === 0 ? valorParcela : 0,
            data_vencimento: vencimento,
            status: i === 0 ? 'paga' : 'pendente',
          };
        }),
      },
    },
    include: { parcelas: true },
  });

  console.log(`✅ Dívida criada: ${divida1.descricao_produto} – R$ ${valorTotal} em ${numParcelas}x`);

  // ── 4. Registrar pagamento da parcela 1 ───────────────────
  const parcela1 = divida1.parcelas.find(p => p.numero === 1);

  await prisma.pagamento.create({
    data: {
      id_parcela:     parcela1.id_parcela,
      data_pagamento: new Date(),
      valor_pago:     valorParcela,
      forma_pagamento: 'pix',
      observacao: 'Pago via PIX – comprovante recebido',
    },
  });

  console.log(`✅ Pagamento registrado: Parcela 1 – R$ ${valorParcela} (PIX)`);

  // ── 5. Dívida em atraso para Carlos ───────────────────────
  const vencimentoPassado = new Date();
  vencimentoPassado.setMonth(vencimentoPassado.getMonth() - 1);

  const divida2 = await prisma.divida.create({
    data: {
      id_cliente:     cliente2.id_cliente,
      id_funcionario: atendente.id_funcionario,
      valor_total:    450.00,
      data_registro:  vencimentoPassado,
      descricao_produto: 'Moto G54 – 256GB',
      parcelas_total: 2,
      status: 'atrasada',
      parcelas: {
        create: [
          {
            numero: 1,
            valor_parcela: 225.00,
            valor_pago_acumulado: 0,
            data_vencimento: vencimentoPassado,
            status: 'atrasada',
          },
          {
            numero: 2,
            valor_parcela: 225.00,
            valor_pago_acumulado: 0,
            data_vencimento: new Date(new Date().setDate(new Date().getDate() + 15)),
            status: 'pendente',
          },
        ],
      },
    },
  });

  console.log(`✅ Dívida em atraso criada: ${divida2.descricao_produto}`);

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('📋 Credenciais de acesso:');
  console.log('   Admin     → login: admin      | senha: admin123');
  console.log('   Atendente → login:aline.almeida | senha: atend123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
