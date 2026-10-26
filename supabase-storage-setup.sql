-- ============================================================
-- BURGER UNIVERSITY - MENU ITEMS & STORAGE BUCKET MIGRATION
-- ============================================================
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================

-- 0. ENSURE is_admin() FUNCTION EXISTS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 1. CREATE MENU_ITEMS TABLE (IF NOT EXISTS) WITH image_url
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'burgers', -- 'burgers', 'momos', 'crispy-chicken', 'sides', 'beverages', 'combos'
  price numeric NOT NULL,
  description text NOT NULL,
  image_url text,
  diet text NOT NULL DEFAULT 'non-veg', -- 'veg', 'non-veg'
  badge text,
  rating_text text DEFAULT '4.8 ★',
  is_spicy boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure image_url column exists if table was already created earlier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'menu_items' 
      AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN image_url text;
  END IF;
END $$;

-- 2. ENABLE ROW LEVEL SECURITY ON MENU_ITEMS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid duplicates
DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
CREATE POLICY "Public can view available menu items"
  ON public.menu_items
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

DROP POLICY IF EXISTS "Admins manage menu items" ON public.menu_items;
CREATE POLICY "Admins manage menu items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. CREATE 'menu-images' STORAGE BUCKET (2 MB limit, JPEG/PNG/WebP, Public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  2097152, -- 2 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. STORAGE RLS POLICIES FOR 'menu-images' BUCKET
-- (a) Public read access: Anyone (including unauthenticated visitors) can view menu images
DROP POLICY IF EXISTS "Public can view menu images" ON storage.objects;
CREATE POLICY "Public can view menu images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'menu-images');

-- (b) Admin upload access: Only logged-in users with profiles.role = 'admin' can upload
DROP POLICY IF EXISTS "Admins can upload menu images" ON storage.objects;
CREATE POLICY "Admins can upload menu images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_admin()
  );

-- (c) Admin update access: Only logged-in admins can overwrite/update images
DROP POLICY IF EXISTS "Admins can update menu images" ON storage.objects;
CREATE POLICY "Admins can update menu images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_admin()
  );

-- (d) Admin delete access: Only logged-in admins can delete images from storage
DROP POLICY IF EXISTS "Admins can delete menu images" ON storage.objects;
CREATE POLICY "Admins can delete menu images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_admin()
  );

-- 5. ENABLE REALTIME FOR MENU_ITEMS
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
