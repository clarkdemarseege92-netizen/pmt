-- Add slug field to merchants table for SEO-friendly URLs
-- Migration: 20251220000000_add_merchant_slug.sql
-- 方案：让商户自定义 slug（仅支持英文和数字）

-- 1. Add slug column to merchants table (unique constraint)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Add custom_slug column (商户填写的原始值)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS custom_slug TEXT;

-- 3. Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug);
CREATE INDEX IF NOT EXISTS idx_merchants_custom_slug ON merchants(custom_slug);

-- 4. Create function to validate and sanitize custom slug
CREATE OR REPLACE FUNCTION validate_slug(input_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  sanitized_slug TEXT;
BEGIN
  IF input_slug IS NULL OR input_slug = '' THEN
    RETURN NULL;
  END IF;

  -- Convert to lowercase
  sanitized_slug := LOWER(input_slug);

  -- Only allow lowercase letters, numbers, and hyphens
  sanitized_slug := REGEXP_REPLACE(sanitized_slug, '[^a-z0-9-]+', '-', 'g');

  -- Remove leading/trailing hyphens
  sanitized_slug := REGEXP_REPLACE(sanitized_slug, '^-+|-+$', '', 'g');

  -- Remove consecutive hyphens
  sanitized_slug := REGEXP_REPLACE(sanitized_slug, '-{2,}', '-', 'g');

  -- Limit length to 50 characters
  sanitized_slug := SUBSTRING(sanitized_slug FROM 1 FOR 50);

  -- Return NULL if the result is empty
  IF sanitized_slug = '' THEN
    RETURN NULL;
  END IF;

  RETURN sanitized_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create trigger function to handle slug updates
CREATE OR REPLACE FUNCTION handle_merchant_slug_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If custom_slug is provided, use it (after validation)
  IF NEW.custom_slug IS NOT NULL AND NEW.custom_slug != '' THEN
    NEW.slug := validate_slug(NEW.custom_slug);
  -- If custom_slug is cleared, also clear slug
  ELSIF NEW.custom_slug IS NULL OR NEW.custom_slug = '' THEN
    NEW.slug := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_generate_merchant_slug ON merchants;
DROP TRIGGER IF EXISTS trigger_handle_merchant_slug ON merchants;

CREATE TRIGGER trigger_handle_merchant_slug
  BEFORE INSERT OR UPDATE OF custom_slug ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION handle_merchant_slug_update();

-- 7. Add constraint to ensure slug format (optional, for extra safety)
ALTER TABLE merchants
DROP CONSTRAINT IF EXISTS merchants_slug_format_check;

ALTER TABLE merchants
ADD CONSTRAINT merchants_slug_format_check
CHECK (slug IS NULL OR slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$');

-- 8. Add constraint to ensure custom_slug format
ALTER TABLE merchants
DROP CONSTRAINT IF EXISTS merchants_custom_slug_format_check;

ALTER TABLE merchants
ADD CONSTRAINT merchants_custom_slug_format_check
CHECK (custom_slug IS NULL OR custom_slug ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$');

-- 9. Add comments
COMMENT ON COLUMN merchants.slug IS 'SEO-friendly URL slug (auto-generated from custom_slug, lowercase only)';
COMMENT ON COLUMN merchants.custom_slug IS 'Merchant-provided custom slug (letters, numbers, hyphens only)';

-- Note: No automatic population for existing merchants
-- Merchants must set their own custom_slug if they want a friendly URL
-- This avoids creating unwanted slugs for merchants who don't need this feature
