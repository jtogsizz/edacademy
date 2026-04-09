-- Suporte a múltiplos idiomas: professores e alunos

-- 1. Coluna de idioma do professor (ex: 'english', 'spanish', 'french', 'portuguese')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT NULL;

-- 2. Coluna de idioma do aluno (definida pelo admin no momento de ativar o plano)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_language TEXT DEFAULT NULL;

-- 3. Coluna plan_active booleana (mirror rápido do status da subscription, gerenciado pelo admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_active BOOLEAN DEFAULT FALSE;

-- Índice para filtragem por idioma (performance)
CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles (language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_student_language ON public.profiles (student_language) WHERE student_language IS NOT NULL;
