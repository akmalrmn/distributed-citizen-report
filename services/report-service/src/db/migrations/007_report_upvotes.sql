-- 007_report_upvotes.sql
-- Track unique upvotes per user and keep report upvote counts consistent.

CREATE TABLE IF NOT EXISTS report_upvotes (
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_upvotes_user ON report_upvotes(user_id);
