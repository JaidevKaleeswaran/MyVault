-- =============================================================================
-- MyVault — Transaction Schema (SQL reference)
--
-- This file is a REFERENCE for when a SQL database is added to the project.
-- Currently, transactions are managed client-side via React useReducer.
-- =============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id                TEXT PRIMARY KEY,
  amount            REAL        NOT NULL,
  category_id       TEXT        NOT NULL,
  description       TEXT        NOT NULL DEFAULT '',
  date              TEXT        NOT NULL,  -- ISO 8601 (YYYY-MM-DD)

  -- Receipt-scanning fields (added for receipt scan feature)
  receipt_image_url  TEXT        DEFAULT NULL,
  line_items         TEXT        DEFAULT NULL,  -- JSON array of { name, price, quantity }
  source             TEXT        NOT NULL DEFAULT 'manual',  -- 'manual' | 'receipt_scan'

  created_at        TEXT        DEFAULT (datetime('now')),
  updated_at        TEXT        DEFAULT (datetime('now'))
);

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
