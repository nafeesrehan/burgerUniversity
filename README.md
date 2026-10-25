# Burger University | The Best Burger in Town 🍔

An award-winning, interactive **225-frame scrollytelling experience** and modern restaurant web application for **Burger University** — Raniganj's No.1 Craft Burger & Street Food Lab.

---

## 🌟 Key Features

- **225-Frame High-DPI Canvas Scrollytelling Engine**: Assembles every layer of the signature double smash burger in real-time as the user scrolls, with smooth lerp physics and subpixel Retina scaling.
- **Dynamic 30% Header Fade**: "BURGER UNIVERSITY - The Best Burger in Town" headline gracefully fades out during the first 30% of scroll, giving full focus to the culinary craft.
- **Transparent Frosted-Glass Navigation Bar**: Floating navbar with in-page anchor links (`#scroll-container`, `#bestsellers`, `#categories`), a Menus dropdown, and links to all supporting pages (`menu.html`, `book-a-table.html`, `about.html`, `contact.html`).
- **Interactive Control Dock (HUD)**: Frame scrubber slider, Play/Pause auto-play engine, speed multiplier (1.0x, 1.5x, 2.0x), and Web Audio API procedural sound effects.
- **Complete Restaurant Suite**:
  - Campus Bestsellers (*The Quad Smasher*, *Himalayan Momos*, *Crispy Tenders*)
  - Interactive category spotlights
  - The Feast Pass combo promos
  - Customer reviews & Instagram showcase
  - Interactive "Add to Tray" feedback toasts

---

## 🚀 Local Development

To run the project locally:

```bash
# Clone the repository
git clone https://github.com/nafeesrehan/burgerUniversity.git
cd burgerUniversity

# Start the local server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Deploying to Vercel

This repository is pre-configured for **zero-config deployment on Vercel**:

1. Push this repository to your GitHub account.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import the `burgerUniversity` repository.
4. Keep the default settings (Framework Preset: *Other* / *Static Site*).
5. Click **"Deploy"**.

`vercel.json` is configured to enable clean URLs and automatically cache all 225 frames on Vercel's global Edge CDN with `max-age=31536000, immutable`.

---

## 📂 Project Structure

```
├── frames/              # 225 full HD culinary animation frames (001 - 225)
├── index.html           # Main home page with blank intro, scrollytelling & sections
├── menu.html            # Full menu & combos page
├── book-a-table.html    # Table reservation page
├── about.html           # About us & culinary philosophy page
├── contact.html         # Location & contact details page
├── style.css            # Scrollytelling layout & custom styling
├── app.js               # Canvas animation engine, scroll sync & audio synthesis
├── server.js            # Native Node.js static server
├── vercel.json          # Vercel deployment & CDN caching configuration
└── package.json         # Project metadata & npm scripts
```

---

© 2026 Burger University. Street Food Crafted with Soul.
