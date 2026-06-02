# EduFinance Setup Guide

## Prerequisites

- A Supabase account (free tier works fine): [supabase.com](https://supabase.com)
- A modern web browser (Chrome, Firefox, Edge, Safari)
- No Node.js, no build tools required

---

## Step-by-Step Setup

### Step 1 — Create Supabase project

1. Sign up at [supabase.com](https://supabase.com)
2. Click **New project**
3. Choose a name (e.g. `edufinance-school`), region, and strong database password
4. Wait ~2 minutes for the project to provision

### Step 2 — Run the schema

1. In your Supabase project, click **SQL Editor** in the left menu
2. Click **New query**
3. Open `sql/01_schema.sql` from this project
4. Paste the entire contents and click **Run**
5. You should see: `EduFinance schema installed successfully`

### Step 3 — Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
3. Copy the **anon public** key (a long JWT token)

### Step 4 — Configure the app

Open `src/app.js` in a text editor. Find lines 6–7:

```js
const SB  = 'https://zlaplsbmoxtxijgnmgcq.supabase.co';  // ← replace
const KEY = 'eyJhbGciO...';                                // ← replace
```

Replace both values with your own from Step 3.

### Step 5 — Create your admin user

1. In Supabase, go to **Authentication → Users**
2. Click **Invite user** and enter your email
3. Check your email and set a password
4. **Or:** use **Add user → Create new user** and set a password directly

### Step 6 — Open the app

Open `index.html` directly in your browser, or serve it locally:

```bash
# Using Python (built-in)
cd /path/to/edufinance
python3 -m http.server 8080
# Open: http://localhost:8080

# Using Node.js (if installed)
npx serve .
# Open: http://localhost:3000
```

### Step 7 — Initial school setup

1. Log in with your admin credentials
2. Go to **Settings** → Enter your school name, M-Pesa paybill, and account prefix
3. Upload your school logo
4. Go to **Students → Grades & Streams** → Add your grades and streams
5. Go to **Fee Setup** → Create your first academic term
6. Click the term → Set fees per grade
7. You're ready!

---

## Adding More Users

In **Settings → System users → Add user**:
- Enter their email and a temporary password
- Assign a role (Admin / Bursar / Viewer)
- They can log in immediately — no backend needed

---

## M-Pesa Integration Notes

The system currently supports **manual M-Pesa recording** (entering transaction codes).

For **automated STK push** (real-time M-Pesa confirmation):
- You need a Safaricom Daraja API account
- Set up a callback URL that posts to Supabase via an Edge Function
- The `ef_payments` table is already structured to receive automated payments

Contact a developer to set up the Daraja integration if needed.

---

## Backup

To back up your data:
1. In Supabase, go to **Settings → Database → Backups**
2. Or use the Reports tab → Export CSV for fee data
