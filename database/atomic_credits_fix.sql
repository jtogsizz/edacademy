-- EdAcademy: Garantia de Atomicidade no Consumo de Créditos
-- Este script adiciona uma função RPC para debitar créditos de forma segura.

CREATE OR REPLACE FUNCTION public.consume_replacement_credit(student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Tenta decrementar apenas se houver saldo > 0
  UPDATE public.profiles
  SET 
    replacement_credits = replacement_credits - 1,
    updated_at = now()
  WHERE id = student_uuid AND replacement_credits > 0;

  -- Verifica se o salto foi decrementado (alguma linha foi afetada)
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
