-- Table pour les logs d'activité des organisations
CREATE TABLE IF NOT EXISTS organization_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'user_added', 'user_removed', 'user_role_changed', etc.
  description TEXT NOT NULL, -- Description lisible de l'action
  metadata JSONB, -- Données supplémentaires (anciennes valeurs, nouvelles valeurs, etc.)
  user_id UUID REFERENCES auth.users(id), -- Utilisateur qui a effectué l'action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_organization_logs_organization_id ON organization_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_logs_created_at ON organization_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organization_logs_action_type ON organization_logs(action_type);

-- RLS Policies
ALTER TABLE organization_logs ENABLE ROW LEVEL SECURITY;

-- Les super admins peuvent voir tous les logs
CREATE POLICY "Super admins can view all organization logs"
  ON organization_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_super_admin = true
    )
  );

-- Les super admins peuvent créer des logs
CREATE POLICY "Super admins can create organization logs"
  ON organization_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_super_admin = true
    )
  );
