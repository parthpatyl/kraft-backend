-- schema.sql
-- Create Kraft Your Trip Database Schema

DROP TABLE IF EXISTS group_departures CASCADE;
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
    cost_price NUMERIC(12,2),
    tax_rate NUMERIC(4,1) DEFAULT 5,
    tax_inclusive BOOLEAN DEFAULT TRUE,
    region VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'standard',
    slots_booked INTEGER DEFAULT 0,
    slots_total INTEGER NOT NULL,
    trend VARCHAR(100),
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
    is_bespoke BOOLEAN DEFAULT FALSE,
    terms_and_conditions TEXT,
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
    wallet_balance NUMERIC(12,2) DEFAULT 0,
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
    departure_id INTEGER REFERENCES group_departures(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(12,2),
    discount_type VARCHAR(10),
    discount_value NUMERIC(10,2),
    departure_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    agent VARCHAR(100),
    guests INTEGER DEFAULT 1,
    group_members JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    start_date DATE,
    end_date DATE,
    progress JSONB DEFAULT '{"quoteSent": true, "depositPaid": false, "flightsConfirmed": false, "finalPayment": false}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Departures Table (fixed batch departures with shared traveller slots)
CREATE TABLE group_departures (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) REFERENCES packages(id) ON DELETE CASCADE,
    title VARCHAR(255),
    departure_date DATE NOT NULL,
    return_date DATE,
    slots_total INTEGER NOT NULL DEFAULT 20,
    slots_booked INTEGER DEFAULT 0,
    price_modifier NUMERIC(12,2) DEFAULT 0,
    cost_price NUMERIC(12,2) DEFAULT 0,
    cta_badge VARCHAR(100),
    inclusions TEXT[],
    exclusions TEXT[],
    highlights TEXT[],
    itinerary JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    terms_and_conditions TEXT,
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
    package VARCHAR(255),
    images JSONB DEFAULT '[]'::jsonb,
    type VARCHAR(20) DEFAULT 'consumer',
    company VARCHAR(255)
);

-- Users Table (for admin auth)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    avatar_url TEXT,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'system',
    read BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    link_url TEXT,
    link_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approvals Table (for operations actions needing admin sign-off)
CREATE TABLE approvals (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reviewer_note TEXT,
    executed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approvals_status ON approvals(status) WHERE status = 'pending';

-- Corporate / MICE Tours
CREATE TABLE IF NOT EXISTS corporate_packages (
    id SERIAL PRIMARY KEY,
    destination VARCHAR(255) NOT NULL,
    nights VARCHAR(50),
    starting_price NUMERIC(10,2),
    category VARCHAR(50) NOT NULL CHECK (category IN ('india', 'international')),
    image_url TEXT,
    description TEXT,
    highlights TEXT[],
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corporate_leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    work_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'new',
    per_person_rate NUMERIC(12,2),
    group_size INTEGER,
    discount_type VARCHAR(10),
    discount_value NUMERIC(10,2),
    tax_rate NUMERIC(4,1) DEFAULT 5,
    tax_inclusive BOOLEAN DEFAULT TRUE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corporate_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    industry VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Enquiries Table
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

-- Speciality Categories Table
CREATE TABLE IF NOT EXISTS speciality_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subtitle TEXT,
    keyword VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'Compass',
    icon_color VARCHAR(50) DEFAULT 'text-blue-600',
    icon_bg VARCHAR(50) DEFAULT 'bg-blue-50',
    accent_color VARCHAR(50) DEFAULT 'text-blue-400',
    default_count INTEGER DEFAULT 20,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Package Speciality Categories Join Table
CREATE TABLE IF NOT EXISTS package_speciality_categories (
    package_id VARCHAR(50) REFERENCES packages(id) ON DELETE CASCADE,
    category_id VARCHAR(50) REFERENCES speciality_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, category_id)
);

