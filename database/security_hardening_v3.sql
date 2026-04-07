-- EdAcademy: Blindagem Final de Produção (Versão 3.0 - Consolidado)

-- 1. Função Unificada de Administrador
CREATE OR REPLACE FUNCTION public.is_any_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1.1 Helper para Admin Master
CREATE OR REPLACE FUNCTION public.is_admin_master() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin_master'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Blindagem de Profiles (Role e Créditos)
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update common fields" ON public.profiles;

CREATE POLICY "Profiles view policy" ON public.profiles 
FOR SELECT USING (auth.uid() = id OR public.is_any_admin() OR role IN ('admin', 'admin_master'));

CREATE POLICY "Profiles self update common fields" ON public.profiles 
FOR UPDATE USING (auth.uid() = id) 
WITH CHECK (
  auth.uid() = id AND 
  (
    public.is_admin_master()
    OR
    (
      role = (SELECT role FROM public.profiles WHERE id = id) 
      AND 
      replacement_credits = (SELECT replacement_credits FROM public.profiles WHERE id = id)
    )
  )
);

-- 3. Appointments (Update Integrity & Sub Check)
DROP POLICY IF EXISTS "Appointments view" ON public.appointments;
DROP POLICY IF EXISTS "Appointments insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments update" ON public.appointments;
DROP POLICY IF EXISTS "Appointments delete" ON public.appointments;

CREATE POLICY "Appointments view" ON public.appointments 
FOR SELECT USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin());

CREATE POLICY "Appointments insert" ON public.appointments FOR INSERT 
WITH CHECK (
  (student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.subscriptions WHERE student_id = auth.uid() AND status = 'active'))
  OR teacher_id = auth.uid() OR public.is_any_admin()
);

CREATE POLICY "Appointments update" ON public.appointments FOR UPDATE 
USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin())
WITH CHECK (
  public.is_any_admin()
  OR
  (
    student_id = (SELECT student_id FROM public.appointments WHERE id = id)
    AND
    teacher_id = (SELECT teacher_id FROM public.appointments WHERE id = id)
  )
);

CREATE POLICY "Appointments delete" ON public.appointments FOR DELETE 
USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin());

-- 4. Subscriptions & Settings (WITH CHECK fix)
DROP POLICY IF EXISTS "Subscriptions view policy" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions admin modify" ON public.subscriptions;
CREATE POLICY "Subscriptions view policy" ON public.subscriptions 
FOR SELECT USING (student_id = auth.uid() OR public.is_any_admin());
CREATE POLICY "Subscriptions admin modify" ON public.subscriptions 
FOR ALL USING (public.is_any_admin()) WITH CHECK (public.is_any_admin());

DROP POLICY IF EXISTS "Settings modify" ON public.settings;
CREATE POLICY "Settings modify" ON public.settings FOR ALL USING (public.is_any_admin()) WITH CHECK (public.is_any_admin());

-- 5. Storage: Posts e Avatares
-- Bucket 'posts'
DROP POLICY IF EXISTS "Admins can upload posts" ON storage.objects;
CREATE POLICY "Admins can upload posts" ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'posts' AND public.is_any_admin() );

-- Bucket 'avatars'
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]) );

CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE 
USING ( bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]) );

CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE 
USING ( bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]) );
