-- Create table for accommodations (pensiuni, complexe, cazări) that may have fishing facilities
-- Created: 2025-01-11

CREATE TABLE IF NOT EXISTS public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  accommodation_type text NOT NULL CHECK (accommodation_type IN ('pensiune', 'complex', 'cazare', 'hotel', 'vila')),
  address text NOT NULL,
  city text NOT NULL,
  county text NOT NULL,
  region text NOT NULL CHECK (region IN ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  fishing_location_id uuid REFERENCES public.fishing_locations(id) ON DELETE SET NULL, -- Optional link to fishing location
  has_fishing_pond boolean DEFAULT false,
  fishing_pond_details jsonb, -- Details about fishing pond if has_fishing_pond = true
  phone text,
  email text,
  website text,
  facilities text[], -- ['cazare', 'restaurant', 'parcare', 'baltă_pescuit', 'chirie_barcă', 'wc', 'duș']
  rating decimal(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

-- Public read + Admin CRUD
DROP POLICY IF EXISTS "Anyone can view accommodations" ON public.accommodations;
CREATE POLICY "Anyone can view accommodations"
  ON public.accommodations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Admin update accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Admin delete accommodations" ON public.accommodations;

CREATE POLICY "Admin insert accommodations" 
  ON public.accommodations FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin update accommodations" 
  ON public.accommodations FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin delete accommodations" 
  ON public.accommodations FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_accommodations_updated_at ON public.accommodations;
CREATE TRIGGER update_accommodations_updated_at
BEFORE UPDATE ON public.accommodations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accommodations_region ON public.accommodations(region);
CREATE INDEX IF NOT EXISTS idx_accommodations_county ON public.accommodations(county);
CREATE INDEX IF NOT EXISTS idx_accommodations_type ON public.accommodations(accommodation_type);
CREATE INDEX IF NOT EXISTS idx_accommodations_fishing_location ON public.accommodations(fishing_location_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_coords ON public.accommodations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_accommodations_has_pond ON public.accommodations(has_fishing_pond);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_accommodations_name_trgm
  ON public.accommodations USING gin (name gin_trgm_ops);

-- Comments for documentation
COMMENT ON TABLE public.accommodations IS 'Accommodations (pensiuni, complexe, cazări) that may have fishing facilities or be near fishing locations';
COMMENT ON COLUMN public.accommodations.accommodation_type IS 'Type of accommodation: pensiune, complex, cazare, hotel, vila';
COMMENT ON COLUMN public.accommodations.fishing_location_id IS 'Optional link to a fishing location if accommodation is near or has access to it';
COMMENT ON COLUMN public.accommodations.has_fishing_pond IS 'Whether the accommodation has its own fishing pond';
COMMENT ON COLUMN public.accommodations.fishing_pond_details IS 'JSON details about the fishing pond: species, prices, rules, etc.';
COMMENT ON COLUMN public.accommodations.facilities IS 'Array of facilities: cazare, restaurant, parcare, baltă_pescuit, chirie_barcă, wc, duș';

