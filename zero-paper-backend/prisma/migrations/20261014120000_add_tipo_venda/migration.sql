CREATE TYPE "TipoVenda" AS ENUM ('avista', 'parcelada');

ALTER TABLE "divida"
    ADD COLUMN "tipo_venda" "TipoVenda" NOT NULL DEFAULT 'parcelada';