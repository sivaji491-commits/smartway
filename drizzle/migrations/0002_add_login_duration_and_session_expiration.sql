-- Migration: 0002_add_login_duration_and_session_expiration.sql
-- Adds login duration limit, session expiration timestamps, and account disable tracking to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_duration text NOT NULL DEFAULT '01:00:00',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  ADD COLUMN IF NOT EXISTS session_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS session_expire_time timestamptz,
  ADD COLUMN IF NOT EXISTS disable_reason text CHECK (disable_reason IS NULL OR disable_reason IN ('SESSIONTIMEEXPIRED', 'ADMIN_DISABLED')),
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_time timestamptz,
  ADD COLUMN IF NOT EXISTS re_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS re_enabled_by text;

-- Create index for high performance session expiration sweeps and status checks
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_session_expire_time ON public.profiles(session_expire_time);

-- Safe backfill for any existing rows without configured duration
UPDATE public.profiles
SET login_duration = '01:00:00'
WHERE login_duration IS NULL;

UPDATE public.profiles
SET status = 'ACTIVE'
WHERE status IS NULL;
