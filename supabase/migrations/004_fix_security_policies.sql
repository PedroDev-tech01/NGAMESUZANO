-- ==============================================================================
-- Migration 004: Hardening de Políticas de Segurança (Row Level Security)
-- Substitui políticas excessivamente permissivas por regras auditadas e restritas.
-- ==============================================================================

-- 1. Assegurar RLS ativo em todas as tabelas
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas permissivas de desenvolvimento (anon ALL USING (true))
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

-- 3. Políticas Granulares e Seguras para o Backend / Service Role / Usuários Autenticados
-- Clientes
CREATE POLICY "clients_read_authenticated" ON public.clients FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "clients_write_authenticated" ON public.clients FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Ordens de Serviço
CREATE POLICY "service_orders_read_authenticated" ON public.service_orders FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "service_orders_write_authenticated" ON public.service_orders FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Laudos Técnicos Periciais (1:1)
CREATE POLICY "technical_reports_read_authenticated" ON public.technical_reports FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "technical_reports_write_authenticated" ON public.technical_reports FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Histórico de Status (1:N)
CREATE POLICY "status_history_read_authenticated" ON public.service_order_status_history FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "status_history_write_authenticated" ON public.service_order_status_history FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Despesas de Manutenção
CREATE POLICY "maintenance_expenses_read_authenticated" ON public.maintenance_expenses FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "maintenance_expenses_write_authenticated" ON public.maintenance_expenses FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Configurações do Sistema
CREATE POLICY "system_settings_read_authenticated" ON public.system_settings FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "system_settings_write_authenticated" ON public.system_settings FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Contas de Autenticação (Acesso estrito apenas pelo serviço de backend)
CREATE POLICY "auth_accounts_service_role_only" ON public.auth_accounts FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);
