-- =============================================
-- Migration 16: RLS Policies - Marketplace & Features
-- =============================================
-- Descriere: Politici RLS pentru marketplace, PM, subscriptions, attachments, polls
-- Dependințe: 09_marketplace.sql, 10_additional_features.sql
-- =============================================

-- =============================================
-- ACTIVARE RLS
-- =============================================

ALTER TABLE forum_sales_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_marketplace_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_ads ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLITICI MARKETPLACE
-- =============================================

-- Verificare vânzători - doar proprietarul și adminii văd
CREATE POLICY "Verificare vânzători privată" ON forum_sales_verification
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- Auto-create la primul check
CREATE POLICY "Auto-create verificare" ON forum_sales_verification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Feedback marketplace - vizibil pentru toți (transparență)
CREATE POLICY "Feedback marketplace vizibil" ON forum_marketplace_feedback
  FOR SELECT USING (true);

-- Cumpărătorii pot lăsa feedback
CREATE POLICY "Cumpărători lasă feedback" ON forum_marketplace_feedback
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = buyer_id
  );

-- =============================================
-- POLITICI MESAJE PRIVATE
-- =============================================

-- PM vizibile doar pentru expeditor și destinatar
CREATE POLICY "PM vizibile pentru implicați" ON forum_private_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
  );

-- Utilizatorii pot trimite PM
CREATE POLICY "Utilizatorii pot trimite PM" ON forum_private_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = sender_id
    AND NOT has_active_restriction(auth.uid(), 'mute')
  );

-- Utilizatorii pot actualiza propriile PM (mark as read, delete)
CREATE POLICY "Utilizatorii actualizează PM" ON forum_private_messages
  FOR UPDATE USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
  );

-- =============================================
-- POLITICI SUBSCRIPTIONS
-- =============================================

-- Subscriptions vizibile doar pentru proprietar
CREATE POLICY "Subscriptions private" ON forum_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Utilizatorii pot crea subscriptions
CREATE POLICY "Utilizatorii pot subscribe" ON forum_subscriptions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  );

-- Utilizatorii pot șterge subscriptions
CREATE POLICY "Utilizatorii pot unsubscribe" ON forum_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- POLITICI ATTACHMENTS
-- =============================================

-- Attachments vizibile dacă postarea e vizibilă
CREATE POLICY "Attachments vizibile cu postarea" ON forum_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forum_posts fp
      WHERE fp.id = post_id AND fp.is_deleted = false
    )
  );

-- Utilizatorii pot atașa la propriile postări
CREATE POLICY "Utilizatorii atașează la postările lor" ON forum_attachments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM forum_posts fp
      WHERE fp.id = post_id AND fp.user_id = auth.uid()
    )
  );

-- =============================================
-- POLITICI POLLS
-- =============================================

-- Polls vizibile pentru toți
CREATE POLICY "Polls vizibile" ON forum_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forum_topics ft
      WHERE ft.id = topic_id AND ft.is_deleted = false
    )
  );

-- Creatorii topicului pot crea poll
CREATE POLICY "Creat poll în propriul topic" ON forum_polls
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM forum_topics ft
      WHERE ft.id = topic_id AND ft.user_id = auth.uid()
    )
  );

-- Voturi vizibile pentru toți
CREATE POLICY "Voturi polls vizibile" ON forum_poll_votes
  FOR SELECT USING (true);

-- Utilizatorii autentificați pot vota
CREATE POLICY "Utilizatorii pot vota" ON forum_poll_votes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  );

-- =============================================
-- POLITICI STATS & ADS
-- =============================================

-- Statistici vizibile pentru toți
CREATE POLICY "Statistici publice" ON forum_stats
  FOR SELECT USING (true);

-- Doar adminii actualizează statistici
CREATE POLICY "Doar adminii actualizează stats" ON forum_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- Ads active vizibile pentru toți
CREATE POLICY "Ads active vizibile" ON forum_ads
  FOR SELECT USING (
    is_active = true
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  );

-- Doar adminii gestionează ads
CREATE POLICY "Doar adminii gestionează ads" ON forum_ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON POLICY "Feedback marketplace vizibil" ON forum_marketplace_feedback IS 'Feedback complet public pentru transparență (badge Vânzător Verificat după 5 pozitive)';
COMMENT ON POLICY "PM vizibile pentru implicați" ON forum_private_messages IS 'Mesaje private vizibile DOAR pentru expeditor și destinatar';
COMMENT ON POLICY "Ads active vizibile" ON forum_ads IS 'Doar ads active în perioada start_date-end_date sunt vizibile';
