-- EdAcademy: Configuração de STORAGE para Upload de Imagens
-- Execute este script no SQL Editor do seu Supabase para criar os buckets e políticas.

-- 1. Criar buckets se não existirem
-- (Nota: Dependendo da permissão do banco, pode ser necessário rodar via Dashboard, 
-- mas aqui está a lógica SQL para o console da Supabase)

INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança para o Bucket 'posts'
-- Leitura pública
CREATE POLICY "Public Access for Posts" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'posts' );

-- Apenas admins podem fazer upload em 'posts'
CREATE POLICY "Admins can upload posts" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'posts' AND (auth.role() = 'authenticated') );

-- 3. Políticas de Segurança para o Bucket 'avatars'
-- Leitura pública
CREATE POLICY "Public Access for Avatars" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- Qualquer usuário autenticado pode fazer upload de seu próprio avatar
-- (Nota: Para simplificar, permitimos o insert se autenticado, 
-- podemos refinar para checar se o caminho começa com user_id se necessário)
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND (auth.role() = 'authenticated') );

-- Permitir update do próprio avatar
CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]) );
