-- SQL Migration to support Google Login Strict Whitelist and Timezone Tracking
-- Execute this file in your Supabase SQL Editor

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;

-- 2. Backfill existing profiles with their matching email from auth.users
-- This is CRITICAL for not locking out existing users
UPDATE public.profiles p
SET email = u.email, is_active = true
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.is_active IS NULL);

-- 3. Update handle_new_user trigger to include email for future registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles the new email dynamically, defaulting to inactive
  INSERT INTO public.profiles (id, full_name, role, email, is_active)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student', new.email, false);

  -- Create an inactive subscription for the new student
  INSERT INTO public.subscriptions (student_id, status)
  VALUES (new.id, 'inactive');

  RETURN NEW;
END;
$$;
