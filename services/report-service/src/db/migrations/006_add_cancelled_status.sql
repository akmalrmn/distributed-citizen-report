-- 006_add_cancelled_status.sql
-- Add cancelled status to report_status enum

ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'cancelled';
