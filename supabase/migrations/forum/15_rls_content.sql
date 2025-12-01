-- =============================================
-- Migration 15: RLS Policies - Content & Moderation
-- =============================================
-- Descriere: Politici RLS pentru topicuri, postări, moderare, reputație
-- Dependințe: 05_restrictions.sql, 06_topics_posts.sql, 07_reputation.sql, 08_moderation.sql
-- =============================================

-- =============================================
-- ACTIVARE RLS
-- =============================================

ALTER TABLE forum_user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reputation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_braconaj_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLITICI RESTRICȚII
-- =============================================

-- Doar utilizatorul, moderatorii și adminii văd restricțiile
CREATE POLICY "Restricții vizibile pentru implicați" ON forum_user_restrictions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator')
        )
    )
  );

-- Doar moderatorii și adminii pot aplica restricții
CREATE POLICY "Doar moderatori/admini pot crea restricții" ON forum_user_restrictions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator')
        )
    )
  );

-- =============================================
-- POLITICI TOPICURI
-- =============================================

-- Topicuri vizibile pentru toți (dacă nu sunt șterse)
CREATE POLICY "Topicuri vizibile pentru toți" ON forum_topics
  FOR SELECT USING (is_deleted = false);

-- Utilizatori autentificați (fără ban) pot crea topicuri
CREATE POLICY "Utilizatorii pot crea topicuri" ON forum_topics
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
    AND NOT has_active_restriction(auth.uid(), 'mute')
    AND NOT has_active_restriction(auth.uid(), 'view_ban')
  );

-- Creatorii, moderatorii și adminii pot edita
CREATE POLICY "Editare topicuri" ON forum_topics
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON (fm.subcategory_id = fs.id OR fm.category_id = fs.category_id)
      WHERE fm.user_id = auth.uid() AND fs.id = subcategory_id
    )
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- =============================================
-- POLITICI POSTĂRI
-- =============================================

-- Postări vizibile pentru toți (dacă nu sunt șterse sau shadow banned)
CREATE POLICY "Postări vizibile" ON forum_posts
  FOR SELECT USING (
    is_deleted = false
    AND (
      -- Toată lumea vede, DOAR dacă autorul nu e shadow banned
      NOT has_active_restriction(user_id, 'shadow_ban')
      OR auth.uid() = user_id -- Autorul își vede propria postare
      OR EXISTS (
        SELECT 1 FROM forum_users fu
        WHERE fu.user_id = auth.uid()
          AND fu.role_id IN (SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator'))
      )
    )
  );

-- Utilizatori autentificați (fără mute) pot posta
CREATE POLICY "Utilizatorii pot posta" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
    AND NOT has_active_restriction(auth.uid(), 'mute')
    AND NOT has_active_restriction(auth.uid(), 'view_ban')
  );

-- Creatorii, moderatorii și adminii pot edita
CREATE POLICY "Editare postări" ON forum_posts
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON (fm.subcategory_id = fs.id OR fm.category_id = fs.category_id)
      JOIN forum_topics ft ON ft.subcategory_id = fs.id
      WHERE fm.user_id = auth.uid() AND ft.id = topic_id
    )
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- =============================================
-- POLITICI REPUTAȚIE
-- =============================================

-- Log-uri reputație: ultimele 10 pe profil public, toate pentru admin
-- FIX: Folosește funcția is_forum_admin() pentru a evita recursivitatea infinită
CREATE POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs
  FOR SELECT USING (
    -- Adminii văd TOATE log-urile (folosind funcția SECURITY DEFINER)
    is_forum_admin()
    -- Alții văd doar ultimele 10 log-uri per utilizator
    OR id IN (
      SELECT id FROM forum_reputation_logs rl2
      WHERE rl2.receiver_user_id = forum_reputation_logs.receiver_user_id
      ORDER BY rl2.created_at DESC
      LIMIT 10
    )
  );

-- Utilizatorii cu putere 1+ pot acorda like/dislike
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Like simplu: oricine (putere 0+)
      points = 1
      -- Dislike sau amplificat: doar putere 1+ (50+ reputație)
      OR EXISTS (
        SELECT 1 FROM forum_users fu
        WHERE fu.user_id = auth.uid() AND fu.reputation_power >= 1
      )
      -- Admin award: doar admini
      OR (
        is_admin_award = true
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = auth.uid()
            AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
        )
      )
    )
  );

-- =============================================
-- POLITICI MODERARE
-- =============================================

-- Moderatori vizibili pentru toți
CREATE POLICY "Moderatori vizibili" ON forum_moderators
  FOR SELECT USING (true);

-- Doar adminii pot numi moderatori
CREATE POLICY "Doar adminii numesc moderatori" ON forum_moderators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- Raportări vizibile pentru reporter, moderatori și admini
CREATE POLICY "Raportări vizibile pentru implicați" ON forum_reports
  FOR SELECT USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator'))
    )
  );

-- Utilizatorii pot raporta abuz
CREATE POLICY "Utilizatorii pot raporta" ON forum_reports
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = reporter_id
  );

-- Moderatorii pot actualiza raportări
CREATE POLICY "Moderatori actualizează raportări" ON forum_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator'))
    )
  );

-- =============================================
-- POLITICI BRACONAJ (SPECIALE)
-- =============================================

-- Raportări braconaj vizibile pentru implicați
CREATE POLICY "Raportări braconaj vizibile" ON forum_braconaj_reports
  FOR SELECT USING (
    auth.uid() = reporter_id
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator', 'oficial')
        )
    )
  );

-- Utilizatorii pot raporta braconaj
CREATE POLICY "Utilizatorii pot raporta braconaj" ON forum_braconaj_reports
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = reporter_id
  );

-- Moderatori/admini/oficiali pot actualiza
CREATE POLICY "Staff actualizează raportări braconaj" ON forum_braconaj_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator', 'oficial')
        )
    )
  );

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON POLICY "Postări vizibile" ON forum_posts IS 'Shadow ban: postările invizibile pentru alții, dar autorul le vede';
COMMENT ON POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs IS 'Public: ultimele 10 log-uri pe profil utilizator. Admin: toate log-urile în admin panel';
COMMENT ON POLICY "Raportări braconaj vizibile" ON forum_braconaj_reports IS 'Visible pentru reporter, staff și public (dacă is_public=true)';
