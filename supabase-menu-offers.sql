-- ============================================================
-- BURGER UNIVERSITY - MENU ITEMS & OFFERS SCHEMA & SEED
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

-- 1. CREATE MENU_ITEMS TABLE
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

-- 2. CREATE OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  badge_text text DEFAULT 'HOT DEAL',
  discount_code text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  cta_text text DEFAULT 'Order Now',
  cta_url text DEFAULT 'menu.html',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES FOR MENU_ITEMS
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

-- 5. POLICIES FOR OFFERS
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND now() >= starts_at AND now() <= ends_at);

DROP POLICY IF EXISTS "Admins manage offers" ON public.offers;
CREATE POLICY "Admins manage offers"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. ADD TO REALTIME PUBLICATION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 7. SEED INITIAL MENU ITEMS (FROM HARDCODED MENU)
INSERT INTO public.menu_items (name, category, price, description, image_url, diet, badge, rating_text, is_spicy, is_available, sort_order)
VALUES
  (
    'Varsity Double Smashed',
    'burgers',
    289,
    'Two crispy lacy patties smashed hard, melted American cheddar, grilled onions, pickles, tomato & signature Varsity sauce in toasted brioche.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA7REeHTSVUOwrpSDED-BylluXgQnMUOWv717r_xR28QkPkQE_1wJOfa6q_OtoqQXXxKWRJvsEOUGlo9sLvSJ5rA4Byyfa9wgOOHSVMwJADpoozymcQDfuThipt1okNRXNXLEv0jeB8XFtr8SbsenVUsRKUG_FlUDpIupcJxQfqDTxE5iSzX2R5GYrOsFo0-X4exIRZk5rCqN2wFkNDzFRiG2DkIqz4f4N7qksAMI3Op-ET8s55H7lIOQ',
    'non-veg',
    'House Signature',
    '4.9 ★ (420+ reviews)',
    true,
    true,
    1
  ),
  (
    'Steamed Himalayan Chicken',
    'momos',
    199,
    'Authentic thin-skin hand-pinched momos filled with seasoned minced chicken, ginger, and scallions. Served with fiery Dalle red chutney and sesame dip.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB6tG7f4PLoySBLh6fMkzQV66ubosx7OV8gnbQAWRvV-PN0Z544_NRATr0kn5YJPYVYew5XOj-rWdlrgXqX0XQ0LSJ5GDCuxq2rlUQE2scBmIDIvZFLyGev95e249n5G8Q4RDr4uFY6Wv90CrdPp6RlEE09Z-x4WHaF_hjvuHODEyx_evpmXoBWf3sFbUQurKw8S_V3Zkter3M1hqEYZMWCyrEoLSzsfwfqevTygYrgX3uH3WU4valkNw',
    'non-veg',
    'Mountain Recipe',
    '8 Pcs • Bamboo Steamed',
    true,
    true,
    2
  ),
  (
    'Buttermilk Fried Tenders',
    'crispy-chicken',
    249,
    '5 whole muscle chicken tenderloins brined in cultured buttermilk for 12 hours, double-dusted in secret spiced dredge. Served with house honey mustard.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCqbBVdMgq_RAnnhwfeUj1MAC0hmfe5z7r-rldbiDlOVuFCRa5LZqV3R4xleK6BjYQHaXgvVlrAcDhLLqPssRyDODcLtYnSp73CvINwlFp-2x93wMwCx9A4tNwhiYIRHUtk4fKTGG4-ZpH-KD6j4N2-Zl25b1WC1XP9mqwlzkvEb0hfvI1L6THe96wLeF8ln1Nqi5RoIiLmo8awrdwYgzgl0M5jE9zOJyWj3TwELgSqDh0N0zo4Qs6uZQ',
    'non-veg',
    'Golden Crunch',
    '5 Pcs • 2 Signature Dips',
    false,
    true,
    3
  ),
  (
    'Truffle Mushroom Melt',
    'burgers',
    329,
    'Smashed patty with crisp caramelized edges, genuine Swiss gruyère, butter-sautéed portobello mushrooms, and white truffle garlic aioli.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBIZSpCidzWEWxRGWkBkYov5SCcvl9fT-bHK02pTL2HN5fYsiGNXt8bUi-mnFNqtw1uNNdPfB8AXbJSZEB40ZBNzFrK8hzL2K6E0Euyz3g42inyhLNxv6zoAYg9ceHHJh3n62JFuOfFIkEZarulHzQImpa6h8tecTsHQ6IMzp2g2WokNpFgKvRko6uMYi7238Krqz0z__YW2lCRcR3bPXd20rE4MdqEPyifjK33g_iSFnh3vJs4auckMg',
    'non-veg',
    'Gourmet Cut',
    'Single Smash 140g',
    false,
    true,
    4
  ),
  (
    'Crispy Paneer Makhani',
    'burgers',
    229,
    'Thick cutlet of malai cottage cheese spiced with fenugreek and paprika, panko fried, slow-cooked makhani glaze, and cooling coriander-mint emulsion.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCSCBeMwM__7jwecS672DSrlnJ48QuxPrkodxWsptm5AnR0V7rhrAjGJFrZUqJbYybTZ0JFXplHAVvkAEkg3eRfWgVczq2H2L0usIFK2U1WpHL9DgXbxGnkmOK1nP0Z9nl74bMhkIdupr1JX0A1liIq0FaDCXUlw2E9VuIYm_cpjz8-aCGkxGDfITfukC11YeGzrwqA2JsYTYR4PWKdPNrVQMltrIcqeWr3wZR9rxJ5Z9FV9NynGlcYWQ',
    'veg',
    'Veg Hero',
    '100% Vegetarian',
    false,
    true,
    5
  ),
  (
    'Pan-Fried Kothey Momos',
    'momos',
    219,
    'Half steamed, half griddled to golden crisp perfection on the cast-iron flat top. Bursting with succulent ginger chicken filling.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUsSGR1dYkixO750V6U4rD7d0H5VBBOQxBd6OGo1DclYregtRJlnil1JRSnpVSZVMCgZb7SnjLSIbDdsD8fjDq8dI4WNsigrLvvUVycSBKDUvL7r5GUx1YH4EhsrwMl-pLZVa4WFaNu5a7GaLBytLnCZvBM41lh5NuFR9QrTlWVTU6ZKJ4MkEhpa2yKr4Gvoz95M4pOgEw_JhJ6pL11wdPORB7_0AQHFrLmvmMZoOpoJCwplHPcXC3_A',
    'non-veg',
    'Skillet Toasted',
    '6 Pcs • Crispy Skirt',
    false,
    true,
    6
  ),
  (
    'Corn & Cheese Momos',
    'momos',
    179,
    'Juicy sweet corn niblets blended with molten mozzarella and sharp cheddar, seasoned with crushed black pepper and green onions.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDnpmdJDn9SoGmkdbrixt6Jdf0iBlXIaQecazXhGo-A2SMfpwZ11GXMjDN1QpNZ_kYEyCRlLzQ_aieKlvKBrZTTsFIdmJpBRMvSIHD46_XlFhvbT46RiRnq4yFlccrTjOx29WJ4zd3kKjqvGfi3CfGGEoFFBR9ORfTucnJ_CYZr93RYb38hhZfuW2HyoFW2IFh313LlajgarvwG834qOmXLv08JxdWngsMMb3jVI9PC4NcbA5Za763vHQ',
    'veg',
    'Cheese Pull',
    '8 Pcs • Warm & Melty',
    false,
    true,
    7
  ),
  (
    'Nashville Hot Wings',
    'crispy-chicken',
    269,
    '6 crispy jumbo wings tossed right out of the fryer in brown sugar and ghost pepper infused oil. Served with house bread & butter pickles and cool ranch.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCOxIy6Noo1PgGKXURMNd02CuXuTvGzgZ7hWX_b1ZkFNRWQZjHeWyOqfRNouygozuFiDJblmvoi9Osd84NxS9ZFNbn1q_YJnJltlo1tntk6NC8AiSurJZSUyTKW-xteLzRxxNHOfZDzxBBJ6fIzZzqHQPomJEZoCfoBhkCgknp1bWsF7gSA3Pl2SUGSl4sVeHQ_2MxUAbvlni7UEBqmuXtmhzuCtOJD0yJvutxtD8vAoyIb1Gvdu30jxw',
    'non-veg',
    'High Heat',
    '6 Pcs • Fiery Glaze',
    true,
    true,
    8
  ),
  (
    'Popcorn Chicken Bucket',
    'crispy-chicken',
    189,
    'Bite-sized chicken thigh nuggets battered with 11-spice batter and flash fried till shattering crisp. Perfect for desk study or street strolls.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCs51TOEHHa9SXUdlfc4uIC-Hlx0MH_VPys7TC8KWmxeI3fF3ddu2pMy9bOZ4wjVE20lP8ypRRT87NKEPNoPN_YvcAx76yAC7F-w8o1BYGqCOGX2vZEkJ_XL1o_c68I8EMLF9HEl6NiyfBEVMnETsql0SiIIzlN6hVvTHFvEL9YaAAFJpehB1lGpeDkAIr-EF-l583ubF0LBGrliRbuXoTRMj91XJI_OwwkBkzN1Kws2GXzdiLKRlgXow',
    'non-veg',
    'Snack Pack',
    '220g Bucket • Ranch Dip',
    false,
    true,
    9
  ),
  (
    'Peri Peri Crinkle Fries',
    'sides',
    129,
    'Crisp Belgian-style crinkle potatoes fried to order and shaken in our house peri-peri bird''s eye chili seasoning blend.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuATH3BQEjPEDnRR6bkJqZ1mA7_mD2H2PHM2ptv3pvtyTu8OLHaSdtQSk9wr3FGdg_Elk-NrJlSOd10O5Efbl0rtcRZBBb0yDMT7olGTvx616PtxUE8DeVxD8zH-6dFdHmWmI8v4ZRD6Do8sUArKMSzmqAd_PxEDbQcz7JTZtPWlC9ynGkxB1ib3cGz263dV6fm94BpnPsG6p3-5JrXsPSEFmNkaiBrX15jfEUr55qC5-ty45zS1hezIlQ',
    'veg',
    'Veg Side',
    'Includes Dip',
    true,
    true,
    10
  ),
  (
    'Salted Caramel Shake',
    'beverages',
    169,
    'Slow-churned dairy vanilla bean ice cream spun thick with house-cooked sea salt butterscotch caramel and malted milk.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC8Is8hptww4K9Vn88SF3nHxNm9Cc01OmB6uLwSnFObW5uWevy3jwdWsVXTwZKz2Yz0KnZa44p0hWnefr_luAvlj_ehvxkTbfifYItViV0SgXvwWSeX4EJRMxo0UL9eTaEhZMqBgDUqFpIXrs8m7jA9r_OleqFmppuJ8boAofrtuyxhQjO87535rx_aAL3tL4tfyCyNNfpMUYnCUz8BY7MK3AvJyH3X-EoscHz4yfkZZe9EcFsUlx54rA',
    'veg',
    'Veg Shake',
    '350ml Hand-Spun',
    false,
    true,
    11
  ),
  (
    'Varsity Dips Trio',
    'sides',
    79,
    'Three essential condiments: Darjeeling Fiery Dalle Chutney, Golden Honey Dijon, and Signature Smoked Garlic Mayo.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCva-y9qA9pDobFvSCZFk5Dk0y7gipMDgJSHIRrfXlVxOlaGjOAWJPkhg2r4zOMTljCiCiehB4TDy9Zsw9YvG4_67V3angH3G1IMG8bLJYZEAtIPYHYNBEQZuuMk7_pXu1YB0LweRvkhsrQHyC6m1lsuMHwv7YKwbcdX_e3707qhb_vxQGwUe86LHHsdgXGNE6I-OfG8-E9FfBLvDJVEfBhheJZOvgOUBil26raPsDEUzS-E-XgWtXNAQ',
    'veg',
    'Veg Dip',
    '3 x 40ml Tubs',
    true,
    true,
    12
  )
ON CONFLICT DO NOTHING;

-- 8. SEED INITIAL OFFERS
INSERT INTO public.offers (title, description, badge_text, discount_code, starts_at, ends_at, is_active, cta_text, cta_url)
VALUES
  (
    'The Semester Combo Special',
    'Varsity Double Smasher + Peri Peri Masala Crinkle Fries + House Salted Caramel Shake at ₹399 (Save ₹90!)',
    'HOT DEAL',
    'SEMESTER50',
    now() - interval '1 hour',
    now() + interval '30 days',
    true,
    'Order Combo Now',
    'menu.html'
  ),
  (
    'Raniganj Student Midnight Craving',
    'Flat 15% OFF on all Himalayan Chicken Momos & Smash Burgers every evening after 7 PM.',
    'STUDENT SPECIAL',
    'VARSITY15',
    now() - interval '2 days',
    now() + interval '60 days',
    true,
    'View Menu',
    'menu.html'
  )
ON CONFLICT DO NOTHING;
