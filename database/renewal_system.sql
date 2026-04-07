-- SAFE MIGRATION: Subscription Renewal System
-- Add columns and update schema without dropping the table

-- 1. Add new columns safely IF NOT EXISTS
ALTER TABLE public.subscription_renewals ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscription_renewals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscription_renewals ADD COLUMN IF NOT EXISTS response_text TEXT;
ALTER TABLE public.subscription_renewals ADD COLUMN IF NOT EXISTS response_from TEXT;
ALTER TABLE public.subscription_renewals ADD COLUMN IF NOT EXISTS send_error TEXT;

-- 2. Update Status constraints safely
-- Drop old constraint likely named 'subscription_renewals_status_check' or generic names
ALTER TABLE public.subscription_renewals DROP CONSTRAINT IF EXISTS subscription_renewals_status_check;

-- Standardize existing statuses to match the new set
UPDATE public.subscription_renewals SET status = 'sent' WHERE status = 'notified';
UPDATE public.subscription_renewals SET status = 'inactive' WHERE status = 'canceled' OR status = 'canceled_not_paid';

-- Apply the new constraint
ALTER TABLE public.subscription_renewals ADD CONSTRAINT subscription_renewals_status_check 
  CHECK (status IN ('pending', 'sent', 'paid', 'inactive', 'failed'));

-- 3. Create Indexes IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_renewal_short_code ON public.subscription_renewals(short_code);
CREATE INDEX IF NOT EXISTS idx_renewal_sub_status ON public.subscription_renewals(subscription_id, status);

-- 4. RLS & Policies (Ensuring they exist)
ALTER TABLE public.subscription_renewals ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin view renewals' AND tablename = 'subscription_renewals') THEN
        CREATE POLICY "Admin view renewals" ON public.subscription_renewals
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master')
            )
        );
    END IF;
END $$;
