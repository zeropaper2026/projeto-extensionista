# 📱 ZERO PAPER

Sistema interno da **BIOS iPhones** para controle de vendas a prazo e dívidas de clientes, substituindo os registros em papel por um fluxo digital seguro e centralizado.

Projeto Extensionista Integrador II — UNITINS (TADS).

---

## ✨ Funcionalidades

- Login de funcionários (JWT) com perfis **administrador** e **atendente**
- Cadastro, busca e edição de clientes
- Venda **parcelada** (juros por faixa: 8% de 1 a 7x, 12% de 8 a 12x) ou **à vista** (sem juros)
- Parcelas geradas automaticamente, com pagamento total ou parcial
- Atraso destacado automaticamente nas parcelas vencidas
- Busca e edição de dívidas
- Estorno de pagamento com motivo, para administrador ou funcionário autorizado
- Configurações do administrador: funcionários, troca de senha e permissão de estorno

---

## 🧱 Tecnologias

| Camada         | Tecnologia                                              |
|----------------|---------------------------------------------------------|
| Frontend       | React 18 + Vite + Tailwind CSS 3 + React Router + Axios |
| Backend        | Node.js + Express                                       |
| Banco de dados | PostgreSQL 16 + Prisma ORM                              |
| Autenticação   | JWT + bcryptjs                                          |
| Infraestrutura | Docker Compose (local) · Vercel (frontend) · Railway (backend + banco) |

```
PROJETOEXTENSIONISTA/
├── zero-paper-backend/    ← API + Prisma + docker-compose
└── zero-paper-frontend/   ← Interface React
```

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Docker e Node.js 18+.

### Backend (Docker)

```bash
cd zero-paper-backend
docker compose up -d
```

O compose sobe o PostgreSQL e a API em `http://localhost:3333`, aplicando as migrations na inicialização.

> Rode os comandos do Prisma **sempre dentro do container**, para não deixar o Prisma Client desatualizado:
> ```bash
> docker compose exec backend npx prisma generate
> docker compose exec backend npx prisma migrate deploy
> docker compose restart backend
> ```

### Primeiro acesso

Crie o administrador com senha forte (mínimo de 12 caracteres):

```bash
docker compose exec \
  -e FUNC_LOGIN=admin -e FUNC_NOME="Nome do Admin" -e FUNC_PAPEL=admin \
  -e FUNC_SENHA='uma-senha-longa-e-unica' backend node prisma/criarFuncionario.js
```

Os demais funcionários são cadastrados pelo próprio sistema, em **Configurações**.

### Frontend

```bash
cd zero-paper-frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`. A API padrão é `http://localhost:3333`; para outro endereço, defina `VITE_API_URL` em `.env.local`.

---

## ⚙️ Variáveis de ambiente (backend)

| Variável         | Descrição                                                         |
|------------------|-------------------------------------------------------------------|
| `DATABASE_URL`   | String de conexão do PostgreSQL                                   |
| `JWT_SECRET`     | Segredo do JWT — mínimo de 32 caracteres aleatórios em produção   |
| `JWT_EXPIRES_IN` | Validade do token (padrão `8h`)                                   |
| `CORS_ORIGIN`    | Origem(ns) do frontend permitidas (obrigatória em produção)       |
| `PORT`           | Porta da API (padrão `3333`)                                      |

---

## 🌐 Rotas da API

| Método  | Rota                           | Descrição                                          | Acesso               |
|---------|--------------------------------|----------------------------------------------------|----------------------|
| `POST`  | `/auth/login`                  | Autenticação, retorna JWT                          | público              |
| `GET`   | `/clientes?q=`                 | Busca clientes por nome ou CPF                     | autenticado          |
| `GET`   | `/clientes/inadimplentes`      | Clientes com parcelas em atraso                    | autenticado          |
| `POST`  | `/clientes`                    | Cadastra cliente                                   | autenticado          |
| `GET`   | `/clientes/:id`                | Cliente com dívidas, parcelas e pagamentos         | autenticado          |
| `PATCH` | `/clientes/:id`                | Edita cliente                                      | autenticado          |
| `GET`   | `/dividas?q=&status=`          | Busca dívidas (cliente, produto, IMEI, status)     | autenticado          |
| `POST`  | `/dividas`                     | Registra dívida (parcelada ou à vista)             | autenticado          |
| `GET`   | `/dividas/:id`                 | Dívida com parcelas e pagamentos                   | autenticado          |
| `PATCH` | `/dividas/:id`                 | Edita dívida                                       | admin                |
| `POST`  | `/parcelas/:id/pagar`          | Registra pagamento (total ou parcial)              | autenticado          |
| `POST`  | `/pagamentos/:id/estornar`     | Estorna pagamento (motivo obrigatório)             | admin ou autorizado  |
| `GET`   | `/funcionarios`                | Lista funcionários                                 | admin                |
| `POST`  | `/funcionarios`                | Cadastra funcionário                               | admin                |
| `PATCH` | `/funcionarios/:id/permissoes` | Autoriza ou revoga estorno                         | admin                |
| `PATCH` | `/funcionarios/:id/senha`      | Troca senha (própria; o admin troca a de qualquer um) | autenticado       |

Os erros da API seguem o formato `{ "erro": "mensagem" }`.

---

## 📋 Status

| Incremento     | Entrega                                                                 | Status           |
|----------------|-------------------------------------------------------------------------|------------------|
| Incremento I   | Juros por faixa de parcelas e identidade visual                         | ✅ Concluído     |
| Incremento II  | Venda à vista, pagamento parcial, atraso, edição, estorno, Configurações | ✅ Em validação  |
| Próximos passos| Geração de PDF, relatórios e dashboard completo                         | ⏳ Planejado     |