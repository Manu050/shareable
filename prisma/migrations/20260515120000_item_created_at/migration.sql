-- Add created_at to items so /explorar can sort chronologically
-- (UUID v4 is random; ORDER BY id DESC was effectively pseudo-random).
-- IF NOT EXISTS makes the migration idempotent for envs that already had
-- the column from a previous hot-fix.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS created_at timestamptz(6) NOT NULL DEFAULT now();

-- Descending index optimised for "newest first" listings.
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at DESC);
