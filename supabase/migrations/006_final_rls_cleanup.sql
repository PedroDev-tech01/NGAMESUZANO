-- ==============================================================================
-- Migration 006: Final RLS Cleanup & Security Policy Hardening
-- Remove explicitamente as policies permissivas legadas das migrations 001 e 002,
-- garante que auth_accounts seja restrita EXCLUSIVAMENTE ao service_role (backend),
-- e protege todas as tabelas de negócio contra operações anônimas não autorizadas.
-- ==============================================================================

-- 1. Remoção expressa das policies legadas das migrations 001 e 002
DROP POLICY IF EXISTS "Permitir leitura de laudos"
  ON public.technical_reports;

DROP POLICY IF EXISTS "Permitir operacoes de laudos autenticados"
  ON public.technical_reports;

DROP POLICY IF EXISTS "Permitir leitura de historico"
  ON public.service_order_status_history;

DROP POLICY IF EXISTS "Permitir insercao de historico"
  ON public.service_order_status_history;

-- 2. Garantir RLS habilitado em todas as tabelas do sistema
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Proteção rigorosa para auth_accounts: EXCLUSIVA para service_role (Backend Oficial)
DROP POLICY IF EXISTS "auth_accounts_service_role_only" ON public.auth_accounts;
DROP POLICY IF EXISTS "auth_accounts_select_policy" ON public.auth_accounts;
DROP POLICY IF EXISTS "Permitir tudo auth_accounts" ON public.auth_accounts;

CREATE POLICY "auth_accounts_service_role_only" ON public.auth_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Operações de negócio pelo backend (service_role) e usuários autenticados
-- Clients
DROP POLICY IF EXISTS "clients_service_role_policy" ON public.clients;
CREATE POLICY "clients_service_role_policy" ON public.clients
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- Service Orders
DROP POLICY IF EXISTS "service_orders_service_role_policy" ON public.service_orders;
CREATE POLICY "service_orders_service_role_policy" ON public.service_orders
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- Technical Reports
DROP POLICY IF EXISTS "technical_reports_service_role_policy" ON public.technical_reports;
CREATE POLICY "technical_reports_service_role_policy" ON public.technical_reports
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- Status History
DROP POLICY IF EXISTS "status_history_service_role_policy" ON public.service_order_status_history;
CREATE POLICY "status_history_service_role_policy" ON public.service_order_status_history
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- Maintenance Expenses
DROP POLICY IF EXISTS "maintenance_expenses_service_role_policy" ON public.maintenance_expenses;
CREATE POLICY "maintenance_expenses_service_role_policy" ON public.maintenance_expenses
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- System Settings
DROP POLICY IF EXISTS "system_settings_service_role_policy" ON public.system_settings;
CREATE POLICY "system_settings_service_role_policy" ON public.system_settings
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);
