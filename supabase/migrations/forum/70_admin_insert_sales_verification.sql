-- =============================================
-- Migration 70: Admin INSERT pentru forum_sales_verification
-- =============================================
-- Descriere: Permite adminilor să creeze verificări pentru alți utilizatori
-- Dependințe: 16_rls_marketplace.sql
-- =============================================

-- Șterge politica veche dacă există (pentru idempotență)
DROP POLICY IF EXISTS "Admini pot crea verificări" ON forum_sales_verification;

-- Adminii pot crea verificări pentru orice utilizator
CREATE POLICY "Admini pot crea verificări" ON forum_sales_verification
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Șterge politica veche dacă există (pentru idempotență)
DROP POLICY IF EXISTS "Admini pot actualiza verificări" ON forum_sales_verification;

-- Adminii pot actualiza verificări pentru orice utilizator
CREATE POLICY "Admini pot actualiza verificări" ON forum_sales_verification
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON POLICY "Admini pot crea verificări" ON forum_sales_verification IS 'Permite adminilor să creeze verificări pentru orice utilizator în Admin Panel';
COMMENT ON POLICY "Admini pot actualiza verificări" ON forum_sales_verification IS 'Permite adminilor să actualizeze verificări pentru orice utilizator în Admin Panel';

