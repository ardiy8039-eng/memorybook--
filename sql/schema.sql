-- ============================================================
-- Anniversary Book — Database Schema
-- Run this entire file in the Supabase SQL editor.
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ── 1. Hosts table ────────────────────────────────────────────────────────────
-- Stores host (admin) accounts. Each host has a unique PIN.

CREATE TABLE IF NOT EXISTS public.hosts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  pin        text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hosts_pin_unique ON public.hosts (pin);


-- ── 2. Books table (guests) ───────────────────────────────────────────────────
-- Each row represents one guest/customer with a personal PIN and message.

CREATE TABLE IF NOT EXISTS public.books (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  message    text,
  pin        text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS books_pin_unique ON public.books (pin);


-- ── 3. Media table ────────────────────────────────────────────────────────────
-- Stores metadata for uploaded files. The actual files live in Supabase Storage.

CREATE TABLE IF NOT EXISTS public.media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  path        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('image', 'video')),
  uploaded_at timestamptz DEFAULT now()
);


-- ── 4. Quiz table ─────────────────────────────────────────────────────────────
-- Stores a single quiz record (id = 1 always). Uses upsert on save.

CREATE TABLE IF NOT EXISTS public.quiz (
  id         bigint PRIMARY KEY,
  question   text NOT NULL,
  answers    text[] NOT NULL,
  updated_at timestamptz DEFAULT now()
);


-- ── RLS: Row Level Security ────────────────────────────────────────────────────
-- NOTE: These are intentionally open policies for the anon role since this app
-- uses PIN-based auth rather than Supabase Auth. In a production multi-tenant
-- environment you would tighten these with JWT claims.

ALTER TABLE public.hosts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz   ENABLE ROW LEVEL SECURITY;

-- Allow anon to SELECT hosts (needed for PIN login check)
DROP POLICY IF EXISTS "anon_select_hosts" ON public.hosts;
CREATE POLICY "anon_select_hosts" ON public.hosts
  FOR SELECT TO anon USING (true);

-- Allow anon full access to books (guest management via host dashboard)
DROP POLICY IF EXISTS "anon_all_books" ON public.books;
CREATE POLICY "anon_all_books" ON public.books
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anon full access to media
DROP POLICY IF EXISTS "anon_all_media" ON public.media;
CREATE POLICY "anon_all_media" ON public.media
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anon full access to quiz
DROP POLICY IF EXISTS "anon_all_quiz" ON public.quiz;
CREATE POLICY "anon_all_quiz" ON public.quiz
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- ── Storage bucket ────────────────────────────────────────────────────────────
-- If the bucket doesn't exist, create it. Run manually if needed.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('anniversary-media', 'anniversary-media', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for anon role:
-- Allow anon to upload to anniversary-media
-- (Run in Supabase dashboard → Storage → Policies if needed)
-- CREATE POLICY "anon upload" ON storage.objects
--   FOR INSERT TO anon WITH CHECK (bucket_id = 'anniversary-media');
-- CREATE POLICY "anon select" ON storage.objects
--   FOR SELECT TO anon USING (bucket_id = 'anniversary-media');
-- CREATE POLICY "anon delete" ON storage.objects
--   FOR DELETE TO anon USING (bucket_id = 'anniversary-media');


-- ── Seed: default host ────────────────────────────────────────────────────────
-- Insert a default host. Change the PIN before going live.
-- INSERT INTO public.hosts (name, pin)
-- VALUES ('Host Name', '0000')
-- ON CONFLICT DO NOTHING;
