-- ============================================================
-- EdAcademy: Eventos Públicos para Captação (Fase 1 - CORREÇÕES)
-- ============================================================

-- 1. Tabela events: adicionar is_public
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Tabela event_participants: garantir unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_participants_event_id_student_id_key'
    ) THEN
        ALTER TABLE public.event_participants 
        ADD CONSTRAINT event_participants_event_id_student_id_key UNIQUE(event_id, student_id);
    END IF;
END $$;

-- 3. RLS: Permitir leitura de eventos públicos para todos (anon/authenticated)
DROP POLICY IF EXISTS "Public events visible to all" ON public.events;
CREATE POLICY "Public events visible to all" ON public.events
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

-- 4. RPC: join_public_event
-- Inscrição atômica com validação de vagas e LOCK de linha (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.join_public_event(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_participants INTEGER;
    v_current_participants INTEGER;
    v_is_public BOOLEAN;
    v_status TEXT;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- 1. Verifica se usuário está logado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Você precisa estar logado para participar.';
    END IF;

    -- 2. Busca dados do evento com LOCK (FOR UPDATE) para evitar race conditions no preenchimento de vagas
    SELECT max_participants, is_public, status, end_time 
    INTO v_max_participants, v_is_public, v_status, v_end_time
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evento não encontrado.';
    END IF;

    -- 3. Validações de Status e Tempo
    IF v_status != 'scheduled' THEN
        RAISE EXCEPTION 'Este evento não está mais disponível para novas inscrições.';
    END IF;

    IF v_end_time < now() THEN
        RAISE EXCEPTION 'Este evento já foi finalizado.';
    END IF;

    -- 4. Verifica se o evento é público (leads inativos só entram em públicos)
    IF NOT v_is_public THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_active = true
        ) THEN
            RAISE EXCEPTION 'Este evento é exclusivo para alunos ativos.';
        END IF;
    END IF;

    -- 5. Conta participantes atuais (Sob o lock da linha do evento na tabela 'events')
    SELECT COUNT(*) INTO v_current_participants
    FROM public.event_participants
    WHERE event_id = p_event_id;

    -- 6. Valida vagas
    IF v_current_participants >= v_max_participants THEN
        RAISE EXCEPTION 'Desculpe, este evento já atingiu o limite de vagas.';
    END IF;

    -- 7. Insere participação (UNIQUE constraint evitará duplicidade se o usuário tentar burlar)
    INSERT INTO public.event_participants (event_id, student_id)
    VALUES (p_event_id, auth.uid());

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Você já está inscrito neste evento.';
END;
$$;

-- 5. RPC: get_public_events
-- Retorna eventos públicos com lógica de proteção do meet_url otimizada
CREATE OR REPLACE FUNCTION public.get_public_events()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        'is_public', e.is_public,
        'meet_url', CASE 
          -- Regra: Apenas usuários logados podem ver links (evita chamar is_any_admin para anon)
          WHEN auth.uid() IS NOT NULL AND (
            -- Caso 1: Usuário é Admin/Staff
            public.is_any_admin()
            OR 
            -- Caso 2: Usuário inscrito + janela de 15 min antes/durante
            (
              EXISTS(
                SELECT 1 FROM public.event_participants ep 
                WHERE ep.event_id = e.id AND ep.student_id = auth.uid()
              ) AND (e.start_time <= now() + interval '15 minutes' AND e.end_time >= now())
            )
          )
          THEN e.meet_url 
          ELSE NULL 
        END,
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
      ) ORDER BY e.start_time ASC
    )
    FROM public.events e
    JOIN public.profiles t ON e.teacher_id = t.id
    WHERE e.is_public = true 
      AND e.status = 'scheduled'
      AND e.end_time > now()
  ), '[]'::json);
END;
$$;

-- 6. Gestão de Permissões
-- Remove acesso público (PUBLIC) antes de conceder aos papéis específicos
REVOKE ALL ON FUNCTION public.join_public_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_events() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.join_public_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_events() TO anon, authenticated;
