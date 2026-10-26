-- ============================================================
-- BURGER UNIVERSITY - RLS & SUPABASE SECURITY AUDIT FIX
-- ============================================================
-- Run this script in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================

-- 1. DROP INSECURE POLICIES
-- Drop existing policies that permit any authenticated user full access
DROP POLICY IF EXISTS "Allow authenticated full access to table_bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Allow authenticated full access to contact_inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Allow authenticated full access to newsletter_subscribers" ON public.newsletter_subscribers;

-- Drop legacy / duplicate policies
DROP POLICY IF EXISTS "Public can book" ON public.table_bookings;
DROP POLICY IF EXISTS "Allow public anonymous inserts to table_bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Admin manage bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Public anonymous insert booking" ON public.table_bookings;
DROP POLICY IF EXISTS "Admin full manage table_bookings" ON public.table_bookings;

DROP POLICY IF EXISTS "Public can enquire" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Allow public anonymous inserts to contact_inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Admin manage enquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Public anonymous insert inquiry" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Admin full manage contact_inquiries" ON public.contact_inquiries;

DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public anonymous inserts to newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin manage subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public anonymous insert subscriber" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin full manage newsletter_subscribers" ON public.newsletter_subscribers;

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. ENSURE is_admin() FUNCTION EXISTS AND IS SECURITY DEFINER
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

-- 4. TABLE_BOOKINGS POLICIES:
-- Visitors / Customers can only INSERT reservations
CREATE POLICY "Public anonymous insert booking"
  ON public.table_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only verified admins can SELECT, UPDATE, or DELETE reservations
CREATE POLICY "Admin full manage table_bookings"
  ON public.table_bookings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. CONTACT_INQUIRIES POLICIES:
-- Visitors can only INSERT inquiries
CREATE POLICY "Public anonymous insert inquiry"
  ON public.contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only verified admins can SELECT, UPDATE, or DELETE inquiries
CREATE POLICY "Admin full manage contact_inquiries"
  ON public.contact_inquiries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. NEWSLETTER_SUBSCRIBERS POLICIES:
-- Visitors can only INSERT email signups
CREATE POLICY "Public anonymous insert subscriber"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only verified admins can SELECT, UPDATE, or DELETE subscribers
CREATE POLICY "Admin full manage newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. PROFILES POLICIES:
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;

-- Users can read their own profile to verify their role
CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view and update all profiles
CREATE POLICY "Admin manage profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. AUTO-CREATE PROFILE ON USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. ADD TABLES TO SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_inquiries;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_subscribers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
