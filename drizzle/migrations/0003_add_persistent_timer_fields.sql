-- Migration: 0003_add_persistent_timer_fields.sql
-- Adds persistent timer tracking, assigned_duration, started_at, expires_at, and timer_status to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_duration text NOT NULL DEFAULT '01:00:00',
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS timer_status text NOT NULL DEFAULT 'active' CHECK (timer_status IN ('active', 'paused', 'expired')),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS remaining_time_seconds integer;

-- Backfill existing profiles
UPDATE public.profiles
SET 
  started_at = COALESCE(started_at, session_start_time),
  expires_at = COALESCE(expires_at, session_expire_time),
  assigned_duration = COALESCE(assigned_duration, login_duration, '01:00:00'),
  timer_status = CASE 
    WHEN status = 'DISABLED' AND disable_reason = 'SESSIONTIMEEXPIRED' THEN 'expired'
    WHEN session_expire_time IS NOT NULL AND session_expire_time <= now() THEN 'expired'
    ELSE 'active'
  END;

CREATE INDEX IF NOT EXISTS idx_profiles_expires_at ON public.profiles(expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_timer_status ON public.profiles(timer_status);
