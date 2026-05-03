-- ============================================================
-- EdAcademy: Correção Completa do Sistema de Créditos (v2)
-- Aplicar INTEIRAMENTE no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. consume_replacement_credit — blindagem de auth
-- Somente o próprio aluno (via server action autenticado) pode
-- consumir seu crédito. Admins NÃO devem usar essa RPC.
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_replacement_credit(student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- AUTORIZAÇÃO: Apenas o próprio aluno pode consumir o próprio crédito.
  -- auth.uid() é o usuário autenticado que chamou a função via RPC.
  -- A server action sempre passa user.id = auth.uid(), então esse check é seguro.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: usuário não autenticado.';
  END IF;

  IF auth.uid() <> student_uuid THEN
    RAISE EXCEPTION 'Não autorizado: você só pode consumir seus próprios créditos.';
  END IF;

  -- Bypass explícito da trigger de proteção de perfil
  PERFORM set_config('edacademy.allow_profile_system_update', 'true', true);

  -- Decrementa apenas se houver saldo > 0 (impede saldo negativo)
  UPDATE public.profiles
  SET
    replacement_credits = replacement_credits - 1,
    updated_at = now()
  WHERE id = student_uuid
    AND replacement_credits > 0;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- FALSE = saldo insuficiente (nenhuma linha foi afetada)
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revogar acesso público e conceder apenas a usuários autenticados
REVOKE EXECUTE ON FUNCTION public.consume_replacement_credit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_replacement_credit(UUID) TO authenticated;
-- Nota: service_role NÃO recebe acesso intencional a esta função.
-- Para operações internas do servidor, use add_replacement_credit ou add_n_replacement_credits.


-- ============================================================
-- 2. add_replacement_credit — sem alterações na lógica, apenas
-- garantindo que o REVOKE/GRANT esteja correto.
-- (Recriando para garantir idempotência)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_replacement_credit(student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- AUTORIZAÇÃO: Apenas Admins ou Service Role podem conceder créditos.
  -- Alunos nunca podem auto-conceder crédito.
  IF (auth.role() <> 'service_role' AND NOT public.is_any_admin()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem conceder créditos.';
  END IF;

  -- Bypass explícito da trigger de proteção
  PERFORM set_config('edacademy.allow_profile_system_update', 'true', true);

  UPDATE public.profiles
  SET
    replacement_credits = COALESCE(replacement_credits, 0) + 1,
    updated_at = now()
  WHERE id = student_uuid;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.add_replacement_credit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_replacement_credit(UUID) TO authenticated, service_role;


-- ============================================================
-- 3. add_n_replacement_credits — NOVA função para conceder
-- múltiplos créditos de uma só vez (evita loop de RPCs).
-- Usada em addRecurringClass quando há múltiplos conflitos.
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_n_replacement_credits(
  student_uuid UUID,
  amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- AUTORIZAÇÃO: Apenas Admins ou Service Role
  IF (auth.role() <> 'service_role' AND NOT public.is_any_admin()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem conceder créditos.';
  END IF;

  -- Validação de quantidade (dupla defesa: TypeScript + PostgreSQL)
  -- Máximo de 10 por chamada — nunca confiar só na camada de aplicação
  IF amount <= 0 OR amount > 10 THEN
    RAISE EXCEPTION 'Quantidade de créditos inválida: deve ser entre 1 e 10. Recebido: %', amount;
  END IF;

  -- Bypass explícito da trigger de proteção
  PERFORM set_config('edacademy.allow_profile_system_update', 'true', true);

  UPDATE public.profiles
  SET
    replacement_credits = COALESCE(replacement_credits, 0) + amount,
    updated_at = now()
  WHERE id = student_uuid;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.add_n_replacement_credits(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_n_replacement_credits(UUID, INTEGER) TO authenticated, service_role;


-- ============================================================
-- 4. Constraint de saldo não-negativo (defesa em profundidade)
-- Impede que qualquer UPDATE (direto ou via RPC com bug) resulte
-- em replacement_credits negativo.
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_replacement_credits_non_negative;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_replacement_credits_non_negative
  CHECK (replacement_credits >= 0);


-- ============================================================
-- 5. Sanitização de URLs externas (meet_url e avatar_url)
-- Remove quaisquer valores que não comecem com https://
-- ============================================================

-- 5a. meet_url em profiles (professores)
UPDATE public.profiles
SET meet_url = NULL
WHERE meet_url IS NOT NULL
  AND meet_url NOT LIKE 'https://%';

-- 5b. meet_url em events
UPDATE public.events
SET meet_url = NULL
WHERE meet_url IS NOT NULL
  AND meet_url NOT LIKE 'https://%';

-- 5c. avatar_url em profiles
-- Aceita apenas https:// — padronização moderna, sem mixed content, sem legado http://
-- O next.config.ts já exige https:// para lh3.googleusercontent.com e supabase.co
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND avatar_url NOT LIKE 'https://%';

-- ============================================================
-- VERIFICAÇÃO: rode estas queries para confirmar que tudo está ok
-- ============================================================
-- SELECT proname, prosecdef FROM pg_proc WHERE proname IN (
--   'consume_replacement_credit', 'add_replacement_credit', 'add_n_replacement_credits'
-- );
-- SELECT id, replacement_credits FROM public.profiles WHERE replacement_credits < 0;
-- SELECT id, meet_url FROM public.profiles WHERE meet_url IS NOT NULL AND meet_url NOT LIKE 'https://%';
-- SELECT id, meet_url FROM public.events WHERE meet_url IS NOT NULL AND meet_url NOT LIKE 'https://%';
