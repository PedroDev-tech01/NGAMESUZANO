-- ==============================================================================
-- Migration 001: Technical Reports (Laudo Técnico)
-- Relacionamento 1:1 estrito com a tabela service_orders
-- Cada Ordem de Serviço pode possuir no máximo UM Laudo Técnico pericial.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.technical_reports (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL UNIQUE REFERENCES public.service_orders(id) ON DELETE CASCADE,
  diagnostico TEXT NOT NULL,
  servico_realizado TEXT NOT NULL,
  pecas_utilizadas TEXT,
  observacao_tecnica TEXT,
  tecnico_responsavel TEXT NOT NULL,
  data_analise TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Índice para busca rápida por O.S. (embora UNIQUE já crie índice, reforça a integridade)
CREATE INDEX IF NOT EXISTS idx_technical_reports_service_order_id ON public.technical_reports(service_order_id);

-- Ativação de Row Level Security
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;

-- Política de leitura: autenticados e anon com acesso ao sistema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'technical_reports' AND policyname = 'Permitir leitura de laudos'
  ) THEN
    CREATE POLICY "Permitir leitura de laudos" ON public.technical_reports FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'technical_reports' AND policyname = 'Permitir operacoes de laudos autenticados'
  ) THEN
    CREATE POLICY "Permitir operacoes de laudos autenticados" ON public.technical_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
