-- 002: Replace estimated_value with structured financial columns
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS per_person_rate NUMERIC(12,2);
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS group_size INTEGER;
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10);
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2);
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,1) DEFAULT 5;
ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT TRUE;
ALTER TABLE corporate_leads DROP COLUMN IF EXISTS estimated_value;
