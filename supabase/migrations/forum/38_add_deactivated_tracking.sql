-- =============================================
-- Migration 38: Tracking Dezactivare Restricții
-- =============================================
-- Descriere: Adaugă câmpuri pentru tracking când și de cine a fost dezactivată o restricție
-- Dependințe: 05_restrictions.sql
-- =============================================

-- Adaugă coloane pentru tracking dezactivare
ALTER TABLE forum_user_restrictions 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Index pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_user_restrictions_deactivated ON forum_user_restrictions(deactivated_at) WHERE is_active = false;

-- Comentarii
COMMENT ON COLUMN forum_user_restrictions.deactivated_at IS 'Data și ora când a fost dezactivată restricția';
COMMENT ON COLUMN forum_user_restrictions.deactivated_by IS 'Utilizatorul (admin/moderator) care a dezactivat restricția';
COMMENT ON COLUMN forum_user_restrictions.deactivation_reason IS 'Motivul dezactivării restricției';

