-- ============================================================
-- EdAcademy: Integração Eventos <> Feed Posts
-- ============================================================

-- 1. Associar Posts aos Eventos
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_posts_event_id ON public.posts(event_id);

-- 2. Atualizar a RPC de Posts para incluir o Evento
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
            'start_time', e.start_time,
            'end_time', e.end_time,
            'max_participants', e.max_participants,
            'status', e.status,
            'teacher', json_build_object(
              'id', t.id,
              'full_name', t.full_name,
              'avatar_url', t.avatar_url
            ),
            'participant_count', (
              SELECT count(*)::int 
              FROM public.event_participants ep 
              WHERE ep.event_id = e.id
            ),
            'is_participating', (
              SELECT EXISTS(
                SELECT 1 FROM public.event_participants ep 
                WHERE ep.event_id = e.id AND ep.student_id = auth.uid()
              )
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
