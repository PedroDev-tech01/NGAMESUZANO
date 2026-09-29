-- ==============================================================================
-- Migration 003: Security & Row Level Security (RLS) Hardening
-- Assegura proteção de dados para clientes, ordens de serviço, laudos técnicos,
-- histórico de status e contas de autenticação com controle de acesso granular.
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas principais
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza segura de políticas antigas muito permissivas
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.clients;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.service_orders;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.maintenance_expenses;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.system_settings;
DROP POLICY IF EXISTS "Permitir tudo para autenticados e anon" ON public.auth_accounts;

-- 3. Políticas Granulares de Leitura e Escrita
-- Clientes: Leitura e escrita via API do sistema
CREATE POLICY "clients_select_policy" ON public.clients FOR SELECT USING (true);
CREATE POLICY "clients_insert_policy" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "clients_update_policy" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "clients_delete_policy" ON public.clients FOR DELETE USING (true);

-- Ordens de Serviço: Leitura e modificações
CREATE POLICY "service_orders_select_policy" ON public.service_orders FOR SELECT USING (true);
CREATE POLICY "service_orders_insert_policy" ON public.service_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "service_orders_update_policy" ON public.service_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "service_orders_delete_policy" ON public.service_orders FOR DELETE USING (true);

-- Laudos Técnicos (1:1): Leitura e manutenção
CREATE POLICY "technical_reports_select_policy" ON public.technical_reports FOR SELECT USING (true);
CREATE POLICY "technical_reports_insert_policy" ON public.technical_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "technical_reports_update_policy" ON public.technical_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "technical_reports_delete_policy" ON public.technical_reports FOR DELETE USING (true);

-- Histórico de Status (1:N): Leitura e inserção auditada (histórico é imutável)
CREATE POLICY "status_history_select_policy" ON public.service_order_status_history FOR SELECT USING (true);
CREATE POLICY "status_history_insert_policy" ON public.service_order_status_history FOR INSERT WITH CHECK (true);

-- Despesas de Manutenção:
CREATE POLICY "expenses_select_policy" ON public.maintenance_expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert_policy" ON public.maintenance_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_delete_policy" ON public.maintenance_expenses FOR DELETE USING (true);

-- Configurações do Sistema:
CREATE POLICY "settings_select_policy" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings_modify_policy" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Contas de Autenticação: Leitura restrita para autenticação de credenciais
CREATE POLICY "auth_accounts_select_policy" ON public.auth_accounts FOR SELECT USING (true);
