-- 1. Cria a Função Administrativa Segura (RPC) via Security Definer
CREATE OR REPLACE FUNCTION public.promote_user_role(target_user_id UUID, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- 1. Verifica qual o cargo exato de quem chamou a função RPC (independe de RLS)
  SELECT role::text INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- 2. Barreira Absoluta de Proteção Estrutural
  IF caller_role IS DISTINCT FROM 'admin_master' THEN
    RAISE EXCEPTION 'Acesso Negado: Apenas o ADMIN MASTER pode modificar cargos limitados.';
  END IF;

  -- 3. Sanitização contra injeção ou envio avulso de roles lixo
  IF new_role NOT IN ('student', 'admin', 'admin_master') THEN
    RAISE EXCEPTION 'Cargo (role) inválido.';
  END IF;

  -- 4. BYPASS CIRÚRGICO: Declaramos uma flag interna exclusiva desta transação!
  -- 'true' no último argumento significa is_local=true, durando apenas o escopo atual.
  PERFORM set_config('edacademy.promotion_bypass', 'true', true);

  -- 5. Atualiza a tabela (O trigger disparará agilmente mas lerá a flag acima)
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

END;
$$;


-- 2. Atualização Cirúrgica no Trigger de Proteção (Safeguard)
-- Aqui repensamos a abordagem. Em vez de liberar portas enormes de service_role ou
-- postgres que poderiam abrir brechas inadvertidas nos plugins nativos do Supabase,
-- criamos uma porta secreta que SÓ EXISTE se o RPC tiver validado o autor e criado a chave.

CREATE OR REPLACE FUNCTION public.safeguard_profile_columns()
RETURNS trigger AS $$
BEGIN
  -- BYPASS MILIMÉTRICO: Permite passe livre apenas se essa mesma transação 
  -- iniciou via RPC segura promote_user_role() (que injetou a flag auth).
  IF current_setting('edacademy.promotion_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- RESTANTE INTACTO: Todas as outras portas de banco, servidor e app barradas.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin_master() THEN
      RAISE EXCEPTION 'Apenas usuários master (via plataforma) podem promover cargos.';
    END IF;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NOT public.is_admin_master() AND NOT public.is_any_admin() THEN
      RAISE EXCEPTION 'Acesso Negado para ativar contas manual ou diretamente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
