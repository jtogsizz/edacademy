-- EdAcademy: Blindagem de Segurança para Produção
-- Este script corrige todas as vulnerabilidades críticas e unifica as roles de admin.

-- 1. Unificar Checagem de Administrador
CREATE OR REPLACE FUNCTION public.is_any_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Blindagem da Tabela 'profiles' (Impedir auto-promoção)
-- Remover políticas antigas de update
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles; -- redundante se houver variações

-- Nova política: Aluno ou Admin pode atualizar dados comuns (telefone, avatar), 
-- mas NUNCA o próprio 'role', a menos que seja um Admin Master.
CREATE POLICY "Profiles self update common fields" ON public.profiles 
FOR UPDATE USING (auth.uid() = id) 
WITH CHECK (
  auth.uid() = id AND 
  (
    -- Se o cara já é admin_master, ele pode trocar roles (inclusive o dele)
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_master'
    OR
    -- Senão, a nova role DEVE ser igual à antiga (não mudou)
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  )
);

-- 3. Unificar RLS das Tabelas Principais (Substituir is_admin por is_any_admin)
-- Subscriptions
DROP POLICY IF EXISTS "Subscriptions view policy" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions admin modify" ON public.subscriptions;
CREATE POLICY "Subscriptions view policy" ON public.subscriptions 
FOR SELECT USING (student_id = auth.uid() OR public.is_any_admin());
CREATE POLICY "Subscriptions admin modify" ON public.subscriptions 
FOR ALL USING (public.is_any_admin());

-- Appointments (Adicionar Verificação de Assinatura ATIVA no Insert)
DROP POLICY IF EXISTS "Appointments view" ON public.appointments;
DROP POLICY IF EXISTS "Appointments insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments update" ON public.appointments;
DROP POLICY IF EXISTS "Appointments delete" ON public.appointments;

CREATE POLICY "Appointments view" ON public.appointments 
FOR SELECT USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin());

CREATE POLICY "Appointments insert" ON public.appointments 
FOR INSERT WITH CHECK (
  (student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.subscriptions WHERE student_id = auth.uid() AND status = 'active'))
  OR 
  teacher_id = auth.uid() 
  OR 
  public.is_any_admin()
);

CREATE POLICY "Appointments delete" ON public.appointments 
FOR DELETE USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin());

CREATE POLICY "Appointments update" ON public.appointments 
FOR UPDATE USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin());

-- 4. Corrigir RLS do Storage para Bucket de Posts
-- (Apenas Administradores podem fazer upload no feed)
DROP POLICY IF EXISTS "Admins can upload posts" ON storage.objects;
CREATE POLICY "Admins can upload posts" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'posts' AND public.is_any_admin() );

-- 5. Corrigir RLS para Histórico de Assinaturas (Unificar)
DROP POLICY IF EXISTS "Admins can view logs" ON public.subscription_change_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.subscription_change_logs;
CREATE POLICY "Admins can view logs" ON public.subscription_change_logs 
FOR SELECT USING (public.is_any_admin());
CREATE POLICY "Admins can insert logs" ON public.subscription_change_logs 
FOR INSERT WITH CHECK (public.is_any_admin());

-- 6. Garantir que as tabelas acessórias também aceitam admin_master
DROP POLICY IF EXISTS "Settings modify" ON public.settings;
CREATE POLICY "Settings modify" ON public.settings FOR ALL USING (public.is_any_admin());
