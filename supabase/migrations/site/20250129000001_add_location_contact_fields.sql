-- Add contact and management fields to fishing_locations
-- Note: subtitle and administrare already exist in the table

-- Add new contact fields
ALTER TABLE public.fishing_locations
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS youtube_channel TEXT,
ADD COLUMN IF NOT EXISTS administrare_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.fishing_locations.website IS 'Website URL for the location';
COMMENT ON COLUMN public.fishing_locations.phone IS 'Contact phone number';
COMMENT ON COLUMN public.fishing_locations.youtube_channel IS 'YouTube channel URL';
COMMENT ON COLUMN public.fishing_locations.administrare IS 'Name of the entity managing the location (existing field)';
COMMENT ON COLUMN public.fishing_locations.administrare_url IS 'URL for the managing entity (clickable link)';

