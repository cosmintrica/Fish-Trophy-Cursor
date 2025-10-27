-- Row Level Security (RLS) Policies pentru Forum Pescuit
-- Securitate la nivel de rând pentru toate tabelele

-- =============================================
-- ACTIVARE RLS PENTRU TOATE TABELELE
-- =============================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_stats ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLITICI PENTRU CATEGORII ȘI SUBCATEGORII
-- =============================================

-- Categorii - citire pentru toți, modificare doar pentru admini
CREATE POLICY "Categorii vizibile pentru toți" ON forum_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Doar adminii pot modifica categoriile" ON forum_categories
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Subcategorii - citire pentru toți, modificare doar pentru admini
CREATE POLICY "Subcategorii vizibile pentru toți" ON forum_subcategories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Doar adminii pot modifica subcategoriile" ON forum_subcategories
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU UTILIZATORI
-- =============================================

-- Profiluri utilizatori - vizibile pentru toți, editabile doar de proprietar
CREATE POLICY "Profiluri vizibile pentru toți" ON forum_users
  FOR SELECT USING (true);

CREATE POLICY "Utilizatorii își pot crea profilul" ON forum_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizatorii își pot edita profilul" ON forum_users
  FOR UPDATE USING (auth.uid() = user_id);

-- Ranguri - vizibile pentru toți, editabile doar de admini
CREATE POLICY "Ranguri vizibile pentru toți" ON forum_user_ranks
  FOR SELECT USING (true);

CREATE POLICY "Doar adminii pot modifica rangurile" ON forum_user_ranks
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU TOPICURI
-- =============================================

-- Topicuri - vizibile pentru toți (dacă nu sunt șterse), create de utilizatori autentificați
CREATE POLICY "Topicuri vizibile pentru toți" ON forum_topics
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Utilizatorii autentificați pot crea topicuri" ON forum_topics
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

CREATE POLICY "Creatorii pot edita propriile topicuri" ON forum_topics
  FOR UPDATE USING (
    auth.uid() = user_id OR
    -- Moderatorii pot edita topicurile din categoriile lor
    EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON fm.subcategory_id = fs.id
      WHERE fm.user_id = auth.uid() AND fs.id = subcategory_id
    ) OR
    -- Adminii pot edita orice
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Moderatorii și adminii pot șterge topicuri" ON forum_topics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON fm.subcategory_id = fs.id
      WHERE fm.user_id = auth.uid() AND fs.id = subcategory_id
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU POSTĂRI
-- =============================================

-- Postări - vizibile pentru toți (dacă nu sunt șterse), create de utilizatori autentificați
CREATE POLICY "Postări vizibile pentru toți" ON forum_posts
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Utilizatorii autentificați pot crea postări" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

CREATE POLICY "Creatorii pot edita propriile postări" ON forum_posts
  FOR UPDATE USING (
    auth.uid() = user_id OR
    -- Moderatorii pot edita postările din categoriile lor
    EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON fm.subcategory_id = fs.id
      JOIN forum_topics ft ON ft.subcategory_id = fs.id
      WHERE fm.user_id = auth.uid() AND ft.id = topic_id
    ) OR
    -- Adminii pot edita orice
    auth.jwt() ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU MODERATORI
-- =============================================

CREATE POLICY "Moderatori vizibili pentru toți" ON forum_moderators
  FOR SELECT USING (true);

CREATE POLICY "Doar adminii pot numi moderatori" ON forum_moderators
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU MESAJE PRIVATE
-- =============================================

CREATE POLICY "Utilizatorii văd doar propriile mesaje" ON forum_private_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

CREATE POLICY "Utilizatorii pot trimite mesaje" ON forum_private_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = sender_id
  );

CREATE POLICY "Utilizatorii pot marca mesajele ca citite" ON forum_private_messages
  FOR UPDATE USING (
    auth.uid() = recipient_id OR 
    auth.uid() = sender_id
  );

-- =============================================
-- POLITICI PENTRU ABONAMENTE
-- =============================================

CREATE POLICY "Utilizatorii văd doar propriile abonamente" ON forum_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Utilizatorii pot crea abonamente" ON forum_subscriptions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

CREATE POLICY "Utilizatorii pot șterge propriile abonamente" ON forum_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- POLITICI PENTRU RAPORTĂRI
-- =============================================

CREATE POLICY "Moderatorii și adminii văd raportările" ON forum_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM forum_moderators WHERE user_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Utilizatorii pot raporta conținut" ON forum_reports
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = reporter_id
  );

CREATE POLICY "Moderatorii pot actualiza raportările" ON forum_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM forum_moderators WHERE user_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU ATAȘAMENTE
-- =============================================

CREATE POLICY "Atașamentele sunt vizibile pentru toți" ON forum_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forum_posts fp 
      WHERE fp.id = post_id AND fp.is_deleted = false
    )
  );

CREATE POLICY "Utilizatorii pot atașa fișiere la propriile postări" ON forum_attachments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM forum_posts fp 
      WHERE fp.id = post_id AND fp.user_id = auth.uid()
    )
  );

-- =============================================
-- POLITICI PENTRU RECLAME
-- =============================================

CREATE POLICY "Reclamele active sunt vizibile pentru toți" ON forum_ads
  FOR SELECT USING (
    is_active = true AND 
    start_date <= CURRENT_DATE AND 
    end_date >= CURRENT_DATE
  );

CREATE POLICY "Doar adminii pot gestiona reclamele" ON forum_ads
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- =============================================
-- POLITICI PENTRU STATISTICI
-- =============================================

CREATE POLICY "Statisticile sunt vizibile pentru toți" ON forum_stats
  FOR SELECT USING (true);

CREATE POLICY "Doar adminii pot actualiza statisticile" ON forum_stats
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- =============================================
-- FUNCȚII HELPER PENTRU VERIFICAREA ROLURILOR
-- =============================================

-- Funcție pentru verificarea dacă utilizatorul este moderator
CREATE OR REPLACE FUNCTION is_moderator(user_uuid UUID, category_uuid UUID DEFAULT NULL, subcategory_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM forum_moderators 
    WHERE user_id = user_uuid 
    AND (category_id = category_uuid OR category_uuid IS NULL)
    AND (subcategory_id = subcategory_uuid OR subcategory_uuid IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcție pentru verificarea dacă utilizatorul este admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
