-- Configurações do administrador: permissão de estorno por funcionário.
-- O admin sempre pode estornar; para atendentes o padrão é falso (nenhum atendente
-- existente ganha permissão automaticamente).
ALTER TABLE "funcionario"
    ADD COLUMN "pode_estornar" BOOLEAN NOT NULL DEFAULT false;
