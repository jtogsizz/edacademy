-- ============================================================
-- EdAcademy: Atualização de RLS para Chat (Profiles)
-- Alunos precisam conseguir ver 'suporte' e 'dev' para iniciar chat.
-- Porém continuam sem ver outros alunos.
-- Execute no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;

CREATE POLICY "Profiles view policy" ON public.profiles 
FOR SELECT USING (
  auth.uid() = id 
  OR public.is_any_admin() 
  OR role IN ('admin', 'admin_master', 'suporte', 'dev')
);
