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
| GET, POST | /clientes |
| GET, PATCH | /clientes/:id |
| GET, POST | /dividas |
| GET, PATCH | /dividas/:id |
| POST | /parcelas/:id/pagar |
| POST | /pagamentos/:id/estornar |
| GET, POST | /funcionarios |
| PATCH | /funcionarios/:id/permissoes |
| PATCH | /funcionarios/:id/senha |

(tabela completa, com permissões, no README da raiz do repositório)

---|---|
| POST | /auth/login |
| GET | /clientes |
| POST | /clientes |
| POST | /dividas |
| POST | /parcelas/:id/pagar |

---

## Status do Projeto

Backend do Incremento II: venda parcelada com juros e à vista, pagamento parcial, estorno,
atrasos automáticos, edição de cliente e de dívida, e Configurações do administrador
(funcionários, senhas e permissão de estorno).

Próximas etapas: geração de PDF, relatórios e dashboard completo.
