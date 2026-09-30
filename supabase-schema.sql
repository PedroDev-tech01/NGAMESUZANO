-- N! GAMES ASSISTÊNCIA TÉCNICA - SCHEMA COMPLETO SUPABASE (PostgreSQL)
-- Execute este script no SQL Editor do seu projeto Supabase (https://supabase.com/dashboard)

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cep TEXT,
  email TEXT,
  nascimento TEXT,
  endereco TEXT,
  obs TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- 2. Tabela de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.service_orders (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  cliente_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  situacao TEXT NOT NULL,
  canal TEXT NOT NULL,
  entrada TEXT NOT NULL,
  prazo TEXT,
  saida TEXT,
  data_retirada TEXT,
  data_retorno TEXT,
  motivo_retorno TEXT,
  equipamento TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  serie TEXT,
  defeito TEXT,
  solucao TEXT,
  estado_console TEXT,
  itens TEXT,
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
  mao_obra NUMERIC(12, 2),
  pecas NUMERIC(12, 2),
  desconto NUMERIC(12, 2),
  obs TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  retorno_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_service_orders_cliente_id ON public.service_orders(cliente_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_numero ON public.service_orders(numero);

-- 3. Tabela de Laudos Técnicos Especializados (Relacionamento 1:1 com service_orders)
CREATE TABLE IF NOT EXISTS public.technical_reports (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL UNIQUE REFERENCES public.service_orders(id) ON DELETE CASCADE,
  diagnostico TEXT NOT NULL,
  servico_realizado TEXT NOT NULL,
  pecas_utilizadas TEXT,
  observacao_tecnica TEXT,
  tecnico_responsavel TEXT NOT NULL,
  data_analise TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_technical_reports_order_id ON public.technical_reports(service_order_id);

-- 4. Tabela de Histórico de Mudança de Status (Relacionamento 1:N com service_orders)
CREATE TABLE IF NOT EXISTS public.service_order_status_history (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  usuario TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON public.service_order_status_history(service_order_id);

-- 5. Tabela de Despesas de Manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id TEXT PRIMARY KEY,
  mes TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- 6. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Contas de Login / Autenticação de Usuários
CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- NOTA DE SEGURANÇA: A conta administrativa é provisionada dinamicamente pelo backend
-- através de ensureAuthAccountInDb() com hash derivado de INITIAL_ADMIN_PASSWORD.
-- Nenhum hash estático ou credencial fixa deve ser inserido via SQL.

-- 8. Habilitar Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de Acesso e Proteção de Dados (Hardening RLS)
-- Limpeza de políticas prévias
DROP POLICY IF EXISTS "Permitir tudo clients" ON public.clients;
DROP POLICY IF EXISTS "Permitir tudo service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Permitir tudo technical_reports" ON public.technical_reports;
DROP POLICY IF EXISTS "Permitir tudo service_order_status_history" ON public.service_order_status_history;
DROP POLICY IF EXISTS "Permitir tudo maintenance_expenses" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "Permitir tudo system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Permitir tudo auth_accounts" ON public.auth_accounts;

-- Auth Accounts: Acesso EXCLUSIVO para service_role (Backend API)
DROP POLICY IF EXISTS "auth_accounts_service_role_only" ON public.auth_accounts;
CREATE POLICY "auth_accounts_service_role_only" ON public.auth_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tabelas de Domínio: Leitura e escrita via backend autorizado (service_role e authenticated)
CREATE POLICY "clients_write_authenticated" ON public.clients
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_orders_write_authenticated" ON public.service_orders
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "technical_reports_write_authenticated" ON public.technical_reports
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "status_history_write_authenticated" ON public.service_order_status_history
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "maintenance_expenses_write_authenticated" ON public.maintenance_expenses
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "system_settings_write_authenticated" ON public.system_settings
  FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);
