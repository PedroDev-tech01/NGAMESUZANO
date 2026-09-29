-- ==============================================================================
-- Migration 002: Service Order Status History (Histórico de Mudança de Status)
-- Relacionamento 1:N com a tabela service_orders
-- Registra auditoria completa e cronológica de cada transição de status.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.service_order_status_history (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  usuario TEXT,
  created_at TEXT NOT NULL
);

-- Índices para performance em consultas por O.S. e ordenação temporal
CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON public.service_order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON public.service_order_status_history(created_at);

-- Ativação de Row Level Security
ALTER TABLE public.service_order_status_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'service_order_status_history' AND policyname = 'Permitir leitura de historico'
  ) THEN
    CREATE POLICY "Permitir leitura de historico" ON public.service_order_status_history FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'service_order_status_history' AND policyname = 'Permitir insercao de historico'
  ) THEN
    CREATE POLICY "Permitir insercao de historico" ON public.service_order_status_history FOR INSERT WITH CHECK (true);
  END IF;
END $$;
