-- Add public view policy for user_gear when show_gear_publicly is true
-- Migration: 20250130000002_add_public_gear_view_policy.sql
-- 
-- PROBLEMA: Utilizatorii nu pot vedea echipamentele publice ale altor utilizatori
-- SOLUȚIA: Adăugăm o policy RLS care permite vizualizarea echipamentelor publice
-- SIGUR: Policy-ul verifică că show_gear_publicly = true în profiles pentru user_id respectiv

-- Adăugăm policy pentru vizualizare publică a echipamentelor
CREATE POLICY "Public can view gear when profile allows it"
  ON public.user_gear FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_gear.user_id
      AND profiles.show_gear_publicly = true
    )
  );

