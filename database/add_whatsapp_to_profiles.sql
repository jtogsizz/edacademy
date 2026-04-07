-- database/add_whatsapp_to_profiles.sql
-- Migração segura para adicionar WhatsApp ao perfil do aluno

-- 1. Adicionar a coluna whatsapp_number na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2. Atualizar a função handle_new_user para capturar o dado do metadado do Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles com suporte ao whatsapp_number vindo do cadastro (raw_user_meta_data)
  INSERT INTO public.profiles (id, full_name, role, whatsapp_number)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'student', 
    new.raw_user_meta_data->>'whatsapp_number'
  );

  -- Create an inactive subscription for the new student
  INSERT INTO public.subscriptions (student_id, status)
  VALUES (new.id, 'inactive');

  RETURN NEW;
END;
$$;
