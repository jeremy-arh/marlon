-- Table pour les logs d'activité des commandes
CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'item_added', 'item_updated', 'item_deleted', 'tracking_updated', 'document_added', 'document_deleted', 'invoice_added', 'invoice_removed', etc.
  description TEXT NOT NULL, -- Description lisible de l'action
  metadata JSONB, -- Données supplémentaires (anciennes valeurs, nouvelles valeurs, etc.)
  user_id UUID REFERENCES auth.users(id), -- Utilisateur qui a effectué l'action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON order_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_logs_action_type ON order_logs(action_type);

-- RLS Policies
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- Les super admins peuvent voir tous les logs
CREATE POLICY "Super admins can view all order logs"
  ON order_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_super_admin = true
    )
  );

-- Les super admins peuvent créer des logs
CREATE POLICY "Super admins can create order logs"
  ON order_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_super_admin = true
    )
  );
