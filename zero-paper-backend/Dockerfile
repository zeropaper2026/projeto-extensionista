# ============================================================
# ZERO PAPER – Dockerfile (Backend Node.js)
# ============================================================

FROM node:20-alpine

# Instala OpenSSL (necessário para o Prisma no Alpine)
RUN apk add --no-cache openssl

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia arquivos de dependências primeiro (cache de layers)
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências
RUN npm install

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Expõe a porta do servidor
EXPOSE 3333

# Comando padrão (sobrescrito pelo docker-compose em dev)
CMD ["node", "src/server.js"]