-- Bloqueio Estrutural de Dias: Teacher Absences
CREATE TABLE IF NOT EXISTS public.teacher_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(teacher_id, absence_date)
);

ALTER TABLE public.teacher_absences ENABLE ROW LEVEL SECURITY;

-- Base RLS: Administradores e o próprio professor podem Ler a tabela crua.
CREATE POLICY "Absences view" ON public.teacher_absences 
FOR SELECT USING (teacher_id = auth.uid() OR public.is_admin() OR public.is_admin_master());

CREATE POLICY "Absences modify" ON public.teacher_absences 
FOR ALL USING (teacher_id = auth.uid() OR public.is_admin_master());

-- RPC para Alunos: Só podem ver a ausência anonimizada.
CREATE OR REPLACE FUNCTION public.get_teacher_absences_public(p_teacher_id UUID)
RETURNS TABLE (
    absence_date DATE,
    display_reason TEXT
) AS $$
DECLARE
    u_role TEXT;
BEGIN
    SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
    
    RETURN QUERY
    SELECT 
        a.absence_date,
        CASE
            WHEN u_role IN ('admin', 'admin_master') OR a.teacher_id = auth.uid() THEN a.reason
            WHEN a.reason ILIKE '%feriado%' THEN 'Feriado'
            ELSE 'Professor indisponível'
        END AS display_reason
    FROM public.teacher_absences a
    WHERE a.teacher_id = p_teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
