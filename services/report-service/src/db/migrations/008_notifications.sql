-- 008_notifications.sql
-- Store notification events for users, including anonymous reporter matches.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID UNIQUE NOT NULL,
    user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    reporter_hash TEXT,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_reporter_hash ON notifications(reporter_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
