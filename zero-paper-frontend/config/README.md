# ZERO PAPER – Sprint 2 · Frontend React + Vite

## 📁 Estrutura do Projeto

```
zero-paper-frontend/
├── src/
│   ├── App.jsx                   ← Roteamento entre páginas (estado puro)
│   ├── main.jsx                  ← Entry point React
│   └── pages/
│       ├── Login.jsx             ← Tela de login integrada com JWT
│       ├── Dashboard.jsx         ← Dashboard pós-login com sidebar
│       └── CadastroCliente.jsx   ← Formulário integrado com banco de dados
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## ✅ Funcionalidades Integradas (Sprint 2)

### 1. Login + Redirecionamento
- Chama `POST /auth/login` com `{ login, senha }`
- Recebe `{ token, funcionario }` do backend
- Armazena o token em `localStorage` (`zp_token`, `zp_funcionario`)
- Redireciona automaticamente para o **Dashboard** após sucesso
- Exibe nome do funcionário e papel (admin/atendente) na interface

### 2. Cadastro + Banco de Dados
- Formulário de cadastro de cliente com validação de CPF (11 dígitos)
- Envia `POST /clientes` com `Authorization: Bearer <token>` no header
- Máscara automática de CPF (`000.000.000-00`) e Telefone (`(00) 00000-0000`)
- Exibe confirmação com o ID gerado pelo banco após cadastro
- Trata erro de CPF duplicado (`P2002`) com mensagem amigável

---

## 🐛 Correções Realizadas

### ❌ Inconsistência 1 – Validação antes do fetch (Login)
**Problema:** O formulário de login chamava a API sem verificar se os campos
estavam preenchidos. Isso gerava um erro `400 Bad Request` silencioso — a
mensagem do servidor chegava mas não era exibida, e o usuário via a tela
congelar sem feedback.

**Correção** (`Login.jsx`, linha ~33):
```jsx
// ANTES – sem validação local
const res = await fetch(`${API}/auth/login`, { ... });

// DEPOIS – valida antes de chamar a API
if (!form.login.trim() || !form.senha.trim()) {
  setErro("Preencha login e senha para continuar.");
  return;
}
```

---

### ❌ Inconsistência 2 – Leitura errada do campo de erro da API
**Problema:** O backend retorna erros no formato `{ "erro": "Credenciais inválidas." }`,
mas o frontend original tentava ler `data.message` (campo inexistente → `undefined`).
Resultado: ao errar a senha, a mensagem de erro aparecia em **branco**.
O mesmo problema afetava o cadastro de clientes.

**Correção** (`Login.jsx` e `CadastroCliente.jsx`):
```jsx
// ANTES – campo errado
setErro(data.message || "Erro ao fazer login.");

// DEPOIS – campo correto conforme padrão do backend
setErro(data.erro || "Erro ao fazer login. Tente novamente.");
```

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- Backend rodando em `http://localhost:3333` (com Docker + PostgreSQL)

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variável de ambiente
cp .env.example .env.local
# Edite VITE_API_URL se o backend estiver em outra porta

# 3. Iniciar em desenvolvimento
npm run dev
# Acesse: http://localhost:5173
```

### Credenciais de Teste (seed do banco)
| Usuário    | Login          | Senha      | Papel     |
|------------|----------------|------------|-----------|
| Admin      | `admin`        | `admin123` | admin     |
| Atendente  | `aline.almeida`| `atend123` | atendente |

---

## 🐳 Backend (Sprint 1 – referência)

```bash
cd ProjetoExtensionista
cp .env.example .env

# Subir PostgreSQL com Docker
docker run -d \
  --name zeropaper-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=zeropaper \
  -p 5432:5432 \
  postgres:15

# Gerar client Prisma e migrar
npm install
npm run db:generate
npm run db:push
npm run db:seed

# Iniciar servidor
npm run dev
```

---

## 🛠️ Tecnologias

| Camada   | Tecnologia                    |
|----------|-------------------------------|
| Frontend | React 18 + Vite               |
| Estilização | CSS-in-JS (sem dependências externas) |
| Backend  | Node.js + Express             |
| ORM      | Prisma                        |
| Banco    | PostgreSQL 15 (Docker)        |
| Auth     | JWT (jsonwebtoken + bcryptjs) |
