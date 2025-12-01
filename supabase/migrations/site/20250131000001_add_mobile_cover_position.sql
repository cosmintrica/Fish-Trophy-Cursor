-- Add mobile cover position support
-- Migration: 20250131000001_add_mobile_cover_position.sql
-- 
-- PROBLEMA: Cover-ul are o singură poziție, dar desktop și mobil au aspecte diferite
-- SOLUȚIA: Adăugăm o coloană separată pentru poziția cover-ului pe mobil
-- SIGUR: Coloana existentă cover_position rămâne pentru desktop (backward compatible)

-- Adăugăm coloana pentru poziția cover-ului pe mobil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_position_mobile JSONB;

-- Migrăm datele existente:
-- 1. Dacă cover_position este în format vechi (are "desktop" și "mobile" nested)
--    - Extragem "desktop" în cover_position
--    - Extragem "mobile" în cover_position_mobile
-- 2. Dacă cover_position este în format simplu (doar {x, y, scale, rotation})
--    - Păstrăm în cover_position (desktop)
--    - Copiem în cover_position_mobile (dacă nu există deja)

UPDATE public.profiles
SET 
  cover_position = CASE
    -- Dacă are format nested (desktop/mobile), extragem doar desktop
    WHEN cover_position IS NOT NULL 
         AND jsonb_typeof(cover_position) = 'object' 
         AND cover_position ? 'desktop' 
    THEN cover_position->'desktop'
    
    -- Dacă are format nested dar nu are "desktop", încercăm să extragem direct
    WHEN cover_position IS NOT NULL 
         AND jsonb_typeof(cover_position) = 'object' 
         AND cover_position ? 'mobile' 
         AND NOT (cover_position ? 'desktop')
    THEN cover_position->'mobile'  -- Folosim mobile ca desktop dacă nu există desktop
    
    -- Altfel, păstrăm așa cum este (format simplu)
    ELSE cover_position
  END,
  
  cover_position_mobile = CASE
    -- Dacă are format nested, extragem mobile
    WHEN cover_position IS NOT NULL 
         AND jsonb_typeof(cover_position) = 'object' 
         AND cover_position ? 'mobile'
    THEN cover_position->'mobile'
    
    -- Dacă nu are format nested, copiem cover_position în mobile (dacă mobile nu există deja)
    WHEN cover_position IS NOT NULL 
         AND (jsonb_typeof(cover_position) != 'object' OR NOT (cover_position ? 'mobile'))
         AND cover_position_mobile IS NULL
    THEN cover_position
    
    -- Altfel, păstrăm ce există deja
    ELSE cover_position_mobile
  END
WHERE cover_position IS NOT NULL;

-- Comentarii pentru documentație
COMMENT ON COLUMN public.profiles.cover_position IS 'Cover photo position settings for desktop: x (0-100), y (0-100), scale (50-200), rotation (0-360)';
COMMENT ON COLUMN public.profiles.cover_position_mobile IS 'Cover photo position settings for mobile: x (0-100), y (0-100), scale (50-200), rotation (0-360)';
