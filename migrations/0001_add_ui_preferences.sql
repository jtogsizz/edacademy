-- Fase 4: preferências de UI por usuário
-- Executar uma única vez no Supabase SQL Editor
-- Este SQL precisa ser executado manualmente no Supabase SQL Editor antes da persistência no banco funcionar.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_theme TEXT DEFAULT 'light';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_locale TEXT DEFAULT 'pt';
