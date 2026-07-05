-- 003_create_enquiries.sql
-- Create enquiries table to store submitted travel enquiries

CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    travel_date DATE NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    preferences JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
