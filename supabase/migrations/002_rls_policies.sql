-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leasing_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_leaser_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- User roles: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Admins can manage user roles in their organization
CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User permissions: Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Admins can manage permissions in their organization
CREATE POLICY "Admins can manage permissions"
  ON user_permissions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Catalog tables: Public read access
CREATE POLICY "Public can view specialties"
  ON specialties FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view category_specialties"
  ON category_specialties FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view brands"
  ON brands FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view suppliers"
  ON suppliers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view product_categories"
  ON product_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view product_images"
  ON product_images FOR SELECT
  TO public
  USING (true);

-- Carts: Users can manage their own carts
CREATE POLICY "Users can manage their own carts"
  ON carts FOR ALL
  USING (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL));

CREATE POLICY "Users can manage their own cart items"
  ON cart_items FOR ALL
  USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL)
    )
  );

-- Orders: Users can view orders from their organization
CREATE POLICY "Users can view orders from their organization"
  ON orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Users with can_create_orders can create orders
CREATE POLICY "Users with can_create_orders can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_permissions 
      WHERE user_id = auth.uid() AND can_create_orders = true
    )
  );

-- Order items: Can view if order is from their organization
CREATE POLICY "Users can view order items from their organization"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) AND user_id IS NULL
  ));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Invoices: Users can view invoices from their organization
CREATE POLICY "Users can view invoices from their organization"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Note: Super admin access will be handled via service role key (bypasses RLS)
-- For super admin operations, use the service role key directly in the back-office
