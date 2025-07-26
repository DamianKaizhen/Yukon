-- Cabinet Quoting System Database Initialization
-- This script sets up the initial database structure and permissions

-- Ensure the database exists
SELECT 'CREATE DATABASE cabinet_quoting'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cabinet_quoting');

-- Connect to the cabinet_quoting database
\c cabinet_quoting;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create a read-only user for reports (optional)
CREATE USER cabinet_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE cabinet_quoting TO cabinet_readonly;
GRANT USAGE ON SCHEMA public TO cabinet_readonly;

-- Grant permissions to main user
GRANT ALL PRIVILEGES ON DATABASE cabinet_quoting TO cabinet_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO cabinet_user;

-- Set up search path
ALTER USER cabinet_user SET search_path TO public;

-- Log initialization
INSERT INTO pg_stat_statements_info (schemaname, tablename, attname, null_frac, avg_width, n_distinct, correlation)
VALUES ('public', 'initialization_log', 'timestamp', 0, 8, -1, 1)
ON CONFLICT DO NOTHING;

-- Create a simple log table for tracking database events
CREATE TABLE IF NOT EXISTS database_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Log the initialization
INSERT INTO database_log (event_type, description) 
VALUES ('INITIALIZATION', 'Database initialized for Cabinet Quoting System');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_database_log_created_at ON database_log(created_at);
CREATE INDEX IF NOT EXISTS idx_database_log_event_type ON database_log(event_type);