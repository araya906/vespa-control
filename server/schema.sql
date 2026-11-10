-- VespaControl open-data schema (Cloudflare D1). Minimal, anonymous fields only.
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,          -- random id generated on the phone
  created TEXT NOT NULL,        -- observation time, rounded to the hour (UTC)
  received TEXT NOT NULL,       -- reception time, rounded to the hour (UTC)
  type TEXT NOT NULL,
  species TEXT NOT NULL,
  lat REAL NOT NULL,            -- rounded to 3 decimals (~100 m)
  lon REAL NOT NULL,
  count INTEGER,
  nest_status TEXT,
  del_hash TEXT NOT NULL        -- SHA-256 of the reporter's private delete token
);
CREATE INDEX IF NOT EXISTS reports_created ON reports (created);

-- Abuse limit: salted hash of (day, IP); rows older than today are deleted on every write.
CREATE TABLE IF NOT EXISTS rate (
  k TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (k, day)
);
