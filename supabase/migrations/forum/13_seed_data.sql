-- =============================================
-- Migration 13: Seed Data (Datele Inițiale)
-- =============================================
-- Descriere: Roluri sistem, ranguri automate și configurări inițiale
-- Dependințe: 02_roles.sql
-- =============================================

-- =============================================
-- 1. ROLURI SISTEM (nu pot fi șterse)
-- =============================================

INSERT INTO forum_roles (name, display_name, description, color, icon, permissions, is_system_role) VALUES
('admin', 'Administrator', 'Acces complet la toate funcțiile forum', '#dc2626', 'shield', '{
  "can_edit_all": true,
  "can_delete_all": true,
  "can_ban_users": true,
  "can_manage_categories": true,
  "can_manage_roles": true,
  "can_view_reports": true,
  "can_manage_ads": true,
  "can_award_reputation": true
}', true),

('moderator', 'Moderator', 'Moderare forum per categorii alocate', '#f97316', 'user-check', '{
  "can_edit_posts": true,
  "can_delete_posts": true,
  "can_ban_users": true,
  "can_lock_topics": true,
  "can_pin_topics": true,
  "can_view_reports": true
}', true),

('firma', 'Firmă Verificată', 'Cont special pentru firme și magazine', '#3b82f6', 'building', '{
  "can_post_in_commercial": true,
  "can_create_sticky": true,
  "can_use_signature_links": true
}', true),

('organizator_concurs', 'Organizator Concurs', 'Organizare evenimente și competiții', '#8b5cf6', 'trophy', '{
  "can_create_events": true,
  "can_manage_calendar": true,
  "can_create_announcements": true
}', true),

('admin_balta', 'Administrator Baltă', 'Administrare topic baltă privată', '#10b981', 'waves', '{
  "can_manage_own_topic": true,
  "can_post_in_commercial": true
}', true),

('oficial', 'Cont Oficial', 'Reprezentant ANPA/AJVPS/Stat', '#facc15', 'badge-check', '{
  "verified_authority": true,
  "can_review_braconaj_reports": true
}', true),

('ong', 'Organizație Non-Profit', 'Asociații de conservare', '#06b6d4', 'heart', '{
  "can_create_community_projects": true,
  "can_post_events": true
}', true),

('premium', 'Membru Premium', 'Susținător al comunității', '#a855f7', 'star', '{
  "can_use_signature_images": true,
  "larger_attachment_limit": true,
  "ad_free": true
}', true),

('user', 'Utilizator', 'Membru standard', '#6b7280', 'user', '{
  "can_post": true,
  "can_reply": true,
  "can_create_topics": true
}', true);

-- =============================================
-- 2. RANGURI AUTOMATE (bazate pe post_count)
-- =============================================

INSERT INTO forum_user_ranks (name, display_name, min_posts, max_posts, color, icon) VALUES
('ou_de_peste', 'Ou de Pește', 0, 10, '#9ca3af', 'egg'),
('puiet', 'Puiet', 11, 50, '#60a5fa', 'fish'),
('pui_de_crap', 'Pui de Crap', 51, 100, '#34d399', 'fish'),
('crap_junior', 'Crap Junior', 101, 500, '#fbbf24', 'fish'),
('crap_senior', 'Crap Senior', 501, 1000, '#fb923c', 'fish'),
('maestru_pescar', 'Maestru Pescar', 1001, 5000, '#f472b6', 'award'),
('legenda_apelor', 'Legenda Apelor', 5001, NULL, '#a78bfa', 'crown');

-- =============================================
-- 3. STATISTICI INIȚIALE
-- =============================================

INSERT INTO forum_stats (stat_name, stat_value) VALUES
('total_users', 0),
('total_topics', 0),
('total_posts', 0),
('total_reputation_given', 0);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_roles IS 'Seeded cu 9 roluri sistem: admin, moderator, firma, organizator_concurs, admin_balta, oficial, ong, premium, user';
COMMENT ON TABLE forum_user_ranks IS 'Seeded cu 7 ranguri automate: Ou de Pește (0-10), Puiet (11-50), Pui de Crap (51-100), Crap Junior (101-500), Crap Senior (501-1000), Maestru Pescar (1001-5000), Legenda Apelor (5001+)';
