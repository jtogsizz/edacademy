-- Database Patch: Zero-Trust Security in Recurring Classes view
-- 1. Restabelecer o bloqueio de RLS natural bloqueando a visualização direta
DROP POLICY IF EXISTS "Recurring Classes view" ON public.recurring_classes;

CREATE POLICY "Recurring Classes view" ON public.recurring_classes 
FOR SELECT USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());

-- 2. Criar RPC Segura para o Frontend (Anonimiza o RLS e extrai só booleanos)
CREATE OR REPLACE FUNCTION public.get_teacher_recurring_status(p_teacher_id UUID)
RETURNS TABLE (
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    is_my_class BOOLEAN,
    is_occupied_by_other BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.day_of_week,
        r.start_time,
        r.end_time,
        (r.student_id = auth.uid()) AS is_my_class,
        (r.student_id != auth.uid()) AS is_occupied_by_other
    FROM public.recurring_classes r
    WHERE r.teacher_id = p_teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
