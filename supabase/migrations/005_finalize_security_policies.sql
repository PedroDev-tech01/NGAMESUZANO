-- ==============================================================================
-- Migration 005: Finalize Security Policies & RLS Hardening
-- Remove formalmente todas as policies legadas e permissivas pelo nome,
-- garante que auth_accounts seja acessível EXCLUSIVAMENTE via service_role,
-- e proíbe terminantemente qualquer escrita anônima (anon INSERT/UPDATE/DELETE).
-- ==============================================================================

-- 1. Assegurar RLS ativo em todas as tabelas
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Remover pelo nome todas as policies permissivas legadas (Migration 003 e anteriores)
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

DROP POLICY IF EXISTS "service_orders_select_policy" ON public.service_orders;
DROP POLICY IF EXISTS "service_orders_insert_policy" ON public.service_orders;
DROP POLICY IF EXISTS "service_orders_update_policy" ON public.service_orders;
DROP POLICY IF EXISTS "service_orders_delete_policy" ON public.service_orders;

DROP POLICY IF EXISTS "technical_reports_select_policy" ON public.technical_reports;
DROP POLICY IF EXISTS "technical_reports_insert_policy" ON public.technical_reports;
DROP POLICY IF EXISTS "technical_reports_update_policy" ON public.technical_reports;
DROP POLICY IF EXISTS "technical_reports_delete_policy" ON public.technical_reports;

DROP POLICY IF EXISTS "status_history_select_policy" ON public.service_order_status_history;
DROP POLICY IF EXISTS "status_history_insert_policy" ON public.service_order_status_history;

DROP POLICY IF EXISTS "expenses_select_policy" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.maintenance_expenses;

DROP POLICY IF EXISTS "settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON public.system_settings;

DROP POLICY IF EXISTS "auth_accounts_select_policy" ON public.auth_accounts;

-- Remover policies antigas com wildcard
DROP POLICY IF EXISTS "Permitir tudo clients" ON public.clients;
DROP POLICY IF EXISTS "Permitir tudo service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Permitir tudo technical_reports" ON public.technical_reports;
DROP POLICY IF EXISTS "Permitir tudo service_order_status_history" ON public.service_order_status_history;
DROP POLICY IF EXISTS "Permitir tudo maintenance_expenses" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "Permitir tudo system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Permitir tudo auth_accounts" ON public.auth_accounts;

DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.clients;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.service_orders;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.technical_reports;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.service_order_status_history;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.system_settings;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.auth_accounts;

-- 3. Atualizar política da tabela auth_accounts: EXCLUSIVA para service_role (Backend Oficial)
DROP POLICY IF EXISTS "auth_accounts_service_role_only" ON public.auth_accounts;
CREATE POLICY "auth_accounts_service_role_only" ON public.auth_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Garantir que as tabelas de domínio permitam escrita SOMENTE para backend (service_role) e authenticated
-- Reafirmar remoção de qualquer permissão anônima de escrita
DROP POLICY IF EXISTS "clients_write_authenticated" ON public.clients;
CREATE POLICY "clients_write_authenticated" ON public.clients
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_orders_write_authenticated" ON public.service_orders;
CREATE POLICY "service_orders_write_authenticated" ON public.service_orders
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "technical_reports_write_authenticated" ON public.technical_reports;
CREATE POLICY "technical_reports_write_authenticated" ON public.technical_reports
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "status_history_write_authenticated" ON public.service_order_status_history;
CREATE POLICY "status_history_write_authenticated" ON public.service_order_status_history
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "maintenance_expenses_write_authenticated" ON public.maintenance_expenses;
CREATE POLICY "maintenance_expenses_write_authenticated" ON public.maintenance_expenses
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "system_settings_write_authenticated" ON public.system_settings;
CREATE POLICY "system_settings_write_authenticated" ON public.system_settings
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);
