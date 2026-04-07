-- database/enhancements_final.sql
-- 1. Novos campos de perfil para redes sociais
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- 2. Tabela de Histórico de Alterações de Assinatura
CREATE TABLE IF NOT EXISTS public.subscription_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id),
  old_status TEXT,
  new_status TEXT,
  old_end_date DATE,
  new_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS no Histórico
ALTER TABLE public.subscription_change_logs ENABLE ROW LEVEL SECURITY;

-- 4. Somente Admins e Admin Master podem ver o histórico
CREATE POLICY "Admins can view logs" ON public.subscription_change_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master')
    )
  );

-- 5. Somente Administradores podem inserir no histórico (via Server Actions)
CREATE POLICY "Admins can insert logs" ON public.subscription_change_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master')
    )
  );
