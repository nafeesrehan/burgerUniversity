# 🍔 Burger University - Supabase Backend Documentation

## 🚀 Overview
A complete, serverless Supabase backend has been provisioned and integrated for **Burger University**. All forms and customer touchpoints on the website now directly insert and persist records into PostgreSQL tables protected with strict **Row-Level Security (RLS)**.

---

## 📌 Supabase Project Details
- **Project Name:** Burger University
- **Project Ref / ID:** `wiriaujhlrjcpjfmtean`
- **Organization:** WeeBuilds (`inbbojwbqhsydshxwglk`)
- **Region:** `ap-south-1` (Mumbai, India — optimal low latency for West Bengal & Indian diners)
- **Status:** Active & Healthy
- **Project URL:** `https://wiriaujhlrjcpjfmtean.supabase.co`

### API Keys
- **Modern Publishable Key:** `sb_publishable_wKxA8hZKfhdcGVPKpHSRug_TnQppMdk`
- **Legacy Anon Public Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcmlhdWpobHJqY3BqZm10ZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDg5MzYsImV4cCI6MjEwODUyNDkzNn0.0C9YLCPtQ-qb0c_B15Wzlgior73vN5lVk1ROkjvg-Sk`

---

## 🗄️ Database Tables & Schema

### 1. `table_bookings`
Stores dining table reservations made on `/book-a-table.html`.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated UUID (`gen_random_uuid()`) |
| `created_at` | `timestamptz` | Submission timestamp |
| `name` | `text` | Guest full name |
| `phone` | `text` | 10-digit Indian phone number |
| `email` | `text` (nullable) | Optional email for confirmation |
| `guests` | `integer` | Party size (1 to 12) |
| `booking_date` | `text` | Selected date (e.g. "Today", "Tomorrow", "Oct 28, 2026") |
| `time_slot` | `text` | Selected slot (e.g. "1:15 PM", "7:00 PM") |
| `seating_preference` | `text` | "Standard Booth", "High-Top Counter", or "Window Seat" |
| `special_requests` | `text` (nullable) | Allergies, birthdays, high chairs |
| `status` | `text` | Default `'confirmed'`, can be marked `'completed'` or `'cancelled'` |
| `metadata` | `jsonb` | Client metadata |

### 2. `contact_inquiries`
Stores contact queries, catering quotes, franchise inquiries from `/contact.html`.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated UUID |
| `created_at` | `timestamptz` | Submission timestamp |
| `name` | `text` | Diner or event host name |
| `phone` | `text` | Contact phone number |
| `email` | `text` | Email address |
| `topic` | `text` | Department: `general`, `dine-in`, `catering`, `franchise` |
| `message` | `text` | Detailed message / order specifics |
| `status` | `text` | Default `'new'`, can be marked `'resolved'` |
| `metadata` | `jsonb` | Page URL, browser info |

### 3. `newsletter_subscribers`
Captures "Fresh Drops & Specials" email subscriptions from all footers across the site.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated UUID |
| `created_at` | `timestamptz` | Signup timestamp |
| `email` | `text` (Unique) | Diner email address (prevents duplicates) |
| `source` | `text` | Source page (e.g. `footer_index.html`, `footer_menu.html`) |

---

## 🔒 Security & Row-Level Security (RLS)
- **RLS Enabled:** Yes, activated on all three tables.
- **Anonymous Inserts:** The public anonymous role (`anon`) has strict `INSERT` permission only.
- **Privacy Guarantee:** Public visitors **cannot** read or dump other customers' phone numbers, emails, or booking details.
- **Protected Remote Procedure Calls (RPC):**
  - `get_admin_dashboard(passcode text)`
  - `update_booking_status(passcode text, booking_id uuid, new_status text)`
  - `update_inquiry_status(passcode text, inquiry_id uuid, new_status text)`
  - These allow authorized staff to view and manage data from the admin dashboard using a secure staff passcode.

---

## 🖥️ Kitchen & Staff Admin Dashboard (`admin.html`)
A responsive, real-time dashboard is available at:
`http://localhost:3000/admin.html` (or `admin.html` when deployed)

- **Default Passcode:** `burgeradmin`
- **Features:**
  - Real-time KPI counters (Bookings, Notes, Subscribers)
  - Table search & filter across customers, dates, and phone numbers
  - Direct status toggles ("Mark Done", "Resolve", "Reopen")
  - Automatic synchronization with Supabase

---

## 💻 Frontend Client Integration (`supabase-client.js`)
Loaded on all pages (`index.html`, `book-a-table.html`, `contact.html`, `menu.html`, `about.html`).

Exposes `window.BurgerBackend`:
- `BurgerBackend.submitBooking(data)`
- `BurgerBackend.submitContact(data)`
- `BurgerBackend.submitNewsletter(email, source)`
- `BurgerBackend.showToast(message, type)`
- Automatically attaches submit handlers and loading spinners to forms.
