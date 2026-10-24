// ============================================================
// ZERO PAPER – Cria/atualiza funcionário com senha forte (4.12)
// Use em PRODUÇÃO no lugar do seed, e para trocar as senhas das
// contas de teste (admin / aline.almeida), que não podem ser
// apagadas por terem dívidas vinculadas.
//
// docker compose exec \
//   -e FUNC_LOGIN=admin -e FUNC_NOME="Leandro" -e FUNC_PAPEL=admin \
//   -e FUNC_SENHA='uma-senha-longa-e-unica' backend node prisma/criarFuncionario.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const { FUNC_LOGIN, FUNC_NOME, FUNC_SENHA } = process.env;
  const papel = process.env.FUNC_PAPEL || 'atendente';

  if (!FUNC_LOGIN || !FUNC_SENHA) throw new Error('Defina FUNC_LOGIN e FUNC_SENHA.');
  if (!['admin', 'atendente'].includes(papel)) throw new Error('FUNC_PAPEL deve ser admin ou atendente.');
  if (FUNC_SENHA.length < 12) throw new Error('Senha deve ter ao menos 12 caracteres.');

  const senha = await bcrypt.hash(FUNC_SENHA, 12);
  const f = await prisma.funcionario.upsert({
    where:  { login: FUNC_LOGIN },
    update: { senha, papel, ...(FUNC_NOME && { nome: FUNC_NOME }) },
    create: { login: FUNC_LOGIN, nome: FUNC_NOME || FUNC_LOGIN, senha, papel },
  });
  console.log(`✅ Funcionário "${f.login}" (${f.papel}) salvo.`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
