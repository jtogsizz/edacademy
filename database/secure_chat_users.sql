-- ============================================================
-- EdAcademy: Segurança Máxima de Perfis, Chat e Feed
-- ============================================================

-- 1. BLINDAGEM TOTAL DA TABELA PROFILES
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;

CREATE POLICY "Profiles view policy" ON public.profiles 
FOR SELECT USING (
  auth.uid() = id 
  OR public.is_any_admin() 
);

-- ============================================================
-- 2. ÍNDICES DE PERFORMANCE (Crucial para o Chat e Feed escalarem)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created 
  ON public.messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created 
  ON public.messages(receiver_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc 
  ON public.posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created 
  ON public.post_comments(post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
  ON public.post_likes(post_id);


-- ============================================================
-- 3. RPC DO FEED (Bypass Seguro - Apenas Colunas Públicas)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_feed_posts;

CREATE OR REPLACE FUNCTION public.get_feed_posts()
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
        'id', post.id,
        'content', post.content,
        'image_url', post.image_url,
        'created_at', post.created_at,
        'user_id', post.user_id,
        'profiles', json_build_object(
          'full_name', author.full_name,
          'avatar_url', author.avatar_url,
          'role', author.role
        ),
        'post_likes', COALESCE((
          SELECT json_agg(json_build_object('user_id', l.user_id))
          FROM public.post_likes l WHERE l.post_id = post.id
        ), '[]'::json),
        'post_comments', COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'content', c.content,
              'created_at', c.created_at,
              'user_id', c.user_id,
              'profiles', json_build_object(
                'full_name', c_author.full_name,
                'avatar_url', c_author.avatar_url
              )
            ) ORDER BY c.created_at ASC
          )
          FROM public.post_comments c
          JOIN public.profiles c_author ON c.user_id = c_author.id
          WHERE c.post_id = post.id
        ), '[]'::json),
        'event', CASE WHEN post.event_id IS NOT NULL THEN (
          SELECT json_build_object(
            'id', e.id,
            'title', e.title,
            'description', e.description,
            'start_time', e.start_time,
            'end_time', e.end_time,
            'max_participants', e.max_participants,
            'status', e.status,
            'teacher', json_build_object(
              'id', t.id,
              'full_name', t.full_name,
              'avatar_url', t.avatar_url
            ),
            'participant_count', (SELECT count(*)::int FROM public.event_participants ep WHERE ep.event_id = e.id),
            'is_participating', (EXISTS(SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.student_id = auth.uid())),
            'meet_url', (
              CASE 
                WHEN (
                  public.is_any_admin() OR (
                    EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.student_id = auth.uid())
                    AND e.start_time <= (now() + interval '15 minutes')
                    AND e.end_time > now()
                  )
                ) THEN e.meet_url
                ELSE NULL
              END
            )
          )
          FROM public.events e
          JOIN public.profiles t ON e.teacher_id = t.id
          WHERE e.id = post.event_id
        ) ELSE NULL END
      ) ORDER BY post.created_at DESC
    )
    FROM public.posts post
    JOIN public.profiles author ON post.user_id = author.id
  ), '[]'::json);
END;
$$;

ALTER FUNCTION public.get_feed_posts() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_feed_posts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_posts() TO authenticated;


-- ============================================================
-- 4. RPC DO CHAT SIDEBAR (Listagem Inteligente)
-- ============================================================
DROP FUNCTION IF EXISTS public.search_chat_users;

CREATE OR REPLACE FUNCTION public.search_chat_users(search_term text DEFAULT '')
RETURNS TABLE(
  id uuid, full_name text, avatar_url text, role text, language text,
  last_message text, last_message_time timestamptz
)
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();

  IF trim(search_term) = '' THEN
    RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.role::text, p.language, m.content, m.created_at
    FROM public.profiles p
    JOIN LATERAL (
      SELECT content, created_at FROM public.messages msg
      WHERE (msg.sender_id = auth.uid() AND msg.receiver_id = p.id) OR (msg.sender_id = p.id AND msg.receiver_id = auth.uid())
      ORDER BY msg.created_at DESC LIMIT 1
    ) m ON true
    WHERE p.id != auth.uid()
      AND (caller_role != 'student' OR p.role IN ('admin', 'admin_master', 'suporte', 'dev'))
    ORDER BY m.created_at DESC LIMIT 50;
  ELSE
    RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.role::text, p.language, m.content, m.created_at
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT content, created_at FROM public.messages msg
      WHERE (msg.sender_id = auth.uid() AND msg.receiver_id = p.id) OR (msg.sender_id = p.id AND msg.receiver_id = auth.uid())
      ORDER BY msg.created_at DESC LIMIT 1
    ) m ON true
    WHERE p.full_name ILIKE '%' || search_term || '%'
      AND p.id != auth.uid()
      AND (caller_role != 'student' OR p.role IN ('admin', 'admin_master', 'suporte', 'dev'))
    ORDER BY p.full_name LIMIT 50;
  END IF;
END;
$$;

ALTER FUNCTION public.search_chat_users(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.search_chat_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_chat_users(text) TO authenticated;


-- ============================================================
-- 5. RPC DO PERFIL PÚBLICO (MODAL CENTRAL)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_user_profile;

CREATE OR REPLACE FUNCTION public.get_user_profile(target_id uuid)
RETURNS TABLE(
  id uuid, full_name text, role text, avatar_url text, language text, 
  student_language text, whatsapp_number text, instagram_handle text
)
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
  caller_role text;
  is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();
  is_staff := caller_role IN ('admin', 'admin_master', 'suporte', 'dev');

  IF is_staff OR auth.uid() = target_id THEN
    RETURN QUERY SELECT p.id, p.full_name, p.role::text, p.avatar_url, p.language, p.student_language, p.whatsapp_number, p.instagram_handle
    FROM public.profiles p WHERE p.id = target_id;
  ELSE
    -- ALUNO chamando: Forçamos NULL nas colunas privadas.
    RETURN QUERY SELECT 
      p.id, p.full_name, p.role::text, p.avatar_url, p.language, p.student_language, 
      NULL::text, NULL::text
    FROM public.profiles p 
    WHERE p.id = target_id 
      AND p.role IN ('admin', 'admin_master', 'suporte', 'dev');
  END IF;
  
  -- Se o target_id não existir, a QUERY não retornará nenhuma linha. O PostgREST 
  -- repassa isso como JSON vazio (ou objeto undefined no .single()), sem estourar erros.
END;
$$;

ALTER FUNCTION public.get_user_profile(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
