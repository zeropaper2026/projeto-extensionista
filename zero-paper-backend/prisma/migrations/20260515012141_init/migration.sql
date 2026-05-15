-- CreateEnum
CREATE TYPE "PapelEnum" AS ENUM ('admin', 'atendente');

-- CreateEnum
CREATE TYPE "StatusDivida" AS ENUM ('ativa', 'quitada', 'atrasada');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('pendente', 'paga', 'atrasada', 'parcial');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('dinheiro', 'pix', 'debito', 'credito');

-- CreateTable
CREATE TABLE "funcionario" (
    "id_funcionario" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "login" VARCHAR(50) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "papel" "PapelEnum" NOT NULL DEFAULT 'atendente',

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("id_funcionario")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "telefone" VARCHAR(20),
    "endereco" VARCHAR(255),
    "email" VARCHAR(120),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "divida" (
    "id_divida" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_funcionario" INTEGER NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "data_registro" DATE NOT NULL,
    "descricao_produto" VARCHAR(255) NOT NULL,
    "imei" VARCHAR(30),
    "informacoes_adicionais" TEXT,
    "parcelas_total" INTEGER NOT NULL,
    "status" "StatusDivida" NOT NULL DEFAULT 'ativa',

    CONSTRAINT "divida_pkey" PRIMARY KEY ("id_divida")
);

-- CreateTable
CREATE TABLE "parcela" (
    "id_parcela" SERIAL NOT NULL,
    "id_divida" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor_parcela" DECIMAL(10,2) NOT NULL,
    "valor_pago_acumulado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "data_vencimento" DATE NOT NULL,
    "status" "StatusParcela" NOT NULL DEFAULT 'pendente',

    CONSTRAINT "parcela_pkey" PRIMARY KEY ("id_parcela")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id_pagamento" SERIAL NOT NULL,
    "id_parcela" INTEGER NOT NULL,
    "data_pagamento" DATE NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" "FormaPagamento" NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id_pagamento")
);

-- CreateIndex
CREATE UNIQUE INDEX "funcionario_login_key" ON "funcionario"("login");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_cpf_key" ON "cliente"("cpf");

-- CreateIndex
CREATE INDEX "idx_parcela_divida" ON "parcela"("id_divida");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_id_divida_numero_key" ON "parcela"("id_divida", "numero");

-- CreateIndex
CREATE INDEX "idx_pagamento_parcela" ON "pagamento"("id_parcela");

-- AddForeignKey
ALTER TABLE "divida" ADD CONSTRAINT "divida_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divida" ADD CONSTRAINT "divida_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela" ADD CONSTRAINT "parcela_id_divida_fkey" FOREIGN KEY ("id_divida") REFERENCES "divida"("id_divida") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_id_parcela_fkey" FOREIGN KEY ("id_parcela") REFERENCES "parcela"("id_parcela") ON DELETE RESTRICT ON UPDATE CASCADE;
