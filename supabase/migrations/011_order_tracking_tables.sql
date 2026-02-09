-- Order tracking table for detailed status tracking
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Financement request status
  financing_status TEXT CHECK (financing_status IN ('pending', 'validated', 'rejected')),
  
  -- Contract preparation documents
  identity_card_front_url TEXT,
  identity_card_back_url TEXT,
  
  -- Contract signature documents
  tax_liasse_url TEXT,
  business_plan_url TEXT,
  
  -- Signed contract information
  signed_contract_url TEXT,
  contract_number TEXT,
  docusign_link TEXT,
  
  -- Delivery status
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'delivery_signed')),
  
  -- Contract in progress status
  contract_status TEXT CHECK (contract_status IN ('pending', 'signing', 'signed')),
  
  -- Contract end date
  contract_end_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(order_id)
);

-- Order documents table (for general documents)
CREATE TABLE IF NOT EXISTS order_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order invoices table (linking invoices to orders)
CREATE TABLE IF NOT EXISTS order_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(order_id, invoice_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_order_id ON order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order_id ON order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_invoice_id ON order_invoices(invoice_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_tracking_updated_at BEFORE UPDATE ON order_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_documents_updated_at BEFORE UPDATE ON order_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
