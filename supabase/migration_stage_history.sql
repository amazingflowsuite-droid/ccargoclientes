-- ==============================================================================
-- Migration: Histórico Real de Transições de Estágio / Status no Funil
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.account_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  usuario_nome TEXT NOT NULL DEFAULT 'Sistema',
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_stage_history_account_created
  ON public.account_stage_history(account_id, created_at DESC);

ALTER TABLE public.account_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS fechado: acesso permitido apenas via backend (SUPABASE_SERVICE_ROLE_KEY)
DROP POLICY IF EXISTS "Permitir leitura publica account_stage_history" ON public.account_stage_history;
DROP POLICY IF EXISTS "Permitir insercao publica account_stage_history" ON public.account_stage_history;
DROP POLICY IF EXISTS "Permitir atualizacao publica account_stage_history" ON public.account_stage_history;
DROP POLICY IF EXISTS "Permitir exclusao publica account_stage_history" ON public.account_stage_history;

-- Backfill inicial para contas existentes que ainda não possuem registro de transição
INSERT INTO public.account_stage_history (
  account_id,
  from_stage,
  to_stage,
  from_status,
  to_status,
  usuario_nome,
  motivo,
  created_at
)
SELECT
  a.id,
  NULL,
  COALESCE(a.estagio::text, CASE WHEN a.status = 'cliente_ativo' THEN 'fechado_ganho' ELSE 'prospeccao_inicial' END),
  NULL,
  a.status::text,
  COALESCE(NULLIF(a.sdr_responsavel_nome, ''), NULLIF(a.gerente_conta_nome, ''), 'Sistema'),
  'Registro inicial retroativo',
  a.created_at
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_stage_history h WHERE h.account_id = a.id
);
