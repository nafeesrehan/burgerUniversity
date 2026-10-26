# Burger University 🍔🎓

An interactive restaurant web application and 225-frame scrollytelling experience for **Burger University** — Raniganj's craft smash burger and Himalayan street food restaurant.

---

## 🛠️ Technology Stack

* **Frontend:** Semantic HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS
* **Scrollytelling:** High-DPI HTML5 Canvas, Web Audio API sound synthesis, 225 rendered frames
* **Backend:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Realtime Pub/Sub, Storage, Edge Functions)
* **Spam Protection:** Cloudflare Turnstile CAPTCHA verification
* **Hosting & CI/CD:** GitHub + [Vercel](https://vercel.com) (Automated deployment on push)

---

## 🌟 Features

* **225-Frame Scrollytelling Engine:** Assembles every layer of the signature smash burger as the user scrolls, with smooth Retina rendering and physics scrubbing.
* **Live Supabase Menu & Offers:** Real-time prices, availability toggles, and promo codes (`FEAST20`) read directly from Supabase at runtime.
* **Instant Cart & WhatsApp Ordering:** Dynamic cart modal with percentage and fixed rupee discount calculations and pre-filled WhatsApp dispatch messages.
* **Table Reservations:** Turnstile-protected dining reservation system with real-time slot selection.
* **Kitchen & Reservations Admin Terminal (`admin.html`):** Role-guarded dashboard (`profiles.role = 'admin'`) for updating menu items, uploading dish photos, tracking bookings, creating discount codes, and exporting subscriber CSVs.

---

## 🗄️ Supabase Tables Overview

All tables are protected with strict **Row Level Security (RLS)**:

| Table Name | Public Access | Admin Access | Purpose |
| :--- | :--- | :--- | :--- |
| `menu_items` | `SELECT` (`is_available = true`) | `ALL` (`is_admin()`) | Food menu, live pricing, badges, and dish photos |
| `offers` | `SELECT` (active & within dates) | `ALL` (`is_admin()`) | Voucher codes, banners, and discounts |
| `table_bookings` | `INSERT` (new reservations) | `ALL` (`is_admin()`) | Customer reservation requests and statuses |
| `contact_inquiries`| `INSERT` (new inquiries) | `ALL` (`is_admin()`) | Customer feedback, catering queries, notes |
| `newsletter_subscribers`| `INSERT` (subscribe) | `ALL` (`is_admin()`) | Drops club subscriber list |
| `profiles` | `SELECT` (own profile) | `ALL` (`is_admin()`) | User roles (`admin` or `customer`) |
| `audit_log` | None | `SELECT` (`is_admin()`) | System audit records |

---

## 🚀 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nafeesrehan/burgerUniversity.git
   cd burgerUniversity
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```

3. **Open in browser:**
   Visit [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables (Names Only)

Copy `.env.example` to `.env` if using a local environment configuration:
* `SUPABASE_URL` — Your Supabase project URL
* `SUPABASE_ANON_KEY` — Your Supabase public anonymous key (safe for browser)
* `TURNSTILE_SITE_KEY` — Cloudflare Turnstile public site key

> [!NOTE]
> In frontend static files, the public Supabase URL and anon key are configured in `supabase-client.js` and `admin-auth.js`. Never put the `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

---

## ⚡ Deployment & Workflow (GitHub + Vercel)

This project is configured for **Continuous Deployment** on Vercel:

1. **Push to `main` branch:**
   Any change pushed to the `main` branch automatically triggers Vercel to build and deploy the live site in about a minute.
2. **Push to other branches:**
   Creates instant preview deployments for testing without affecting the live website.
3. **Menu & Content Updates:**
   Changes to menu items, prices, availability, or promo codes made in `admin.html` save to Supabase and reflect on the live website **instantly** without needing a code push or redeployment.

---

## 📦 Publishing Updates from PowerShell

To publish site updates cleanly:

```powershell
npm run check
git add .
git commit -m "Update site content"
git push origin main
```

---

© 2026 Burger University. Street Food Crafted with Soul.
