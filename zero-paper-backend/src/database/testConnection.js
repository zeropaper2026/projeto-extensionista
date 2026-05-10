// ============================================================
// ZERO PAPER – Teste de conexão com o banco
// Executar: node src/database/testConnection.js
// ============================================================

require('dotenv').config();
const prisma = require('../lib/prisma');

async function testarConexao() {
  console.log('🔌 Testando conexão com o banco de dados...\n');

  try {
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Conta registros em cada tabela
    const [funcionarios, clientes, dividas, parcelas, pagamentos] = await Promise.all([
      prisma.funcionario.count(),
      prisma.cliente.count(),
      prisma.divida.count(),
      prisma.parcela.count(),
      prisma.pagamento.count(),
    ]);

    console.log('📊 Estado atual do banco:');
    console.log(`   Funcionários : ${funcionarios}`);
    console.log(`   Clientes     : ${clientes}`);
    console.log(`   Dívidas      : ${dividas}`);
    console.log(`   Parcelas     : ${parcelas}`);
    console.log(`   Pagamentos   : ${pagamentos}`);

    // Lista clientes
    if (clientes > 0) {
      const lista = await prisma.cliente.findMany({
        orderBy: { nome: 'asc' },
      });
      console.log('\n👥 Clientes cadastrados:');
      lista.forEach(c =>
        console.log(`   [${c.id_cliente}] ${c.nome} – CPF: ${c.cpf}`)
      );
    }

    // Lista dívidas com parcelas
    if (dividas > 0) {
      const lista = await prisma.divida.findMany({
        include: {
          cliente: { select: { nome: true } },
          funcionario: { select: { nome: true } },
          parcelas: {
            orderBy: { numero: 'asc' },
            include: { pagamentos: true },
          },
        },
      });

      console.log('\n💰 Dívidas registradas:');
      lista.forEach(d => {
        console.log(`\n   Dívida #${d.id_divida} – ${d.cliente.nome}`);
        console.log(`   Produto    : ${d.descricao_produto}`);
        console.log(`   IMEI       : ${d.imei ?? 'não informado'}`);
        console.log(`   Total      : R$ ${Number(d.valor_total).toFixed(2)} em ${d.parcelas_total}x`);
        console.log(`   Status     : ${d.status.toUpperCase()}`);
        console.log(`   Registrado : ${d.data_registro.toISOString().split('T')[0]}`);
        console.log(`   Funcionário: ${d.funcionario.nome}`);
        d.parcelas.forEach(p => {
          const pago = Number(p.valor_pago_acumulado).toFixed(2);
          const total = Number(p.valor_parcela).toFixed(2);
          console.log(
            `     Parcela ${p.numero}: R$ ${total} – ${p.status.toUpperCase()}` +
            (p.pagamentos.length > 0 ? ` (pago: R$ ${pago})` : '')
          );
          p.pagamentos.forEach(pg =>
            console.log(
              `       └ Pagamento: R$ ${Number(pg.valor_pago).toFixed(2)} via ${pg.forma_pagamento} em ${pg.data_pagamento.toISOString().split('T')[0]}`
            )
          );
        });
      });
    }

    console.log('\n✅ Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('\n💡 Verifique se o DATABASE_URL no .env está correto.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testarConexao();
