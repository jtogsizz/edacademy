-- Corrige o bug no RLS de UPDATE de appointments.
-- O WITH CHECK anterior tinha `id = id` (autorreferencial) que sempre retorna true.
-- A condição correta usa `appointments.id` referenciando a linha sendo atualizada.

DROP POLICY IF EXISTS "Appointments update" ON public.appointments;

CREATE POLICY "Appointments update" ON public.appointments
FOR UPDATE
USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_any_admin())
WITH CHECK (
  public.is_any_admin()
  OR (
    student_id = auth.uid()
    AND teacher_id = (SELECT teacher_id FROM public.appointments WHERE appointments.id = id LIMIT 1)
  )
  OR (
    teacher_id = auth.uid()
    AND student_id = (SELECT student_id FROM public.appointments WHERE appointments.id = id LIMIT 1)
  )
);
