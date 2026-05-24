-- Índices compuestos para queries del dashboard.
CREATE INDEX "requests_borrower_id_status_created_at_idx"
  ON "requests" ("borrower_id", "status", "created_at" DESC);

CREATE INDEX "requests_item_id_status_created_at_idx"
  ON "requests" ("item_id", "status", "created_at" DESC);
