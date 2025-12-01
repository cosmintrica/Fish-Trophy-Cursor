-- =============================================
-- Migration 09: Piața Pescarului (Marketplace)
-- =============================================
-- Descriere: Verificare vânzători și feedback marketplace
-- Dependințe: 04_users.sql, 06_topics_posts.sql
-- =============================================

-- Verificare automată eligibilitate vânzare
CREATE TABLE forum_sales_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_age_days INTEGER DEFAULT 0, -- Calculat automat (min 15 zile)
  reputation_points INTEGER DEFAULT 0, -- Min 10 puncte
  post_count INTEGER DEFAULT 0, -- Min 25 postări
  is_eligible BOOLEAN DEFAULT false, -- Actualizat automat
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  successful_sales INTEGER DEFAULT 0, -- Număr tranzacții reușite
  failed_sales INTEGER DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback marketplace (review-uri vânzători)
CREATE TABLE forum_marketplace_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  transaction_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sale_post_id, buyer_id) -- Un cumpărător = un review per anunț
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_sales_verification_user ON forum_sales_verification(user_id);
CREATE INDEX idx_forum_sales_verification_eligible ON forum_sales_verification(is_eligible) WHERE is_eligible = true;

CREATE INDEX idx_forum_marketplace_feedback_seller ON forum_marketplace_feedback(seller_id, created_at DESC);
CREATE INDEX idx_forum_marketplace_feedback_post ON forum_marketplace_feedback(sale_post_id);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_sales_verification IS 'Verificare automată eligibilitate vânzare: 15 zile cont + 10 reputație + 25 postări + email verificat';
COMMENT ON TABLE forum_marketplace_feedback IS 'Review-uri vânzători cu rating 1-5 stele - Badge "Vânzător Verificat" după 5 tranzacții pozitive';
COMMENT ON COLUMN forum_sales_verification.is_eligible IS 'True dacă îndeplinește TOATE condițiile: account_age_days >= 15 AND reputation_points >= 10 AND post_count >= 25 AND email_verified = true';
