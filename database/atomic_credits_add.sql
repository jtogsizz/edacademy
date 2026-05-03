-- EdAcademy: Garantia de Atomicidade na Adiçāo de Créditos de Reposiçāo
-- Proteçāo contra chamada direta indevida via RPC pública.

CREATE OR REPLACE FUNCTION public.add_replacement_credit(student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- 1. AUTORIZAÇĀO: Apenas Admins ou Service Role podem conceder créditos
  -- auth.role() = 'service_role' -> Fluxo interno do servidor
  -- public.is_any_admin() -> Professor/Admin logado
  IF (auth.role() <> 'service_role' AND NOT public.is_any_admin()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem conceder créditos.';
  END IF;

  -- 2. EXECUÇĀO ATÔMICA (com bypass explícito da trigger de proteção)
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

-- 3. RESTRIÇĀO DE EXECUÇĀO: Bloqueia acesso público e anônimo
REVOKE EXECUTE ON FUNCTION public.add_replacement_credit(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_replacement_credit(UUID) TO authenticated, service_role;
