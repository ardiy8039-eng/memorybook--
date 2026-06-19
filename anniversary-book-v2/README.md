# Anniversary Book

A private, PIN-based digital memory book — delivered as a beautiful dark-themed web app. Deployable on Netlify with Supabase as the backend in minutes.

---

## What it is

- **Hosts** log in with a host PIN → access the dashboard to manage guests, upload media, and configure the quiz.
- **Guests** log in with their individual PIN → view a personalized flip-book with messages, gallery, and quiz.

---

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| Backend  | Supabase (PostgreSQL + Storage) |
| Hosting  | Netlify |

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run `sql/schema.sql` in full.
3. Go to **Storage** → create a bucket named `anniversary-media` (private).
4. Add storage policies for the `anon` role (see commented section in `schema.sql`).
5. Uncomment the seed SQL at the bottom of `schema.sql` and insert your host record.

### 2. Config

Edit `js/config.js` and set:

```js
SUPABASE_URL:      'https://your-project.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-key',
```

### 3. Deploy to Netlify

- Connect your GitHub repo to Netlify, or drag-and-drop this folder.
- No build command needed — publish directory is `.` (root).

---

## Project structure

```
/
├── index.html          # Login page (PIN entry)
├── dashboard.html      # Host dashboard
├── book.html           # Guest flip-book experience
├── css/
│   ├── style.css       # Global tokens, reset, shared components
│   ├── dashboard.css   # Dashboard-specific layout
│   └── book.css        # Book experience layout
├── js/
│   ├── config.js       # Environment constants (edit this)
│   ├── db.js           # Supabase client + all DB helpers + session
│   ├── login.js        # Login page controller
│   ├── dashboard.js    # Dashboard controller (guests, gallery, quiz)
│   └── book.js         # Guest book controller
├── sql/
│   └── schema.sql      # Full database schema + RLS policies
└── netlify.toml        # Netlify headers, redirects, publish dir
```

---

## Authentication model

This app uses **session-based PIN auth** (not Supabase Auth):

1. User enters PIN on `index.html`.
2. App queries `hosts` table first. Match → host session → `dashboard.html`.
3. If no host match, queries `books` table. Match → guest session → `book.html`.
4. Every protected page re-validates the session ID against the database on load.
5. Session data is stored in `sessionStorage` (cleared when tab closes).

---

## Customization

- **Couple name / event name**: Edit the `<h2>` in `book.html` hero section.
- **Brand mark initials**: Change `AB` in `dashboard.html` `.brand-mark`.
- **Colors**: All tokens are in `:root` in `css/style.css`.
- **Quiz defaults**: Edit `CONFIG.DEFAULT_QUIZ` in `js/config.js`.

---

## Security notes

- The Supabase anon key is public by design (it's safe to expose in client-side code).
- RLS policies are set to allow anon access — appropriate for a PIN-based private app.
- For a multi-tenant SaaS version, tighten RLS with proper JWT claims and tenant isolation.
- PINs are stored as plain text. For higher security, hash them with `pgcrypto`.
