-- Create table for AJVPS offices and other institutions that issue fishing permits
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS public.ajvps_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  office_type text NOT NULL CHECK (office_type IN ('ajvps', 'primarie', 'agentie', 'institutie')),
  address text NOT NULL,
  city text NOT NULL,
  county text NOT NULL,
  region text NOT NULL CHECK (region IN ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  phone text,
  email text,
  website text,
  opening_hours text,
  services text[], -- ['permise_pescuit', 'informatii', 'consultanta', 'recomandari']
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ajvps_offices ENABLE ROW LEVEL SECURITY;

-- Public read + Admin CRUD
DROP POLICY IF EXISTS "Anyone can view ajvps offices" ON public.ajvps_offices;
CREATE POLICY "Anyone can view ajvps offices"
  ON public.ajvps_offices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert ajvps_offices" ON public.ajvps_offices;
DROP POLICY IF EXISTS "Admin update ajvps_offices" ON public.ajvps_offices;
DROP POLICY IF EXISTS "Admin delete ajvps_offices" ON public.ajvps_offices;

CREATE POLICY "Admin insert ajvps_offices" 
  ON public.ajvps_offices FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin update ajvps_offices" 
  ON public.ajvps_offices FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin delete ajvps_offices" 
  ON public.ajvps_offices FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ajvps_offices_updated_at ON public.ajvps_offices;
CREATE TRIGGER update_ajvps_offices_updated_at
BEFORE UPDATE ON public.ajvps_offices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ajvps_offices_region ON public.ajvps_offices(region);
CREATE INDEX IF NOT EXISTS idx_ajvps_offices_county ON public.ajvps_offices(county);
CREATE INDEX IF NOT EXISTS idx_ajvps_offices_type ON public.ajvps_offices(office_type);
CREATE INDEX IF NOT EXISTS idx_ajvps_offices_coords ON public.ajvps_offices(latitude, longitude);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_ajvps_offices_name_trgm
  ON public.ajvps_offices USING gin (name gin_trgm_ops);

-- Comments for documentation
COMMENT ON TABLE public.ajvps_offices IS 'AJVPS offices and other institutions that issue fishing permits';
COMMENT ON COLUMN public.ajvps_offices.office_type IS 'Type of office: ajvps, primarie, agentie, institutie';
COMMENT ON COLUMN public.ajvps_offices.services IS 'Array of services offered: permise_pescuit, informatii, consultanta, recomandari';

