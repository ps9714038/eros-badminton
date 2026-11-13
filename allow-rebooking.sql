PRAGMA defer_foreign_keys = ON;
CREATE TABLE sessions_rebuild (
  id INTEGER PRIMARY KEY,
  starts_at INTEGER NOT NULL,
  location TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  cancelled INTEGER NOT NULL DEFAULT 0
);
INSERT INTO sessions_rebuild SELECT id, starts_at, location, is_open, cancelled FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_rebuild RENAME TO sessions;
CREATE UNIQUE INDEX sessions_active_start ON sessions(starts_at) WHERE cancelled = 0;
PRAGMA defer_foreign_keys = OFF;
