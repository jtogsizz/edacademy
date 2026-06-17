-- Fase 4: Tabela de transações financeiras para controle de faturamento
-- Executar manualmente no Supabase SQL Editor

CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) NOT NULL,
    subscription_id UUID REFERENCES public.subscriptions(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BRL',
    type TEXT NOT NULL, -- 'manual_confirmation', 'renewal'
    confirmed_by UUID REFERENCES public.profiles(id) NOT NULL,
    confirmed_at TIMESTAMPTZ DEFAULT now(),
    reference_month INT NOT NULL,
    reference_year INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Permitir acesso apenas para admin_master, suporte e dev (bloquear 'admin' comum)
CREATE POLICY "Apenas staff master acessa transacoes"
    ON public.financial_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND role IN ('admin_master', 'suporte', 'dev')
        )
    );
