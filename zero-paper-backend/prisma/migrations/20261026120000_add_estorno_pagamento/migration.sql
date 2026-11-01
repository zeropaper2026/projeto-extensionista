-- Estorno: o pagamento nunca é apagado, apenas marcado como estornado (rastreabilidade)
ALTER TABLE "pagamento"
    ADD COLUMN "estornado" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "data_estorno" TIMESTAMP(3),
    ADD COLUMN "motivo_estorno" TEXT,
    ADD COLUMN "id_funcionario_estorno" INTEGER;

ALTER TABLE "pagamento"
    ADD CONSTRAINT "pagamento_id_funcionario_estorno_fkey"
    FOREIGN KEY ("id_funcionario_estorno") REFERENCES "funcionario"("id_funcionario")
    ON DELETE SET NULL ON UPDATE CASCADE;