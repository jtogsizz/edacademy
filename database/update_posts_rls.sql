-- ============================================================
-- EdAcademy: Fix Posts RLS para Roles Dev/Suporte
-- ============================================================

-- Remover as políticas antigas baseadas apenas em is_admin()
DROP POLICY IF EXISTS "Posts insert" ON public.posts;
DROP POLICY IF EXISTS "Posts update/delete" ON public.posts;

-- Recriar as políticas usando is_any_admin() (que engloba admin, admin_master, suporte e dev)
-- 1. Criação de posts
CREATE POLICY "Posts insert" ON public.posts 
FOR INSERT WITH CHECK (public.is_any_admin());

-- 2. Edição/Exclusão de posts
-- Essa política engloba UPDATE e DELETE. Permite que o staff (is_any_admin)
-- modifique posts (a Server Action garante que só o próprio autor edite/exclua seu post
-- através de checagem user_id = auth.uid() no backend se for admin comum, 
-- e a RLS a nível de banco continua bloqueando alunos).
CREATE POLICY "Posts update/delete" ON public.posts 
FOR ALL USING (public.is_any_admin());

-- Nota: public.is_any_admin() já está protegida na base e retorna TRUE apenas
-- para 'admin', 'admin_master', 'suporte' e 'dev'. Alunos continuam barrados pelo banco.
