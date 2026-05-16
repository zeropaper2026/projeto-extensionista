# 📱 ZERO PAPER

> Elimina completamente o uso de papel no controle de vendas e finanças da Bios Center, transformando processos manuais em fluxos digitais eficientes, seguros e em tempo real.

---

## 📁 Estrutura do Repositório

```
PROJETOEXTENSIONISTA/
├── zero-paper-backend/     ← API Node.js + Prisma + PostgreSQL
└── zero-paper-frontend/    ← Interface React + Vite
```

---

## 🧱 Tecnologias

| Camada      | Tecnologia                              |
|-------------|-----------------------------------------|
| Frontend    | React 18, Vite                          |
| Backend     | Node.js, Express                        |
| ORM         | Prisma 5                                |
| Banco       | PostgreSQL 17 (via Docker)              |
| Auth        | JWT (jsonwebtoken) + bcryptjs           |

---

## 🗄️ Banco de Dados — Modelos

| Tabela         | Descrição                                      |
|----------------|------------------------------------------------|
| `funcionario`  | Usuários do sistema (admin / atendente)        |
| `cliente`      | Clientes cadastrados                           |
| `divida`       | Dívidas vinculadas a um cliente e funcionário  |
| `parcela`      | Parcelas de cada dívida                        |
| `pagamento`    | Pagamentos realizados por parcela              |

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 1. Subir o banco de dados (Docker)

```bash
docker run -d \
  --name zeropaper-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=zeropaper \
  -p 5432:5432 \
  postgres:15
```

---

### 2. Backend

```bash
cd zero-paper-backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e confirme a linha:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zeropaper"
# JWT_SECRET="sua_chave_secreta"

# Gerar client Prisma e criar tabelas
npm run db:generate
npm run db:push

# Popular banco com dados de teste
npm run db:seed

# Iniciar servidor (porta 3333)
npm run dev
```

O backend estará disponível em: `http://localhost:3333`

---

### 3. Frontend

```bash
cd zero-paper-frontend

# Instalar dependências
npm install

# Configurar variável de ambiente
cp .env.example .env.local
# O arquivo já vem pronto com:
# VITE_API_URL=http://localhost:3333

# Iniciar aplicação (porta 5173)
npm run dev
```

A aplicação estará disponível em: `http://localhost:5173`

---

## 🔑 Credenciais de Teste

| Papel      | Login           | Senha      |
|------------|-----------------|------------|
| Admin      | `admin`         | `admin123` |
| Atendente  | `aline.almeida` | `atend123` |

---

## 🌐 Rotas da API

| Método  | Rota                    | Descrição                        | Auth |
|---------|-------------------------|----------------------------------|------|
| `POST`  | `/auth/login`           | Autenticação, retorna JWT        | ✗    |
| `GET`   | `/clientes`             | Lista todos os clientes          | ✓    |
| `POST`  | `/clientes`             | Cadastra novo cliente            | ✓    |
| `POST`  | `/dividas`              | Registra nova dívida             | ✓    |
| `PATCH` | `/parcelas/:id/pagar`   | Registra pagamento de parcela    | ✓    |

---

## 🖥️ Fluxo do MVP (Sprint 2)

```
[Login] ──► autenticação JWT ──► [Cadastro de Cliente] ──► salvo no banco
```

1. Funcionário acessa a tela de login
2. Informa login e senha → API valida e retorna token JWT
3. Redirecionado direto para o formulário de cadastro de clientes
4. Preenche os dados → enviados via `POST /clientes` com o token no header
5. Cliente salvo no PostgreSQL com confirmação na tela

---

## 📦 Scripts disponíveis

### Backend (`zero-paper-backend/`)

| Script           | O que faz                              |
|------------------|----------------------------------------|
| `npm run dev`    | Inicia com nodemon (hot reload)        |
| `npm run start`  | Inicia em produção                     |
| `npm run db:generate` | Gera o Prisma Client              |
| `npm run db:push`     | Sincroniza schema com o banco     |
| `npm run db:seed`     | Popula banco com dados de teste   |
| `npm run db:studio`   | Abre o Prisma Studio (GUI)        |
| `npm run db:reset`    | Reseta todas as migrations        |

### Frontend (`zero-paper-frontend/`)

| Script          | O que faz                         |
|-----------------|-----------------------------------|
| `npm run dev`   | Inicia em desenvolvimento         |
| `npm run build` | Gera build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build           |

---

## 📋 Status do Projeto

| Sprint   | Entrega                              | Status |
|----------|--------------------------------------|--------|
| Sprint 1 | Banco de dados + API REST completa   | ✅ Concluído |
| Sprint 2 | Frontend React (Login + Cadastro)    | ✅ Concluído |
| Sprint 3 | Cadastro de Dívidas                  | ✅ Concluído |

