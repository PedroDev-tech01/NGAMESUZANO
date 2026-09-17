-- N! GAMES ASSISTÊNCIA TÉCNICA - SCHEMA SUPABASE (PostgreSQL)
-- Copie e cole este script no SQL Editor do seu projeto Supabase (https://supabase.com/dashboard)

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
  created_at TEXT NOT NULL
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
  created_at TEXT NOT NULL,
  retorno_at TEXT
);

-- 3. Tabela de Custos / Despesas de Manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id TEXT PRIMARY KEY,
  mes TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 4. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Contas de Login / Autenticação de Usuários
CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL
);

-- Inserir Conta Oficial Autorizada
INSERT INTO public.auth_accounts (id, cnpj, senha, razao_social, nome_fantasia, ativo, created_at)
VALUES (
  'acc-master-ngames',
  '34.467.363/0001-53',
  'Loja3637',
  'N! GAMES ASSISTÊNCIA TÉCNICA ESPECIALIZADA',
  'N! GAMES',
  true,
  NOW()
)
ON CONFLICT (cnpj) DO UPDATE SET
  senha = EXCLUDED.senha,
  ativo = EXCLUDED.ativo;

-- Habilitar RLS ou permitir leitura/escrita com Service Role / Anon
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre para o sistema operacional
CREATE POLICY "Permitir tudo para autenticados e anon" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados e anon" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados e anon" ON public.maintenance_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados e anon" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados e anon" ON public.auth_accounts FOR ALL USING (true) WITH CHECK (true);
