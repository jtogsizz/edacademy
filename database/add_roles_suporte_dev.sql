-- ============================================================
-- EdAcademy: Migração de Roles v2.2 (FINAL - Aprovado)
-- Adiciona: suporte, dev
-- Execute no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PASSO 1: Expandir a constraint de role
-- ============================================================
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'admin', 'admin_master', 'suporte', 'dev'));

-- ============================================================
-- PASSO 2: Atualizar is_any_admin()
-- "quem tem acesso ao painel admin" = admin | admin_master | suporte | dev
-- SET search_path = public reduz superfície de ataque
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'admin_master', 'suporte', 'dev')
  );
$$;

-- ============================================================
-- PASSO 3: Atualizar is_admin_master()
-- "quem tem poderes de nível master" = admin_master | dev
-- Herda permissões automaticamente sem recriar triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin_master', 'dev')
  );
$$;

-- ============================================================
-- PASSO 4: Nova função is_dev() (nível máximo exclusivo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_dev()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'dev'
  );
$$;

-- ============================================================
-- PASSO 5: Atualizar promote_user_role() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_user_role(target_user_id UUID, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
BEGIN
  -- 1. Identifica o cargo de quem chamou
  SELECT role::text INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- 2. Apenas admin_master ou dev podem promover
  IF caller_role NOT IN ('admin_master', 'dev') THEN
    RAISE EXCEPTION 'Acesso Negado: Apenas admin_master ou dev podem modificar cargos.';
  END IF;

  -- 3. Roles válidos
  IF new_role NOT IN ('student', 'admin', 'admin_master', 'suporte', 'dev') THEN
    RAISE EXCEPTION 'Cargo inválido: %', new_role;
  END IF;

  -- 4. Somente dev pode promover para dev ou admin_master
  IF new_role IN ('dev', 'admin_master') AND caller_role != 'dev' THEN
    RAISE EXCEPTION 'Acesso Negado: Apenas dev pode promover para dev ou admin_master.';
  END IF;

  -- 5. Protege conta dev: somente outro dev pode alterar um dev
  SELECT role::text INTO target_role FROM public.profiles WHERE id = target_user_id;
  IF target_role = 'dev' AND caller_role != 'dev' THEN
    RAISE EXCEPTION 'Acesso Negado: Apenas dev pode alterar a conta de outro dev.';
  END IF;

  -- 6. Bypass do safeguard_profile_columns via set_config
  PERFORM set_config('edacademy.promotion_bypass', 'true', true);

  -- 7. Executa a atualização
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;

-- ============================================================
-- PASSO 6: Policy de VIEW de profiles
--
-- Regra calibrada para proteger o app do aluno:
-- 1. Qualquer um converte seu próprio perfil
-- 2. Equipe admin/suporte/dev (is_any_admin) vê tudo
-- 3. ALUNOS VÊEM PROFESSORES (admin, admin_master) para não
--    quebrar o agendamento, o chat e os joins de FK.
--    O que fica OCULTO para os alunos: 'suporte' e 'dev'.
-- ============================================================
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy" ON public.profiles 
FOR SELECT USING (
  auth.uid() = id 
  OR public.is_any_admin() 
  OR role IN ('admin', 'admin_master')
);

-- ============================================================
-- PASSO 7: Policy de VIEW de recurring_classes para suporte
-- ============================================================
DROP POLICY IF EXISTS "Recurring Classes view" ON public.recurring_classes;
CREATE POLICY "Recurring Classes view" ON public.recurring_classes 
FOR SELECT USING (
  student_id = auth.uid() 
  OR teacher_id = auth.uid() 
  OR public.is_admin_master()
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'suporte'
);
