-- ============================================================
-- BURGER UNIVERSITY - OFFERS & PROMOTIONS MIGRATION
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

-- 1. CREATE OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  badge_text text DEFAULT 'HOT DEAL',
  discount_code text, -- e.g. 'VARSITY20'
  discount_percent integer DEFAULT 20, -- Percentage discount (e.g. 10, 15, 20)
  discount_amount numeric DEFAULT 0, -- Or fixed rupee discount
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  cta_text text DEFAULT 'Order Now',
  cta_url text DEFAULT 'menu.html',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure discount_percent column exists if table existed previously
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'offers' 
      AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE public.offers ADD COLUMN discount_percent integer DEFAULT 20;
  END IF;
END $$;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR OFFERS
-- Public can view active offers within date range
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND now() >= starts_at AND now() <= ends_at);

-- Admins can create, edit, toggle, and delete offers
DROP POLICY IF EXISTS "Admins manage offers" ON public.offers;
CREATE POLICY "Admins manage offers"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. ADD TO REALTIME PUBLICATION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. SEED INITIAL ACTIVE PROMOTIONS WITH CODES
INSERT INTO public.offers (title, description, badge_text, discount_code, discount_percent, starts_at, ends_at, is_active, cta_text, cta_url)
VALUES
  (
    'Varsity Welcome Drop: 20% OFF',
    'Get 20% off your entire meal! Use code VARSITY20 at checkout on all handcrafted burgers and Himalayan momos.',
    '20% OFF',
    'VARSITY20',
    20,
    now() - interval '1 hour',
    now() + interval '30 days',
    true,
    'Order with Code',
    'menu.html?code=VARSITY20'
  ),
  (
    'Semester Kickoff Combo Special',
    'Varsity Double Smasher + Peri Peri Masala Crinkle Fries + House Salted Caramel Shake for just ₹399!',
    'HOT COMBO',
    'SEMESTER50',
    15,
    now() - interval '2 hours',
    now() + interval '14 days',
    true,
    'Claim Deal',
    'menu.html?code=SEMESTER50'
  )
ON CONFLICT DO NOTHING;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
