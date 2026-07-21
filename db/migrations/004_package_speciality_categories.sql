-- Create join table for packages & speciality categories many-to-many relationship
CREATE TABLE IF NOT EXISTS package_speciality_categories (
    package_id VARCHAR(50) REFERENCES packages(id) ON DELETE CASCADE,
    category_id VARCHAR(50) REFERENCES speciality_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, category_id)
);

-- Seed package_speciality_categories based on existing keyword-matching rules
INSERT INTO package_speciality_categories (package_id, category_id)
SELECT p.id, c.id
FROM packages p
CROSS JOIN speciality_categories c
WHERE 
    LOWER(p.name) LIKE '%' || LOWER(c.keyword) || '%' OR
    LOWER(p.description) LIKE '%' || LOWER(c.keyword) || '%' OR
    LOWER(p.region) LIKE '%' || LOWER(c.keyword) || '%' OR
    LOWER(p.category) LIKE '%' || LOWER(c.keyword) || '%' OR
    EXISTS (
        SELECT 1 FROM unnest(p.highlights) h WHERE LOWER(h) LIKE '%' || LOWER(c.keyword) || '%'
    ) OR
    EXISTS (
        SELECT 1 FROM unnest(p.inclusions) inc WHERE LOWER(inc) LIKE '%' || LOWER(c.keyword) || '%'
      )
ON CONFLICT DO NOTHING;
