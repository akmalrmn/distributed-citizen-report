-- 004_anonymous_reporters.sql
-- Store hashed reporter identity for anonymous reports

CREATE TABLE IF NOT EXISTS anonymous_reporters (
    report_id UUID PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
    reporter_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_reporters_hash ON anonymous_reporters(reporter_hash);
