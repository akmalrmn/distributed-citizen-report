-- 003_account.sql
-- Add account
-- IF4031 - Distributed Application Architecture

-- Table for storing file attachment metadata
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Warga',
    created_at TIMESTAMP DEFAULT now()
);

INSERT INTO accounts (email, username, password_hash, role) VALUES ('police_dept@mail.com', 'police_dept', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Department Crime');
INSERT INTO accounts (email, username, password_hash, role) VALUES ('cleanliness_dept@mail.com', 'cleanliness_dept', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Department Cleanliness');
INSERT INTO accounts (email, username, password_hash, role) VALUES ('health_dept@mail.com', 'health_dept', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Department Health');
INSERT INTO accounts (email, username, password_hash, role) VALUES ('infrastructure_dept@mail.com', 'infrastructure_dept', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Department Infrastructure');
INSERT INTO accounts (email, username, password_hash, role) VALUES ('others_dept@mail.com', 'others_dept', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Department Other');
INSERT INTO accounts (email, username, password_hash, role) VALUES ('admin@mail.com', 'admin', '$2a$12$0FpWyzyGkt6x8q4SkaUjI.vjG9XpomDtPf8hjnCUClz2iiYExohcC', 'Admin');
