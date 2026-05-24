-- v2: GIST indexes for PostGIS proximity queries (ST_DWithin / ST_Distance)
-- Eliminates full-scan on items and wanted_items for radius searches.
-- CAST() used instead of :: because some SQL runners misparse the :: operator.
CREATE INDEX IF NOT EXISTS idx_items_geo ON items USING GIST (
  CAST(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) AS geography)
);

CREATE INDEX IF NOT EXISTS idx_wanted_items_geo ON wanted_items USING GIST (
  CAST(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) AS geography)
);

-- v2: Full-text search on items (Spanish stemming + GIN index)
-- Powers the plainto_tsquery search in /explorar replacing ILIKE.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN (search_vector);
