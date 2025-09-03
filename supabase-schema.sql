-- Supabase schema for Fish Trophy
-- Run this in Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  phone TEXT,
  bio TEXT DEFAULT 'Pescar pasionat din România!',
  location TEXT,
  website TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, photo_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE 
      WHEN NEW.email = 'cosmin.trica@outlook.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create fishing locations table
CREATE TABLE IF NOT EXISTS public.fishing_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lac', 'rau', 'baraj', 'piscina')),
  county TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  species TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on fishing_locations
ALTER TABLE public.fishing_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for fishing_locations (public read)
CREATE POLICY "Anyone can view fishing locations" ON public.fishing_locations
  FOR SELECT USING (true);

-- Create records table
CREATE TABLE IF NOT EXISTS public.records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  species TEXT NOT NULL,
  weight DECIMAL(5, 2),
  length INTEGER,
  location_id UUID REFERENCES public.fishing_locations(id),
  location_name TEXT,
  date_caught DATE NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on records
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Create policies for records
CREATE POLICY "Users can view all records" ON public.records
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own records" ON public.records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON public.records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can verify records" ON public.records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert some sample fishing locations
INSERT INTO public.fishing_locations (name, type, county, region, latitude, longitude, species) VALUES
('Lacul Snagov', 'lac', 'Ilfov', 'Muntenia', 44.7333, 26.1833, ARRAY['Crap', 'Șalău', 'Biban', 'Platca']),
('Dunărea', 'rau', 'Constanța', 'Dobrogea', 44.1667, 28.6333, ARRAY['Șalău', 'Biban', 'Platca']),
('Lacul Herăstrău', 'lac', 'București', 'Muntenia', 44.4833, 26.0833, ARRAY['Crap', 'Biban']),
('Lacul Cernica', 'lac', 'Ilfov', 'Muntenia', 44.4167, 26.2833, ARRAY['Crap', 'Șalău', 'Biban']),
('Râul Argeș', 'rau', 'Argeș', 'Muntenia', 44.3167, 24.3167, ARRAY['Șalău', 'Biban', 'Platca'])
ON CONFLICT DO NOTHING;
