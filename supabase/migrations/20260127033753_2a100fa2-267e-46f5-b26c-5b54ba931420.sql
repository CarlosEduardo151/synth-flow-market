-- Email 2FA (OTP) tables

-- 1) User MFA settings (optional per user)
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  method text NOT NULL DEFAULT 'email',
  trusted_device_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON public.user_mfa_settings(user_id);

-- 2) OTP codes (hashed)
CREATE TABLE IF NOT EXISTS public.mfa_email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_email_otps_user_id_created_at ON public.mfa_email_otps(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_email_otps_user_id_expires_at ON public.mfa_email_otps(user_id, expires_at);

-- 3) Trusted devices
CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfa_trusted_devices_user_fingerprint ON public.mfa_trusted_devices(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user_expires ON public.mfa_trusted_devices(user_id, expires_at);

-- RLS
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Policies: admins full access
DO $$ BEGIN
  CREATE POLICY "Admins can manage user_mfa_settings" ON public.user_mfa_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage mfa_email_otps" ON public.mfa_email_otps
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage mfa_trusted_devices" ON public.mfa_trusted_devices
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies: users manage own settings
DO $$ BEGIN
  CREATE POLICY "Users can manage own user_mfa_settings" ON public.user_mfa_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OTPs: users can insert/select own (server + client), but cannot update/delete
DO $$ BEGIN
  CREATE POLICY "Users can insert own mfa_email_otps" ON public.mfa_email_otps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can select own mfa_email_otps" ON public.mfa_email_otps
  FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trusted devices: users can manage own
DO $$ BEGIN
  CREATE POLICY "Users can manage own mfa_trusted_devices" ON public.mfa_trusted_devices
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger function exists: public.update_updated_at_column
DO $$ BEGIN
  CREATE TRIGGER update_user_mfa_settings_updated_at
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
