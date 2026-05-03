-- ============================================================
-- EdAcademy: Sistema de Eventos
-- ============================================================

-- 1. Tabela de Eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_participants INTEGER DEFAULT 10
    CHECK (max_participants >= 5 AND max_participants <= 20),
  status TEXT CHECK (status IN ('scheduled', 'cancelled')) DEFAULT 'scheduled',
  cancellation_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Tabela de Participantes do Evento
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, student_id)
);

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_events_start_time 
  ON public.events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_status 
  ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id 
  ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_student_id 
  ON public.event_participants(student_id);

-- 4. RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Eventos: autenticados veem eventos agendados
DROP POLICY IF EXISTS "Events visible to authenticated" ON public.events;
CREATE POLICY "Events visible to authenticated" ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Eventos: apenas staff pode criar/editar/excluir
DROP POLICY IF EXISTS "Events managed by staff" ON public.events;
CREATE POLICY "Events managed by staff" ON public.events
  FOR ALL USING (public.is_any_admin());

-- Participantes: cada um vê os próprios; staff vê todos
DROP POLICY IF EXISTS "Event participants select" ON public.event_participants;
CREATE POLICY "Event participants select" ON public.event_participants
  FOR SELECT USING (student_id = auth.uid() OR public.is_any_admin());

-- Participantes: alunos só podem inserir a si mesmos
DROP POLICY IF EXISTS "Event participants insert" ON public.event_participants;
CREATE POLICY "Event participants insert" ON public.event_participants
  FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_any_admin());

-- Participantes: alunos podem sair (delete próprio)
DROP POLICY IF EXISTS "Event participants delete" ON public.event_participants;
CREATE POLICY "Event participants delete" ON public.event_participants
  FOR DELETE USING (student_id = auth.uid() OR public.is_any_admin());

-- ============================================================
-- 5. RPC: get_feed_events — retorna eventos com dados seguros
-- ============================================================
DROP FUNCTION IF EXISTS public.get_feed_events();

CREATE OR REPLACE FUNCTION public.get_feed_events()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'start_time', e.start_time,
        'end_time', e.end_time,
        'max_participants', e.max_participants,
        'status', e.status,
        'created_at', e.created_at,
        'teacher', json_build_object(
          'id', t.id,
          'full_name', t.full_name,
          'avatar_url', t.avatar_url
        ),
        'participant_count', (
          SELECT COUNT(*)::int
          FROM public.event_participants ep
          WHERE ep.event_id = e.id
        ),
        'is_participating', (
          SELECT EXISTS(
            SELECT 1 FROM public.event_participants ep
            WHERE ep.event_id = e.id AND ep.student_id = auth.uid()
          )
        )
      ) ORDER BY e.created_at DESC
    )
    FROM public.events e
    JOIN public.profiles t ON e.teacher_id = t.id
    WHERE e.status = 'scheduled'
      AND e.start_time > now() - interval '2 hours'
  ), '[]'::json);
END;
$$;

ALTER FUNCTION public.get_feed_events() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_feed_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_events() TO authenticated;
