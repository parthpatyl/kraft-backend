-- 005_add_itinerary_to_corporate_packages.sql
-- Add itinerary JSONB column to corporate_packages table

ALTER TABLE corporate_packages
ADD COLUMN IF NOT EXISTS itinerary JSONB DEFAULT '[]'::jsonb;
