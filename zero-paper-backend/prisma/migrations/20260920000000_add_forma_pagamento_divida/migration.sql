-- Zero Paper: persiste a forma de pagamento escolhida na venda (dívida)
-- Antes desta migration, forma_pagamento era coletada em CadastroDivida.jsx
-- mas nunca enviada no payload de POST /dividas nem persistida no schema.
--
-- Reutiliza o enum "FormaPagamento" já existente (usado em "pagamento").

-- Adiciona a coluna com default 'dinheiro' para não quebrar linhas existentes
ALTER TABLE "divida"
  ADD COLUMN "forma_pagamento" "FormaPagamento" NOT NULL DEFAULT 'dinheiro';

-- Observação: dívidas registradas antes desta feature não tinham essa informação
-- rastreada; assumimos 'dinheiro' como valor neutro para o backfill, seguindo o
-- mesmo padrão adotado na migration de valor_base/taxa_aplicada.
