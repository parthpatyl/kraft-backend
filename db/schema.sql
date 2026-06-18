-- schema.sql
-- Create Kraft Your Trip Database Schema

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;

-- Packages Table
CREATE TABLE packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    base_price NUMERIC NOT NULL,
    region VARCHAR(100) NOT NULL,
    slots_booked INTEGER DEFAULT 0,
    slots_total INTEGER NOT NULL,
    trend VARCHAR(100),
    color VARCHAR(100),
    inclusions_selection JSONB,
    hero_image TEXT,
    card_image TEXT,
    description TEXT,
    highlights TEXT[],
    inclusions TEXT[],
    exclusions TEXT[],
    itinerary JSONB,
    best_month VARCHAR(50),
    cta_badge VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    tier VARCHAR(50) DEFAULT 'Silver',
    historical_ltv NUMERIC DEFAULT 0,
    historical_bookings_count INTEGER DEFAULT 0,
    avatar TEXT,
    preferences JSONB,
    passport JSONB,
    visa JSONB,
    emergency_contact JSONB,
    wallet_balance VARCHAR(50) DEFAULT '$0.00',
    notes TEXT,
    last_contact VARCHAR(50),
    logs JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE bookings (
    id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
    package_name VARCHAR(255) NOT NULL,
    package_id VARCHAR(50) REFERENCES packages(id) ON DELETE SET NULL,
    amount VARCHAR(50) NOT NULL,
    departure_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    agent VARCHAR(100),
    guests INTEGER DEFAULT 1,
    notes TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL
);

-- Testimonials Table
CREATE TABLE testimonials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    avatar TEXT,
    rating INTEGER,
    text TEXT,
    package VARCHAR(255)
);
