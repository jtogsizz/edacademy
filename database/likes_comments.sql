-- database/likes_comments.sql

-- 1. Tabela de Curtidas
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- 2. Tabela de Comentários
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS
-- Qualquer usuário autenticado pode ver curtidas e comentários
CREATE POLICY "Likes and comments are public" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Comments are public" ON public.post_comments FOR SELECT USING (true);

-- Usuários podem curtir/descurtir (insert/delete)
CREATE POLICY "Users can manage their own likes" ON public.post_likes 
  FOR ALL USING (user_id = auth.uid());

-- Usuários podem comentar
CREATE POLICY "Users can manage their own comments" ON public.post_comments 
  FOR ALL USING (user_id = auth.uid());
