CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  starts_at INTEGER NOT NULL UNIQUE,
  location TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1))
);

CREATE TABLE IF NOT EXISTS members (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('regular', 'guest'))
);

CREATE TABLE IF NOT EXISTS registrations (
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  user_id TEXT NOT NULL REFERENCES members(user_id),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS guest_registration_open (
  session_id INTEGER PRIMARY KEY REFERENCES sessions(id)
);
