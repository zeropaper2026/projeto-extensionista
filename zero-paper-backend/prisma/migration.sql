-- ============================================================
-- ZERO PAPER – Migration Inicial
-- Banco: PostgreSQL
-- ============================================================

-- ── Tipos ENUM ───────────────────────────────────────────────
CREATE TYPE papel_enum      AS ENUM ('admin', 'atendente');
CREATE TYPE status_divida   AS ENUM ('ativa', 'quitada', 'atrasada');
CREATE TYPE status_parcela  AS ENUM ('pendente', 'paga', 'atrasada', 'parcial');
CREATE TYPE forma_pagamento AS ENUM ('dinheiro', 'pix', 'debito', 'credito');

-- ============================================================
-- TABELA: FUNCIONARIO
-- ============================================================
CREATE TABLE funcionario (
    id_funcionario SERIAL PRIMARY KEY,
    nome           VARCHAR(100) NOT NULL,
    login          VARCHAR(50)  NOT NULL UNIQUE,
    senha          VARCHAR(255) NOT NULL,
    papel          papel_enum   NOT NULL DEFAULT 'atendente'
);

-- ============================================================
-- TABELA: CLIENTE
-- ============================================================
CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    cpf        CHAR(11)     NOT NULL UNIQUE,
    telefone   VARCHAR(20),
    endereco   VARCHAR(255),
    email      VARCHAR(120)
);

-- ============================================================
-- TABELA: DIVIDA
-- ============================================================
CREATE TABLE divida (
    id_divida              SERIAL PRIMARY KEY,
    id_cliente             INT           NOT NULL,
    id_funcionario         INT           NOT NULL,
    valor_total            DECIMAL(10,2) NOT NULL CHECK (valor_total > 0),
    data_registro          DATE          NOT NULL,
    descricao_produto      VARCHAR(255)  NOT NULL,
    imei                   VARCHAR(30),
    informacoes_adicionais TEXT,
    parcelas_total         INT           NOT NULL CHECK (parcelas_total > 0),
    status                 status_divida NOT NULL DEFAULT 'ativa',
    FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (id_funcionario)
        REFERENCES funcionario(id_funcionario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ============================================================
-- TABELA: PARCELA
-- ============================================================
CREATE TABLE parcela (
    id_parcela           SERIAL PRIMARY KEY,
    id_divida            INT            NOT NULL,
    numero               INT            NOT NULL,
    valor_parcela        DECIMAL(10,2)  NOT NULL CHECK (valor_parcela > 0),
    valor_pago_acumulado DECIMAL(10,2)  NOT NULL DEFAULT 0 CHECK (valor_pago_acumulado >= 0),
    data_vencimento      DATE           NOT NULL,
    status               status_parcela NOT NULL DEFAULT 'pendente',
    FOREIGN KEY (id_divida)
        REFERENCES divida(id_divida)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_parcela_numero UNIQUE (id_divida, numero)
);

CREATE INDEX idx_parcela_divida ON parcela(id_divida);

-- ============================================================
-- TABELA: PAGAMENTO
-- ============================================================
CREATE TABLE pagamento (
    id_pagamento    SERIAL PRIMARY KEY,
    id_parcela      INT             NOT NULL,
    data_pagamento  DATE            NOT NULL,
    valor_pago      DECIMAL(10,2)   NOT NULL CHECK (valor_pago > 0),
    forma_pagamento forma_pagamento NOT NULL,
    observacao      TEXT,
    FOREIGN KEY (id_parcela)
        REFERENCES parcela(id_parcela)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_pagamento_parcela ON pagamento(id_parcela);
