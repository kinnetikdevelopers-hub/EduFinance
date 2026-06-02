# EduFinance — School Financial Management System

A professional web-based school finance management system built for Kenyan primary and secondary schools. Manages student fees, payments, expenses and financial reporting.

---

## Features

- **Dashboard** — Live KPIs, charts, red flags and payment activity
- **Students** — Full student CRUD with grade/stream assignment and family discount
- **Fee Setup** — Terms, per-grade fee configuration, extra charges (trips, lab fees)
- **Payments & Tracking** — Manual and M-Pesa payment recording, per-student status tracking, bulk SMS
- **Receipts** — Printable official fee receipts with school logo
- **Expenses** — Categorised expense tracking per term
- **Reports** — Full financial summary with charts, print-ready, CSV export
- **History** — Archived students (transferred/graduated) with full fee history
- **Settings** — School profile, logo upload, user management, expense categories

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (ES2020) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Chart.js 4.4 |
| Fonts | Lato + Playfair Display (Google Fonts) |

No build tools, no bundler, no framework. Open `index.html` in a browser.

---

## Project Structure

```
edufinance/
├── index.html              # Main entry point
├── src/
│   ├── styles.css          # All application styles
│   └── app.js              # All application logic
├── assets/
│   └── icons/              # SVG icon references (inline in HTML)
├── sql/
│   ├── 01_schema.sql       # Full database schema (run first)
│   ├── 02_fix_rls.sql      # Fix Row Level Security issues
│   ├── 03_schema_update.sql # Update existing schema (if upgrading)
│   └── 04_seed_data.sql    # Optional sample data
├── docs/
│   ├── SETUP.md            # Setup guide
│   └── CHANGELOG.md        # Version history
└── README.md
```

---

## Quick Start

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Run `sql/01_schema.sql` to create all tables
4. Optionally run `sql/04_seed_data.sql` for demo data

### 2. Configure credentials

Open `src/app.js` and update the top two lines:

```js
const SB  = 'https://YOUR_PROJECT.supabase.co';
const KEY = 'YOUR_ANON_PUBLIC_KEY';
```

Find these values in your Supabase project under:
**Settings → API → Project URL** and **anon public key**

### 3. Create your first user

In Supabase dashboard → **Authentication → Users → Invite user**
(or use the Add User form in the app Settings tab once logged in)

### 4. Open the app

```bash
# Option A: Open directly
open index.html

# Option B: Use a local server (recommended)
npx serve .
# or
python3 -m http.server 8080
```

---

## Troubleshooting

### "Can't add data / permission denied"
RLS (Row Level Security) is enabled. Run `sql/02_fix_rls.sql` in Supabase SQL Editor.

### "Login fails"
- Check credentials in Supabase Authentication → Users
- Confirm `SB` and `KEY` values in `src/app.js` are correct

### "Extra charges don't save"
Run `sql/03_schema_update.sql` to add the `ef_extra_charges` table.

---

## Deployment

### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/edufinance.git
git push -u origin main
```
Then enable GitHub Pages in repo Settings → Pages → source: main branch.

### Netlify / Vercel
Drag and drop the project folder onto [netlify.com/drop](https://netlify.com/drop) — zero configuration needed.

---

## License

MIT — free to use and modify.
