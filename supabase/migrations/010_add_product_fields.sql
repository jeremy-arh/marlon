-- Add product type and serial number fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('medical_equipment', 'furniture', 'it_equipment')),
  ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Create product_specialties table for many-to-many relationship
CREATE TABLE IF NOT EXISTS product_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, specialty_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_specialties_product_id ON product_specialties(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specialties_specialty_id ON product_specialties(specialty_id);
