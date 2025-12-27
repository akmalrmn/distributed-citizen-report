-- 001_initial.sql
-- Initial database schema for Citizen Report Application
-- IF4031 - Distributed Application Architecture

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for report fields
CREATE TYPE report_visibility AS ENUM ('public', 'private', 'anonymous');
CREATE TYPE report_status AS ENUM ('submitted', 'routed', 'in_progress', 'resolved', 'escalated');
CREATE TYPE report_category AS ENUM ('crime', 'cleanliness', 'health', 'infrastructure', 'other');

-- Departments table - stores the city departments that handle reports
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports table - main table for citizen reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID,  -- NULL for anonymous reports
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category report_category NOT NULL,
    visibility report_visibility NOT NULL DEFAULT 'public',
    status report_status NOT NULL DEFAULT 'submitted',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    assigned_department_id UUID REFERENCES departments(id),
    upvote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Report status history - track status changes for audit
CREATE TABLE report_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    old_status report_status,
    new_status report_status NOT NULL,
    changed_by UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_department ON reports(assigned_department_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_visibility ON reports(visibility);
CREATE INDEX idx_status_history_report ON report_status_history(report_id);

-- Seed departments with city departments
INSERT INTO departments (name, code, description) VALUES
    ('Police Department', 'police', 'Handles crime-related reports and public safety issues'),
    ('Sanitation Department', 'sanitation', 'Handles cleanliness and waste management issues'),
    ('Health Department', 'health', 'Handles health-related reports and public health concerns'),
    ('Infrastructure Department', 'infrastructure', 'Handles facility maintenance and infrastructure issues'),
    ('General Affairs', 'general', 'Handles miscellaneous reports and general inquiries');

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on reports table
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on departments table
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
