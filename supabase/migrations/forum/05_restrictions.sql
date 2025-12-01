-- =============================================
-- Migration 05: Sistem Ban Granular
-- =============================================
-- Descriere: Restricții utilizatori (mute, view ban, shadow ban, etc.)
-- Dependințe: 04_users.sql
-- =============================================

CREATE TABLE forum_user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type VARCHAR(20) NOT NULL, -- 'mute', 'view_ban', 'shadow_ban', 'temp_ban', 'permanent_ban'
  reason TEXT NOT NULL,
  applied_by UUID REFERENCES auth.users(id), -- Moderatorul/Adminul care a aplicat restricția
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL pentru permanent
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_user_restrictions_user_id ON forum_user_restrictions(user_id);
CREATE INDEX idx_forum_user_restrictions_active ON forum_user_restrictions(is_active, user_id) WHERE is_active = true;
CREATE INDEX idx_forum_user_restrictions_expires ON forum_user_restrictions(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_user_restrictions IS 'Sistem ban granular: mute (nu poate posta), view_ban (nu poate accesa), shadow_ban (postările invizibile), temp_ban, permanent_ban';
COMMENT ON COLUMN forum_user_restrictions.restriction_type IS 'Tipuri: mute, view_ban, shadow_ban, temp_ban, permanent_ban';
COMMENT ON COLUMN forum_user_restrictions.expires_at IS 'NULL = permanent, altfel data când expiră restricția';
