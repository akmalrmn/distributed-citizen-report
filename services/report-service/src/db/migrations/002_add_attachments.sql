-- 002_add_attachments.sql
-- Add file attachments support for reports
-- IF4031 - Distributed Application Architecture

-- Table for storing file attachment metadata
CREATE TABLE IF NOT EXISTS report_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by report
CREATE INDEX IF NOT EXISTS idx_attachments_report ON report_attachments(report_id);
