-- Zero Paper: rastreabilidade do cálculo de juros na dívida
-- valor_base: valor original da venda, sem juros
-- taxa_aplicada: taxa (decimal) aplicada de acordo com o número de parcelas escolhido

ALTER TABLE "divida"
  ADD COLUMN "valor_base" DECIMAL(10,2),
  ADD COLUMN "taxa_aplicada" DECIMAL(5,4);

-- Preenche registros já existentes assumindo taxa 0 (dívidas criadas antes desta feature
-- não tinham juros aplicados, então valor_base = valor_total)
UPDATE "divida" SET "valor_base" = "valor_total", "taxa_aplicada" = 0
WHERE "valor_base" IS NULL;

-- A partir daqui os campos passam a ser obrigatórios para novas dívidas
ALTER TABLE "divida"
  ALTER COLUMN "valor_base" SET NOT NULL,
  ALTER COLUMN "taxa_aplicada" SET NOT NULL;
