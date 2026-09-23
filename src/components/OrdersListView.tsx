import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, ServiceOrder, ViewType, OrderStatus } from '../types';
import {
  formatCurrency,
  formatDateTime,
  getOrderValue,
  getStatusBadgeStyle,
  onlyDigits,
  createWhatsAppLink,
  buildOrderWhatsAppMessage,
  getPrazoInfo,
  toDatetimeLocal,
} from '../utils/formatters';
import {
  Plus,
  Search,
  Inbox,
  Trash2,
  Edit,
  Printer,
  X,
  MessageCircle,
  Copy,
  Check,
  Filter,
  CalendarClock,
  Clock,
  AlertTriangle,
  Save,
  PackageCheck,
  History,
} from 'lucide-react';

interface OrdersListViewProps {
  orders: ServiceOrder[];
  clients: Client[];
  initialStatusFilter?: string;
  onNavigate: (view: ViewType) => void;
  onEditOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onPrintOrder: (order: ServiceOrder, autoWhatsApp?: boolean) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrderPrazo?: (orderId: string, newPrazo: string | null) => Promise<void> | void;
  onUpdateOrderRetirada?: (orderId: string, customDate?: string | null) => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  orders,
  clients,
  initialStatusFilter = '',
  onNavigate,
  onEditOrder,
  onDeleteOrder,
  onPrintOrder,
  onUpdateOrderStatus,
  onUpdateOrderPrazo,
  onUpdateOrderRetirada,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick Deadline (Prazo Técnico no Servidor) Modal state
  const [prazoModalOrder, setPrazoModalOrder] = useState<ServiceOrder | null>(null);
  const [prazoModalValue, setPrazoModalValue] = useState<string>('');
  const [isSavingPrazo, setIsSavingPrazo] = useState<boolean>(false);

