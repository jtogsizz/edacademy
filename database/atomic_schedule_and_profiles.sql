-- 1. Índice Parcial para Inibir Múltiplos Cancelamentos
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_cancellation_slot 
ON public.appointments (student_id, teacher_id, start_time) 
WHERE status = 'cancelled';

-- 2. Trigger Inteligente de Proteção (RLS)
CREATE OR REPLACE FUNCTION protect_profile_fields() RETURNS trigger AS $$
BEGIN
  -- Restrição Ativa SOMENTE em requisições Frontend via API REST ('authenticated').
  -- As funções RPC com SECURITY DEFINER passarão lotadas deste IF.
  IF current_user = 'authenticated' THEN
      
      -- 1. Role (Apenas Admin Master Altera via Supabase Client)
      -- Necessita da função is_admin_master() pré-existente
      IF NOT public.is_admin_master() THEN
        NEW.role := OLD.role;
      END IF;

      -- 2. Is Active (Qualquer Admin)
      IF NOT public.is_any_admin() THEN
        NEW.is_active := OLD.is_active;
      END IF;

      -- 3. Replacement Credits (100% Imutável via REST, exceto se houver bypass explícito)
      IF current_setting('edacademy.allow_profile_system_update', true) IS DISTINCT FROM 'true' THEN
        NEW.replacement_credits := OLD.replacement_credits;
      END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atravessar a Trava sobre a tabela.
DROP TRIGGER IF EXISTS enforce_profile_protection ON public.profiles;

CREATE TRIGGER enforce_profile_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- 3. RPC de Garantia Atômica de Idempotência
CREATE OR REPLACE FUNCTION public.cancel_and_credit_recurring(
    p_student_id uuid,
    p_teacher_id uuid,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_reason text,
    p_cancelled_by uuid
) RETURNS json AS $$
DECLARE
    v_appointment_id uuid;
    v_should_grant boolean;
BEGIN
    -- 1. Inserção com Trava de Concorrência via Unique Index
    INSERT INTO public.appointments (
        student_id, teacher_id, start_time, end_time, status, cancellation_reason, cancelled_by
    ) VALUES (
        p_student_id, p_teacher_id, p_start_time, p_end_time, 'cancelled', p_reason, p_cancelled_by
    ) 
    ON CONFLICT (student_id, teacher_id, start_time) WHERE status = 'cancelled'
    DO NOTHING
    RETURNING id INTO v_appointment_id;

    -- Se v_appointment_id for NULL, outro processo já havia inserido e o DO NOTHING silenciou
    IF v_appointment_id IS NULL THEN
        RETURN json_build_object('success', false, 'action', 'already_exists_or_ignored', 'credits_granted', false);
    END IF;

    -- 2. Concessão Atômica de Crédito Exatamente e Estritamente ÚNICA 
    v_should_grant := p_reason != 'Aluno não compareceu';
    
    IF v_should_grant THEN
        -- Bypass explícito da trigger de proteção
        PERFORM set_config('edacademy.allow_profile_system_update', 'true', true);
        
        UPDATE public.profiles
        SET 
            replacement_credits = replacement_credits + 1,
            updated_at = now()
        WHERE id = p_student_id;
    END IF;

    RETURN json_build_object('success', true, 'action', 'inserted', 'credits_granted', v_should_grant);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
