import React from 'react';
import { ServiceOrder, StatusHistoryEntry, OrderStatus } from '../types';
import { formatDateTime, getStatusBadgeStyle } from '../utils/formatters';
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  XCircle,
  History,
  Check,
} from 'lucide-react';

interface OrderStatusTimelineProps {
  order: ServiceOrder;
  compact?: boolean;
}

/**
 * Returns status history for an order.
 * If historicoStatus is not yet populated (e.g. legacy order),
 * builds a logical chronological progression from order fields.
 */
export function getOrderStatusTimeline(order: ServiceOrder): StatusHistoryEntry[] {
  if (Array.isArray(order.historicoStatus) && order.historicoStatus.length > 0) {
    // Return copy sorted by date ascending
    return [...order.historicoStatus].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  }

  // Fallback synthesis for orders without explicit history
  const entries: StatusHistoryEntry[] = [];
  const entradaDate = order.entrada || order.createdAt || new Date().toISOString();

  // Initial creation
  entries.push({
    id: `init-${order.id}`,
    de: 'Criada',
    para: 'Em aberto',
    data: entradaDate,
    observacao: 'Abertura da Ordem de Serviço',
  });

  // If currently Em andamento
  if (order.situacao === 'Em andamento') {
    entries.push({
      id: `andamento-${order.id}`,
      de: 'Em aberto',
      para: 'Em andamento',
      data: order.entrada || entradaDate,
      observacao: 'Equipamento em análise/bancada técnica',
    });
  }

  // If Concluído
  if (order.situacao === 'Concluído') {
    if (order.saida && order.saida !== entradaDate) {
      entries.push({
        id: `concluido-${order.id}`,
        de: 'Em andamento',
        para: 'Concluído',
        data: order.saida,
        observacao: 'Manutenção finalizada e testada',
      });
    } else {
      entries.push({
        id: `concluido-${order.id}`,
        de: 'Em aberto',
        para: 'Concluído',
        data: order.saida || entradaDate,
        observacao: 'Serviço concluído',
      });
    }

    if (order.dataRetirada) {
      entries.push({
        id: `retirada-${order.id}`,
        de: 'Concluído',
        para: 'Concluído',
        data: order.dataRetirada,
        observacao: 'Equipamento entregue ao cliente (Garantia de 90 dias ativada)',
      });
    }
  }

  // If Retornou com defeito
  if (order.situacao === 'Retornou com defeito') {
    entries.push({
      id: `retorno-${order.id}`,
      de: 'Concluído',
      para: 'Retornou com defeito',
      data: order.dataRetorno || order.retornoAt || new Date().toISOString(),
      observacao: order.motivoRetorno || 'Retorno para reparo em garantia',
    });
  }

  // If Cancelado
  if (order.situacao === 'Cancelado') {
    entries.push({
      id: `cancelado-${order.id}`,
      de: 'Em aberto',
      para: 'Cancelado',
      data: order.saida || order.createdAt || entradaDate,
      observacao: 'Ordem de serviço cancelada',
    });
  }

  return entries;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'Concluído':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'Em andamento':
      return <Clock className="w-4 h-4 text-sky-400" />;
    case 'Em aberto':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    case 'Cancelado':
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case 'Retornou com defeito':
      return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    default:
      return <History className="w-4 h-4 text-zinc-400" />;
  }
}

function getStatusNodeColor(status: string) {
  switch (status) {
    case 'Concluído':
      return 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-emerald-500/20';
    case 'Em andamento':
      return 'bg-sky-950 border-sky-500 text-sky-300 ring-sky-500/20';
    case 'Em aberto':
      return 'bg-amber-950 border-amber-500 text-amber-300 ring-amber-500/20';
    case 'Cancelado':
      return 'bg-rose-950 border-rose-500 text-rose-300 ring-rose-500/20';
    case 'Retornou com defeito':
      return 'bg-rose-950 border-rose-500 text-rose-300 ring-rose-500/20';
    default:
      return 'bg-[#181C23] border-[#374151] text-zinc-300 ring-zinc-500/20';
  }
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({ order, compact = false }) => {
  const history = getOrderStatusTimeline(order);
  const currentBadge = getStatusBadgeStyle(order.situacao);

  return (
    <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-4 sm:p-5 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22262E] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#E51D24]" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Linha do Tempo de Status
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1F242D] text-[#9CA3AF] border border-[#374151]">
            {history.length} {history.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#9CA3AF]">Status Atual:</span>
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}
          >
            {order.situacao}
          </span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-3 before:w-0.5 before:bg-[#2A303C]">
        {history.map((entry, idx) => {
          const isLast = idx === history.length - 1;
          const nodeColor = getStatusNodeColor(entry.para);
          const fromBadge = entry.de !== 'Criada' ? getStatusBadgeStyle(entry.de as OrderStatus) : null;
          const toBadge = getStatusBadgeStyle(entry.para);

          return (
            <div key={entry.id || idx} className="relative group">
              {/* Timeline marker icon/dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${nodeColor} ${
                  isLast ? 'ring-4 ring-opacity-40 animate-pulse' : ''
                }`}
                title={`Status: ${entry.para}`}
              >
                {getStatusIcon(entry.para)}
              </div>

              {/* Event Content Card */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isLast
                    ? 'bg-[#181C24] border-[#374151] shadow-sm'
                    : 'bg-[#101216] border-[#1F242D] hover:border-[#2A303C]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                  {/* Status Transition Badge (ex: 'Em aberto' -> 'Concluído') */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.de === 'Criada' ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1F242D] text-[#D1D5DB] border border-[#374151] font-semibold">
                        Abertura da O.S.
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          fromBadge
                            ? `${fromBadge.bg} ${fromBadge.text} ${fromBadge.border}`
                            : 'bg-[#1F242D] text-[#9CA3AF] border-[#374151]'
                        }`}
                      >
                        {entry.de}
                      </span>
                    )}

                    <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />

                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${toBadge.bg} ${toBadge.text} ${toBadge.border}`}
                    >
                      {entry.para}
                    </span>

                    {isLast && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/50 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Atual
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-[#9CA3AF] font-mono">
                    <Clock className="w-3 h-3 text-[#6B7280]" />
                    <span>{formatDateTime(entry.data)}</span>
                  </div>
                </div>

                {/* Optional observation or details */}
                {entry.observacao && (
                  <p className="text-xs text-[#9CA3AF] mt-1 pl-0.5 leading-relaxed">
                    {entry.observacao}
                  </p>
                )}

                {entry.usuario && (
                  <span className="text-[10.5px] text-[#6B7280] block mt-1">
                    Registrado por: {entry.usuario}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
