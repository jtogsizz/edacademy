-- Upgrades para o Sistema de Créditos de Reposição

-- 1. Adicionar coluna de créditos no perfil do aluno
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS replacement_credits INTEGER DEFAULT 0;

-- 2. Adicionar campos de motivo de cancelamento nos agendamentos
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id);

-- 3. Garantir que admins e admin_master possam gerenciar créditos
-- RLS para perfis já permite update por admins, mas vamos reforçar se necessário
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        -- Políticas adicionais se necessário no futuro
    END IF;
END $$;

-- 4. Função auxiliar para conceder crédito (opcional, pode ser feito via App)
-- Mas centralizar no banco ajuda na consistência
CREATE OR REPLACE FUNCTION public.award_replacement_credit(student_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET replacement_credits = replacement_credits + 1,
        updated_at = now()
    WHERE id = student_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
