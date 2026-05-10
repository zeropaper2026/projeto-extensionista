# Zero Paper Backend

API desenvolvida para gerenciamento de clientes, dívidas e pagamentos de um sistema interno de vendas.

## Tecnologias

- Node.js
- Express
- Prisma
- PostgreSQL
- JWT

## Como executar

```bash
git clone https://github.com/zeropaper2026/ProjetoExtensionista.git
cd zero-paper-backend
npm install
```

Configure o `.env` e execute:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Principais Rotas

| Método | Rota |
|---|---|
| POST | /auth/login |
| GET | /clientes |
| POST | /clientes |
| POST | /dividas |
| POST | /parcelas/:id/pagar |

---

## Status do Projeto

Backend em desenvolvimento ⌛.

Próximas etapas:
- Cadastro + Banco de dados