  // Sync initialStatusFilter if prop changes
  useEffect(() => {
    if (initialStatusFilter !== undefined) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Counts by status & urgency
  const counts = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const isRetornoMonth = (o: ServiceOrder) => {
      if (o.situacao !== 'Retornou com defeito' && !o.dataRetorno) return false;
      const dateToCheck = o.dataRetorno || o.retornoAt || o.saida || o.entrada || o.createdAt;
      if (!dateToCheck) return true;
      const d = new Date(dateToCheck);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    };

    return {
      all: orders.length,
      aberto: orders.filter((o) => o.situacao === 'Em aberto').length,
      andamento: orders.filter((o) => o.situacao === 'Em andamento').length,
      concluido: orders.filter((o) => o.situacao === 'Concluído').length,
      prontoRetirada: orders.filter((o) => o.situacao === 'Concluído' && !o.dataRetirada).length,
      cancelado: orders.filter((o) => o.situacao === 'Cancelado').length,
      retornoMes: orders.filter(isRetornoMonth).length,
      urgente: orders.filter((o) => getPrazoInfo(o.prazo, o.situacao).isUrgent).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const qDigits = onlyDigits(q);

    let list = [...orders];

    if (statusFilter === '__prazo_urgente__') {
      list = list.filter((o) => getPrazoInfo(o.prazo, o.situacao).isUrgent);
    } else if (statusFilter === '__pronto_retirada__') {
      list = list.filter((o) => o.situacao === 'Concluído' && !o.dataRetirada);
    } else if (statusFilter === '__retornos_mes__') {
      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      list = list.filter((o) => {
        if (o.situacao !== 'Retornou com defeito' && !o.dataRetorno) return false;
        const dateToCheck = o.dataRetorno || o.retornoAt || o.saida || o.entrada || o.createdAt;
        if (!dateToCheck) return true;
        const d = new Date(dateToCheck);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (statusFilter) {
      list = list.filter((o) => o.situacao === statusFilter);
    }

    if (q) {
      list = list.filter((o) => {
        const client = clients.find((c) => c.id === o.clienteId);
        const inNumero = String(o.numero).includes(q);
        const inEquip = (o.equipamento || '').toLowerCase().includes(q);
        const inMarca = (o.marca || '').toLowerCase().includes(q);
        const inModelo = (o.modelo || '').toLowerCase().includes(q);
        const inNome = client && client.nome.toLowerCase().includes(q);
        const inCpf = qDigits.length >= 2 && client && onlyDigits(client.cpf).includes(qDigits);
        return inNumero || inEquip || inMarca || inModelo || inNome || inCpf;
      });
    }

    // Sort by entrada descending
    list.sort((a, b) => new Date(b.entrada).getTime() - new Date(a.entrada).getTime());
    return list;
  }, [orders, clients, searchTerm, statusFilter]);

  const handleCopySummary = (order: ServiceOrder, clientName?: string) => {
    const msg = buildOrderWhatsAppMessage(order, clientName);
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(order.id);
      if (onShowToast) onShowToast(`Resumo da O.S. #${order.numero} copiado!`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleOpenPrazoModal = (order: ServiceOrder) => {
    setPrazoModalOrder(order);
    if (order.prazo) {
      setPrazoModalValue(order.prazo.slice(0, 16));
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      defaultDate.setHours(18, 0, 0, 0);
      setPrazoModalValue(toDatetimeLocal(defaultDate));
    }
  };

  const handleSetQuickModalPrazo = (daysFromNow: number, hour = 18) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    setPrazoModalValue(toDatetimeLocal(d));
  };

  const handleSavePrazo = async (remove = false) => {
    if (!prazoModalOrder) return;
    const finalPrazo = remove ? null : (prazoModalValue ? new Date(prazoModalValue).toISOString() : null);

    setIsSavingPrazo(true);
    try {
      if (onUpdateOrderPrazo) {
        await onUpdateOrderPrazo(prazoModalOrder.id, finalPrazo);
      }
      if (onShowToast) {
        onShowToast(
          finalPrazo
            ? `Prazo da O.S. #${prazoModalOrder.numero} atualizado no servidor!`
            : `Prazo da O.S. #${prazoModalOrder.numero} removido no servidor.`
        );
      }
      setPrazoModalOrder(null);
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Erro ao atualizar prazo no servidor');
    } finally {
      setIsSavingPrazo(false);
    }
  };

  const statusChips: { label: string; value: string; count: number; activeColor: string }[] = [
    { label: 'Todas', value: '', count: counts.all, activeColor: 'bg-white text-black font-bold' },
    {
      label: '⏰ Vencendo / Atrasadas',
      value: '__prazo_urgente__',
      count: counts.urgente,
      activeColor: 'bg-[#F59E0B] text-black font-bold',
    },
    {
      label: 'Em aberto',
      value: 'Em aberto',
      count: counts.aberto,
      activeColor: 'bg-[#E51D24] text-white font-bold',
    },
    {
      label: 'Em andamento',
      value: 'Em andamento',
      count: counts.andamento,
      activeColor: 'bg-white text-black font-bold',
    },
    {
      label: 'Concluído',
      value: 'Concluído',
      count: counts.concluido,
      activeColor: 'bg-[#10B981] text-white font-bold',
    },
    {
      label: '📦 Pronto p/ Retirada',
      value: '__pronto_retirada__',
      count: counts.prontoRetirada,
      activeColor: 'bg-emerald-500 text-white font-bold',
    },
    {
      label: 'Cancelado',
      value: 'Cancelado',
      count: counts.cancelado,
      activeColor: 'bg-[#EF4444] text-white font-bold',
    },
    {
      label: 'Retornos no Mês',
      value: '__retornos_mes__',
      count: counts.retornoMes,
      activeColor: 'bg-[#F43F5E] text-white font-bold',
    },
  ];

  return (
    <div id="view-ordens" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
            <h2 className="text-[22px] font-bold text-white tracking-tight">Ordens de Serviço</h2>
            <span className="text-xs font-mono font-bold bg-[#1C2028] text-[#9CA3AF] px-2.5 py-0.5 rounded-full border border-[#2A303C]">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem' : 'ordens'}
            </span>
          </div>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Consulte, imprima, atualize status e notifique o cliente via WhatsApp instantaneamente.
          </p>
        </div>

        <button
          onClick={() => onNavigate('os-form')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E51D24] hover:bg-[#C81018] text-white text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_14px_rgba(229,29,36,0.35)] cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova O.S. (N)</span>
        </button>
      </div>

      {/* Interactive Status Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 touch-scroll no-scrollbar -mx-1 px-1">
        <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5 text-[#E51D24]" />
          Filtrar:
        </span>
        {statusChips.map((chip) => {
          const isActive = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setStatusFilter(chip.value)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                isActive
                  ? `${chip.activeColor} border-transparent shadow-md scale-[1.02]`
                  : 'bg-[#14171C] text-[#9CA3AF] border-[#22262E] hover:bg-[#1C2028] hover:text-white'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-[#9CA3AF]'
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            ref={searchInputRef}
            id="os-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nº da O.S., cliente, CPF, console ou modelo (pressione / para buscar)..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#14171C] border border-[#22262E] rounded-xl text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-white rounded-full transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="px-3 py-2.5 text-xs text-[#9CA3AF] hover:text-white bg-[#14171C] border border-[#22262E] rounded-xl transition-colors cursor-pointer shrink-0"
            title="Limpar filtro de situação"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Orders Table Panel */}
      <div className="bg-[#14171C] border border-[#22262E] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-[#9CA3AF]">
              <Inbox className="w-10 h-10 mx-auto mb-2.5 text-[#4B5563]" />
              <p className="text-sm font-bold text-white">Nenhuma ordem de serviço encontrada.</p>
              <p className="text-xs mt-1 text-[#9CA3AF]">
                {searchTerm || statusFilter
                  ? 'Nenhum registro corresponde aos filtros aplicados.'
                  : 'Cadastre a primeira ordem para começar a acompanhar os atendimentos.'}
              </p>
              {(searchTerm || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                  }}
                  className="mt-4 px-4 py-2 bg-[#1C2028] hover:bg-[#252B36] border border-[#374151] rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Resetar Filtros</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on mobile/tablet portrait < md) */}
              <div className="md:hidden divide-y divide-[#22262E]">
                {filteredOrders.map((order) => {
                  const client = clients.find((c) => c.id === order.clienteId);
                  const total = getOrderValue(order);
                  const badge = getStatusBadgeStyle(order.situacao);
                  const whatsappLink =
                    client?.telefone
                      ? createWhatsAppLink(
                          client.telefone,
                          buildOrderWhatsAppMessage(order, client.nome)
                        )
                      : null;

                  return (
                    <div
                      key={order.id}
                      onClick={() => onPrintOrder(order)}
                      className="p-3.5 sm:p-4 hover:bg-[#181C23] active:bg-[#1C2028] transition-colors cursor-pointer space-y-3"
                    >
                      {/* Top row: #numero, Date & Total Value */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-[#E51D24]">
                            #{order.numero}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF] font-mono">
                            {formatDateTime(order.dataEntrada).split(' ')[0]}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-white">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>

                      {/* Client & Equipment info */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[13.5px] text-white truncate">
                            {client ? client.nome : <span className="text-[#EF4444] italic">(cliente removido)</span>}
                          </span>
                          {client?.telefone && (
                            <span className="text-xs font-mono text-[#9CA3AF] shrink-0">
                              {client.telefone}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#D1D5DB] mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-white">{order.equipamento}</span>
                          {order.marca && <span className="text-[#9CA3AF]">({order.marca})</span>}
                          {order.itens && order.itens.length > 1 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#22262E] text-[#9CA3AF] rounded border border-[#2D333F]">
                              +{order.itens.length - 1} outros
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status + Prazo Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {/* Quick status selector */}
                        <div onClick={(e) => e.stopPropagation()} className="relative">
                          <select
                            value={order.situacao}
                            onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className={`text-xs font-bold py-1.5 pl-2.5 pr-6 rounded-lg appearance-none cursor-pointer border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <option value="Em aberto">Em aberto</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluído">✓ Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                            <option value="Retornou com defeito">⚠️ Retornou com defeito</option>
                          </select>
                        </div>

                        {/* Prazo */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenPrazoModal(order)}
                            className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-[#101216] hover:bg-[#181C23] border border-[#2D333F] text-[#D1D5DB] cursor-pointer"
                          >
                            <CalendarClock className="w-3.5 h-3.5 text-[#F59E0B]" />
                            <span>{order.prazo ? formatDateTime(order.prazo) : 'Definir Prazo'}</span>
                          </button>
                        </div>

                        {/* Timeline shortcut */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onEditOrder(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-[#101216] hover:bg-[#181C23] border border-[#2D333F] text-[#9CA3AF] hover:text-[#E51D24] cursor-pointer"
                            title="Ver histórico de alterações de status"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Timeline</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons row (Large touch targets for smartphones) */}
                      <div
                        className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#1C2028]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.situacao === 'Concluído' && !order.dataRetirada && onUpdateOrderRetirada && (
                          <button
                            type="button"
                            onClick={() => onUpdateOrderRetirada(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Entregar</span>
                          </button>
                        )}

                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-colors cursor-pointer shadow-xs"
                            title="Enviar Ordem de Serviço completa via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPrintOrder(order, true)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-colors cursor-pointer shadow-xs"
                            title="Enviar Ordem de Serviço via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopySummary(order, client?.nome)}
                          className="p-1.5 rounded-md border border-[#374151] text-[#9CA3AF] hover:text-white cursor-pointer"
                          title="Copiar resumo"
                        >
                          {copiedId === order.id ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintOrder(order)}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-[#E51D24] text-white cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditOrder(order.id)}
                          className="p-1.5 rounded-md border border-[#374151] text-[#D1D5DB] hover:text-white cursor-pointer"
                          title={order.situacao === 'Concluído' ? 'O.S. Concluída (Campos principais bloqueados para manter o histórico)' : 'Editar O.S.'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteOrder(order.id)}
                          className="p-1.5 rounded-md border border-[#374151] text-[#EF4444] hover:bg-[#EF4444]/15 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (Hidden on mobile < md) */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#101216] border-b border-[#22262E] text-[11px] uppercase tracking-wider text-[#9CA3AF] font-bold">
                    <th className="py-3 px-4">Nº</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Equipamento</th>
                    <th className="py-3 px-4">Entrada</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Prazo Técnico</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Situação (Rápida)</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-[#22262E]">
                {filteredOrders.map((order) => {
                  const client = clients.find((c) => c.id === order.clienteId);
                  const total = getOrderValue(order);
                  const badge = getStatusBadgeStyle(order.situacao);
                  const whatsappLink =
                    client?.telefone
                      ? createWhatsAppLink(
                          client.telefone,
                          buildOrderWhatsAppMessage(order, client.nome)
                        )
                      : null;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onPrintOrder(order)}
                      className="hover:bg-[#181C23] cursor-pointer transition-colors group"
                      title="Clique para visualizar e imprimir a ordem de serviço"
                    >
                      <td className="py-3.5 px-4 font-mono text-[13px] text-[#E51D24] font-bold group-hover:underline">
                        #{order.numero}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[13.5px] text-white">
                        <div>{client ? client.nome : <span className="text-[#EF4444] italic">(cliente removido)</span>}</div>
                        {client?.telefone && (
                          <div className="text-xs text-[#9CA3AF] font-mono mt-0.5">
                            {client.telefone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[13.5px] text-[#D1D5DB]">
                        <div className="font-medium text-white">{order.equipamento}</div>
                        {(order.marca || order.modelo) && (
                          <div className="text-xs text-[#9CA3AF]">
                            {[order.marca, order.modelo].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {Array.isArray(order.itens) && order.itens.length > 1 && (
                          <span className="inline-block mt-1 mr-1 text-[10px] px-1.5 py-0.5 bg-[#E51D24]/15 text-[#E51D24] border border-[#E51D24]/30 rounded font-bold font-mono">
                            +{order.itens.length - 1} item{order.itens.length > 2 ? 'ns' : ''} adicional
                          </span>
                        )}
                        {order.dataRetirada && (
                          <div className="text-[10.5px] text-emerald-400 font-medium mt-0.5">
                            ✓ Retirado ({formatDateTime(order.dataRetirada)})
                          </div>
                        )}
                        {(order.dataRetorno || order.situacao === 'Retornou com defeito') && (
                          <div className="text-[10.5px] text-rose-400 font-bold mt-0.5">
                            ⚠️ Retorno garantia
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#9CA3AF]">
                        {formatDateTime(order.entrada)}
                      </td>
                      {/* Prazo Técnico Gravado no Servidor */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const info = getPrazoInfo(order.prazo, order.situacao);
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenPrazoModal(order)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-all cursor-pointer hover:brightness-110 active:scale-95 ${info.badgeStyle.bg} ${info.badgeStyle.text} ${info.badgeStyle.border}`}
                                title={`Clique para definir ou alterar o prazo no servidor\nData: ${info.formattedDate}`}
                              >
                                <Clock className={`w-3 h-3 ${info.isUrgent ? 'animate-pulse text-[#EF4444]' : ''}`} />
                                <span>{info.label}</span>
                              </button>
                              {order.prazo && (
                                <span className="text-[10px] font-mono text-[#6B7280]">
                                  {info.formattedDate}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-start gap-1">
                          {onUpdateOrderStatus ? (
                            <select
                              value={order.situacao}
                              onChange={(e) =>
                                onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                              }
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-md font-mono border cursor-pointer ${badge.bg} ${badge.text} ${badge.border} focus:outline-none transition-all`}
                              title="Clique para mudar a situação instantaneamente"
                            >
                              <option value="Em aberto" className="bg-[#14171C] text-white">
                                Em aberto
                              </option>
                              <option value="Em andamento" className="bg-[#14171C] text-white">
                                Em andamento
                              </option>
                              <option value="Concluído" className="bg-[#14171C] text-[#10B981] font-bold">
                                ✓ Concluído
                              </option>
                              <option value="Cancelado" className="bg-[#14171C] text-white">
                                Cancelado
                              </option>
                              <option value="Retornou com defeito" className="bg-[#14171C] text-white">
                                ⚠️ Retornou com defeito
                              </option>
                            </select>
                          ) : (
                            <span
                              className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-sm font-mono border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {order.situacao}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditOrder(order.id)}
                            className="inline-flex items-center gap-1 text-[10.5px] text-[#9CA3AF] hover:text-[#E51D24] font-mono cursor-pointer transition-colors"
                            title="Ver histórico e linha do tempo de alterações de status"
                          >
                            <History className="w-3 h-3" />
                            <span>{order.historicoStatus && order.historicoStatus.length > 1 ? `${order.historicoStatus.length} etapas` : 'Timeline'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[13px] text-white font-bold">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1.5 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Botão de Entrega Rápida no Balcão */}
                          {order.situacao === 'Concluído' && !order.dataRetirada && onUpdateOrderRetirada && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrderRetirada(order.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 transition-all cursor-pointer shadow-xs animate-pulse hover:animate-none"
                              title="Registrar entrega ao cliente agora (Inicia garantia de 90 dias)"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Entregar</span>
                            </button>
                          )}

                          {/* Botão Enviar WhatsApp */}
                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-colors cursor-pointer shadow-xs"
                              title="Enviar Ordem de Serviço com todos os dados técnicos no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">WhatsApp</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onPrintOrder(order, true)}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-colors cursor-pointer shadow-xs"
                              title="Enviar Ordem de Serviço via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">WhatsApp</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopySummary(order, client?.nome)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-md border border-[#374151] text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copiar texto resumo da O.S."
                          >
                            {copiedId === order.id ? (
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintOrder(order)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-[#E51D24] hover:bg-[#C81018] text-white transition-colors cursor-pointer shadow-xs"
                            title="Imprimir ordem de serviço"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditOrder(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#374151] text-[#D1D5DB] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title={order.situacao === 'Concluído' ? 'O.S. Concluída (Campos principais travados para proteger o histórico)' : 'Editar O.S.'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteOrder(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold p-1.5 rounded-md border border-[#374151] text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors cursor-pointer"
                            title="Excluir O.S."
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>

      {/* MODAL DE DEFINIÇÃO RÁPIDA DE PRAZO TÉCNICO NO SERVIDOR */}
      {prazoModalOrder && (
        <div
          className="fixed inset-0 bg-[#0A0D12]/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => !isSavingPrazo && setPrazoModalOrder(null)}
        >
          <div
            className="bg-[#14171C] border border-[#2D333F] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#22262E] flex items-center justify-between bg-[#101216]">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Definir Prazo Técnico no Servidor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrazoModalOrder(null)}
                disabled={isSavingPrazo}
                className="p-1 text-[#9CA3AF] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#1A1E26] rounded-lg border border-[#2A303C]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#E51D24] font-bold text-sm">
                    #{prazoModalOrder.numero}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    {prazoModalOrder.situacao}
                  </span>
                </div>
                <div className="text-white font-medium mt-1">
                  {prazoModalOrder.equipamento}
                </div>
                {prazoModalOrder.defeito && (
                  <div className="text-[#9CA3AF] text-[11px] mt-1 line-clamp-2">
                    {prazoModalOrder.defeito}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Data e Hora Limite de Entrega</span>
                </label>
                <input
                  type="datetime-local"
                  value={prazoModalValue}
                  onChange={(e) => setPrazoModalValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-[#2D333F] rounded-lg text-sm text-white focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
                />
              </div>

              {/* Atalhos Rápidos da Bancada */}
              <div>
                <span className="block text-[11px] text-[#9CA3AF] font-mono mb-2">
                  Atalhos rápidos para o técnico:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetQuickModalPrazo(0, 18)}
                    className="px-2 py-1.5 rounded bg-[#1C2028] hover:bg-[#252C38] border border-[#374151] text-[11px] font-medium text-white transition-colors cursor-pointer"
                  >
                    Hoje (18h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickModalPrazo(1, 18)}
                    className="px-2 py-1.5 rounded bg-[#1C2028] hover:bg-[#252C38] border border-[#374151] text-[11px] font-medium text-white transition-colors cursor-pointer"
                  >
                    Amanhã (18h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickModalPrazo(3, 18)}
                    className="px-2 py-1.5 rounded bg-[#1C2028] hover:bg-[#252C38] border border-[#374151] text-[11px] font-medium text-white transition-colors cursor-pointer"
                  >
                    +3 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickModalPrazo(7, 18)}
                    className="px-2 py-1.5 rounded bg-[#1C2028] hover:bg-[#252C38] border border-[#374151] text-[11px] font-medium text-white transition-colors cursor-pointer"
                  >
                    +7 Dias
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#9CA3AF] bg-[#0E1116] p-2.5 rounded border border-[#22262E]">
                💡 <strong>Previsão Técnica no Servidor:</strong> Permite que qualquer técnico conectado veja a previsão da bancada e receba alertas de proximidade ou atraso.
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#101216] border-t border-[#22262E] flex items-center justify-between">
              {prazoModalOrder.prazo ? (
                <button
                  type="button"
                  disabled={isSavingPrazo}
                  onClick={() => handleSavePrazo(true)}
                  className="px-3 py-1.5 rounded text-[11px] font-medium text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors cursor-pointer"
                >
                  Remover Prazo
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingPrazo}
                  onClick={() => setPrazoModalOrder(null)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingPrazo}
                  onClick={() => handleSavePrazo(false)}
                  className="px-4 py-1.5 rounded text-xs font-bold bg-[#F59E0B] hover:bg-[#D97706] text-black transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPrazo ? 'Gravando no Servidor...' : 'Salvar no Servidor'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
