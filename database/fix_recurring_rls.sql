-- Permite que todos os usuários leiam os horários fixos para a montagem da grade ocupada.
-- Note que appointments já estava restrito e não aparece no plano grid.

DROP POLICY IF EXISTS "Recurring Classes view" ON public.recurring_classes;
CREATE POLICY "Recurring Classes view" ON public.recurring_classes FOR SELECT USING (true);
