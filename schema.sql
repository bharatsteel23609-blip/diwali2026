-- Optional: the API creates this table by itself on first use.
CREATE TABLE IF NOT EXISTS docs (
  col        text        NOT NULL,
  id         text        NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (col, id)
);
