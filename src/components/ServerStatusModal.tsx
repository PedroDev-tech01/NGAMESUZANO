import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, RefreshCw, CheckCircle2, AlertCircle, X, Shield, Clock, HardDrive, Copy, Check, ExternalLink } from 'lucide-react';
import { api, ServerHealth } from '../services/api';

const SUPABASE_SQL_SCRIPT = `-- N! GAMES ASSISTÊNCIA TÉCNICA - SCHEMA SUPABASE (PostgreSQL)
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em Run

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

CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id TEXT PRIMARY KEY,
  mes TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo service_orders" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo maintenance_expenses" ON public.maintenance_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
`;

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  onResetData: () => Promise<void>;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  isOpen,
  onClose,
  onSync,
  onResetData,
}) => {
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      setError('Não foi possível conectar ao servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#14171C] border border-[#2A303C] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#22262E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E51D24]/10 text-[#E51D24] border border-[#E51D24]/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Status do Servidor Backend
                {health?.status === 'ok' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    Offline
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5 font-mono">
                API REST Node.js / Express + Armazenamento Local JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Falha de conexão com a API</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : loading && !health ? (
          <div className="py-8 text-center text-xs text-[#9CA3AF] flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#E51D24]" />
            <span>Consultando integridade do servidor...</span>
          </div>
        ) : health ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#0B0C0E] border border-[#22262E] rounded-xl">
                <div className="text-[#9CA3AF] flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Status do Serviço</span>
                </div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Ativo e Respondendo</span>
                </div>
              </div>

              <div className="p-3 bg-[#0B0C0E] border border-[#22262E] rounded-xl">
                <div className="text-[#9CA3AF] flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Uptime</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {formatUptime(health.uptime)}
                </div>
              </div>

              <div className="p-3 bg-[#0B0C0E] border border-[#22262E] rounded-xl">
                <div className="text-[#9CA3AF] flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-[#E51D24]" />
                  <span>Ordens no Servidor</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {health.database.totalOrders} ordens
                </div>
              </div>

              <div className="p-3 bg-[#0B0C0E] border border-[#22262E] rounded-xl">
                <div className="text-[#9CA3AF] flex items-center gap-1.5 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Clientes no Servidor</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {health.database.totalClients} clientes
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B0C0E] border border-[#22262E] rounded-xl text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span>Próximo nº de O.S.:</span>
                <span className="font-mono font-bold text-white">#{health.database.nextOrderSeq}</span>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span>Porta do Servidor:</span>
                <span className="font-mono text-white">3000 (0.0.0.0)</span>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span>Mecanismo Ativo:</span>
                <span className={`font-mono font-semibold ${health.supabaseConnected ? 'text-[#10B981]' : 'text-[#3B82F6]'}`}>
                  {health.engine || (health.supabaseConnected ? 'Supabase (PostgreSQL Cloud)' : 'Local JSON (/data/db.json)')}
                </span>
              </div>
            </div>

            {/* Supabase Status Banner */}
            <div className={`p-3.5 rounded-xl border text-xs ${health.supabaseConnected ? 'bg-[#10B981]/10 border-[#10B981]/30 text-white' : 'bg-[#181C23] border-[#2A303C] text-[#9CA3AF]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5 text-white">
                  <Database className={`w-4 h-4 ${health.supabaseConnected ? 'text-[#10B981]' : 'text-[#60A5FA]'}`} />
                  Supabase PostgreSQL Cloud
                </span>
                {health.supabaseConnected ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-mono text-[10px] font-bold border border-[#10B981]/40">
                    ONLINE & LIGADO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] font-mono text-[10px] font-bold border border-[#3B82F6]/40">
                    LOCAL (/data/db.json)
                  </span>
                )}
              </div>

              {health.supabaseConnected ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-[#A7F3D0] leading-relaxed">
                    As credenciais do seu projeto <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-white">frjmslrygksatugmjzot</code> estão conectadas!
                  </p>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#10B981]/20 space-y-2 text-[11px]">
                    <div className="text-[#D1D5DB]">
                      <strong>Passo final:</strong> Se ainda não executou o script para criar as tabelas no Supabase:
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#10B981] hover:bg-[#059669] text-black font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSql ? 'Copiado para a área de transferência!' : '1. Copiar Código das Tabelas (SQL)'}
                      </button>

                      <a
                        href="https://supabase.com/dashboard/project/frjmslrygksatugmjzot/sql/new"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] font-medium text-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#60A5FA]" />
                        2. Abrir SQL Editor no Supabase
                      </a>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] leading-normal pt-1">
                      No Supabase, cole o código no editor e clique no botão verde <strong className="text-white">Run</strong>. Em seguida, clique em <strong className="text-white">Sincronizar Agora</strong> abaixo para validar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <p className="text-[#D1D5DB]">
                    O conector Supabase já está totalmente instalado no código.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#22262E]">
          <button
            type="button"
            disabled={resetting}
            onClick={async () => {
              if (window.confirm('Tem certeza que deseja restaurar os dados iniciais de demonstração no servidor?')) {
                setResetting(true);
                try {
                  await onResetData();
                  await fetchStatus();
                } finally {
                  setResetting(false);
                }
              }
            }}
            className="text-xs text-[#EF4444] hover:text-[#DC2626] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {resetting ? 'Restaurando...' : 'Restaurar Dados Demo'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                try {
                  await onSync();
                  await fetchStatus();
                } finally {
                  setIsSyncing(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C2028] hover:bg-[#252B36] border border-[#374151] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Agora</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#E51D24] hover:bg-[#C81018] text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
