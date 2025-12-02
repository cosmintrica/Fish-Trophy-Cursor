-- Migration: Add Catches (Jurnal de Capturi) with Social Features
-- Created: 2025-11-28
-- Description: Complete social fishing journal system with likes, comments, and shares

-- =============================================
-- 1. CATCHES TABLE (Jurnal de Capturi)
-- =============================================
CREATE TABLE IF NOT EXISTS public.catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_id UUID REFERENCES public.fish_species(id),
  location_id UUID REFERENCES public.fishing_locations(id),
  
  -- Optional metrics (nu sunt obligatorii ca la records)
  weight DECIMAL(5,2) CHECK (weight IS NULL OR weight >= 0),
  length_cm DECIMAL(5,2) CHECK (length_cm IS NULL OR length_cm >= 0),
  
  -- Content
  captured_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  photo_url TEXT,
  video_url TEXT,
  
  -- Privacy
  is_public BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catches_user ON public.catches(user_id);
CREATE INDEX IF NOT EXISTS idx_catches_species ON public.catches(species_id);
CREATE INDEX IF NOT EXISTS idx_catches_location ON public.catches(location_id);
CREATE INDEX IF NOT EXISTS idx_catches_public ON public.catches(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_catches_created ON public.catches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catches_user_created ON public.catches(user_id, created_at DESC);

-- RLS for catches
ALTER TABLE public.catches ENABLE ROW LEVEL SECURITY;

-- Public can view public catches
CREATE POLICY "Public can view public catches"
  ON public.catches FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Users can insert own catches
CREATE POLICY "Users can insert own catches"
  ON public.catches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own catches
CREATE POLICY "Users can update own catches"
  ON public.catches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own catches
CREATE POLICY "Users can delete own catches"
  ON public.catches FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 2. CATCH LIKES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.catch_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id UUID NOT NULL REFERENCES public.catches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(catch_id, user_id) -- One like per user per catch
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_catch_likes_catch ON public.catch_likes(catch_id);
CREATE INDEX IF NOT EXISTS idx_catch_likes_user ON public.catch_likes(user_id);

-- RLS for catch_likes
ALTER TABLE public.catch_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view likes"
  ON public.catch_likes FOR SELECT
  USING (true);

-- Users can like/unlike catches
CREATE POLICY "Users can like catches"
  ON public.catch_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike catches"
  ON public.catch_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 3. CATCH COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.catch_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id UUID NOT NULL REFERENCES public.catches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.catch_comments(id) ON DELETE CASCADE, -- For replies
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_catch_comments_catch ON public.catch_comments(catch_id);
CREATE INDEX IF NOT EXISTS idx_catch_comments_user ON public.catch_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_catch_comments_parent ON public.catch_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_catch_comments_created ON public.catch_comments(created_at DESC);

-- RLS for catch_comments
ALTER TABLE public.catch_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on public catches or their own catches
CREATE POLICY "Users can view comments on accessible catches"
  ON public.catch_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.catches c
      WHERE c.id = catch_comments.catch_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

-- Users can comment on accessible catches
CREATE POLICY "Users can comment on accessible catches"
  ON public.catch_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.catches c
      WHERE c.id = catch_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

-- Users can update own comments
CREATE POLICY "Users can update own comments"
  ON public.catch_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
  ON public.catch_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 4. TRIGGERS & FUNCTIONS
-- =============================================

-- Update updated_at for catches
CREATE TRIGGER update_catches_updated_at
BEFORE UPDATE ON public.catches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at for comments
CREATE TRIGGER update_catch_comments_updated_at
BEFORE UPDATE ON public.catch_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Mark comment as edited
CREATE OR REPLACE FUNCTION public.mark_comment_edited()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.is_edited := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_catch_comment_edited
BEFORE UPDATE ON public.catch_comments
FOR EACH ROW
EXECUTE FUNCTION public.mark_comment_edited();

-- =============================================
-- 6. VIEWS FOR EASY QUERYING
-- =============================================

-- View with aggregated stats
CREATE OR REPLACE VIEW public.catches_with_stats AS
SELECT 
  c.*,
  COALESCE(like_counts.like_count, 0) AS like_count,
  COALESCE(comment_counts.comment_count, 0) AS comment_count,
  EXISTS (
    SELECT 1 FROM public.catch_likes cl
    WHERE cl.catch_id = c.id AND cl.user_id = auth.uid()
  ) AS is_liked_by_current_user
FROM public.catches c
LEFT JOIN (
  SELECT catch_id, COUNT(*) AS like_count
  FROM public.catch_likes
  GROUP BY catch_id
) like_counts ON like_counts.catch_id = c.id
LEFT JOIN (
  SELECT catch_id, COUNT(*) AS comment_count
  FROM public.catch_comments
  WHERE parent_comment_id IS NULL -- Only top-level comments
  GROUP BY catch_id
) comment_counts ON comment_counts.catch_id = c.id;

-- Comments with user info
CREATE OR REPLACE VIEW public.catch_comments_with_users AS
SELECT 
  cc.*,
  p.display_name AS user_display_name,
  p.username AS user_username,
  p.photo_url AS user_avatar_url,
  (
    SELECT COUNT(*) 
    FROM public.catch_comments replies 
    WHERE replies.parent_comment_id = cc.id
  ) AS reply_count
FROM public.catch_comments cc
JOIN public.profiles p ON p.id = cc.user_id;

