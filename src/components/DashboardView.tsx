import React, { useState, useMemo } from 'react';
import { Client, ServiceOrder, ViewType, OrderStatus } from '../types';
import {
  formatCurrency,
  formatDateTime,
  getOrderValue,
  getStatusBadgeStyle,
  createWhatsAppLink,
  buildOrderWhatsAppMessage,
  getPrazoInfo,
} from '../utils/formatters';
import {
  Inbox,
  Printer,
  Edit,
  PlusCircle,
  Users,
  ArrowUpRight,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CalendarClock,
  AlertTriangle,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardViewProps {
  orders: ServiceOrder[];
  clients: Client[];
  onNavigate: (view: ViewType) => void;
  onEditOrder: (orderId: string) => void;
  onPrintOrder: (order: ServiceOrder) => void;
  onFilterStatus?: (status: string) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onOpenShortcuts?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  clients,
  onNavigate,
  onEditOrder,
  onPrintOrder,
  onFilterStatus,
  onUpdateOrderStatus,
  onOpenShortcuts,
}) => {
  const [tableFilter, setTableFilter] = useState<'recent' | 'retornos' | 'urgentes' | 'abertas'>('recent');

  const abertasCount = orders.filter((o) => o.situacao === 'Em aberto').length;
  const andamentoCount = orders.filter((o) => o.situacao === 'Em andamento').length;
  const retornoCount = orders.filter((o) => o.situacao === 'Retornou com defeito').length;
  const urgentesCount = orders.filter((o) => getPrazoInfo(o.prazo, o.situacao).isUrgent).length;

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const isOrderRetornoNoMes = (o: ServiceOrder) => {
    if (o.situacao !== 'Retornou com defeito' && !o.dataRetorno) return false;
    const dateToCheck = o.dataRetorno || o.retornoAt || o.saida || o.entrada || o.createdAt;
    if (!dateToCheck) return true;
    const d = new Date(dateToCheck);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  };

  const retornosMesOrders = orders.filter(isOrderRetornoNoMes);
  const retornosMesCount = retornosMesOrders.length;

  const concluidasMesCount = orders.filter((o) => {
    if (o.situacao !== 'Concluído') return false;
    const d = new Date(o.entrada);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  }).length;

  const clientsCount = clients.length;

  // Recent 6 orders sorted by entrada descending
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.entrada).getTime() - new Date(a.entrada).getTime())
    .slice(0, 6);

  const displayedTableOrders = useMemo(() => {
    if (tableFilter === 'retornos') {
      return retornosMesOrders;
    }
    if (tableFilter === 'urgentes') {
      return orders.filter((o) => getPrazoInfo(o.prazo, o.situacao).isUrgent);
    }
    if (tableFilter === 'abertas') {
      return orders.filter((o) => o.situacao === 'Em aberto').slice(0, 8);
    }
    return recentOrders;
  }, [tableFilter, retornosMesOrders, orders, recentOrders]);

  const handleCardClick = (status: string) => {
    if (onFilterStatus) {
      onFilterStatus(status);
    } else {
      onNavigate('ordens');
    }
  };

  return (
    <div id="view-dashboard" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24] animate-pulse"></span>
            <h2 className="text-[22px] font-bold text-white tracking-tight">Painel de Atendimentos</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C2028] text-[#9CA3AF] border border-[#2A303C]">
              Tempo Real
            </span>
          </div>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Visão geral dinâmica das ordens de serviço e status da assistência técnica N! GAMES.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-[#14171C] hover:bg-[#1C2028] border border-[#22262E] text-[#9CA3AF] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              title="Ver atalhos do teclado"
            >
              <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">Atalhos (?)</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('relatorios')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#14171C] hover:bg-[#1C2028] border border-[#374151] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial"
            title="Abrir área de gráficos e fluxo mensal"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="truncate">Gráficos</span>
          </button>

          <button
            onClick={() => onNavigate('cliente-form')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#14171C] hover:bg-[#1C2028] border border-[#374151] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="truncate">+ Cliente</span>
          </button>

          <button
            onClick={() => onNavigate('os-form')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#E51D24] hover:bg-[#C81018] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_14px_rgba(229,29,36,0.35)] hover:shadow-[0_0_20px_rgba(229,29,36,0.5)] transition-all cursor-pointer w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Ordem</span>
          </button>
        </div>
      </div>

      {/* Interactive Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: Em aberto */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleCardClick('Em aberto')}
          className="bg-[#14171C] border border-[#22262E] rounded-xl p-3 sm:p-4.5 relative overflow-hidden group hover:border-[#E51D24] transition-all cursor-pointer shadow-md hover:shadow-xl"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E51D24]"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#D1D5DB] font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-[#E51D24]" />
              <span className="truncate">Em aberto</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9CA3AF] group-hover:text-[#E51D24] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          <div id="stat-abertas" className="font-mono text-2xl sm:text-3xl font-extrabold text-[#E51D24] mt-2">
            {abertasCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 sm:mt-2 truncate">
            <span className="text-[#E51D24] font-semibold">Pendentes</span> na fila
          </div>
        </motion.div>

        {/* Card 2: Em andamento */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleCardClick('Em andamento')}
          className="bg-[#14171C] border border-[#22262E] rounded-xl p-3 sm:p-4.5 relative overflow-hidden group hover:border-white transition-all cursor-pointer shadow-md hover:shadow-xl"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-white"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#D1D5DB] font-medium">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span className="truncate">Em andamento</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9CA3AF] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          <div id="stat-andamento" className="font-mono text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {andamentoCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 sm:mt-2 truncate">
            <span className="text-white font-semibold">Na bancada</span> em reparo
          </div>
        </motion.div>

        {/* Card 3: Concluídas no mês */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleCardClick('Concluído')}
          className="bg-[#14171C] border border-[#22262E] rounded-xl p-3 sm:p-4.5 relative overflow-hidden group hover:border-emerald-500/70 transition-all cursor-pointer shadow-md hover:shadow-xl"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#10B981]"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#D1D5DB] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="truncate">Concluídas (Mês)</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9CA3AF] group-hover:text-[#10B981] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          <div id="stat-concluidas" className="font-mono text-2xl sm:text-3xl font-extrabold text-[#10B981] mt-2">
            {concluidasMesCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 sm:mt-2 truncate">
            <span className="text-[#10B981] font-semibold">Finalizadas</span> no mês
          </div>
        </motion.div>

        {/* Card 4: Retornos no mês */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            setTableFilter('retornos');
            const el = document.getElementById('dashboard-orders-table');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`bg-[#14171C] border ${
            retornosMesCount > 0 ? 'border-[#F43F5E]/50 hover:border-[#F43F5E]' : 'border-[#22262E] hover:border-[#F43F5E]/50'
          } rounded-xl p-3 sm:p-4.5 relative overflow-hidden group transition-all cursor-pointer shadow-md hover:shadow-xl`}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#F43F5E]"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#D1D5DB] font-medium">
              <RotateCcw className="w-3.5 h-3.5 text-[#F43F5E]" />
              <span className="truncate">Retornos (Mês)</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9CA3AF] group-hover:text-[#F43F5E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          <div id="stat-retornos-mes" className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F43F5E] mt-2 flex items-baseline gap-1.5">
            <span>{retornosMesCount}</span>
            {retornosMesCount > 0 && (
              <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-[#F43F5E]/20 text-[#FDA4AF] border border-[#F43F5E]/40">
                Garantia
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 sm:mt-2 truncate">
            <span className="text-[#F43F5E] font-semibold">Clique para filtrar</span>
          </div>
        </motion.div>

        {/* Card 5: Clientes */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onNavigate('clientes')}
          className="col-span-2 sm:col-span-1 bg-[#14171C] border border-[#22262E] rounded-xl p-3 sm:p-4.5 relative overflow-hidden group hover:border-[#E51D24] transition-all cursor-pointer shadow-md hover:shadow-xl"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E51D24]"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#D1D5DB] font-medium">
              <Users className="w-3.5 h-3.5 text-[#E51D24]" />
              <span>Clientes cadastrados</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9CA3AF] group-hover:text-[#E51D24] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          <div id="stat-clientes" className="font-mono text-2xl sm:text-3xl font-extrabold text-[#E51D24] mt-2">
            {clientsCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 sm:mt-2">
            <span className="text-[#E51D24] font-semibold">Ver agenda completa</span>
          </div>
        </motion.div>
      </div>

      {/* Alerta de Prazos Críticos para o Técnico */}
      {urgentesCount > 0 && (
        <div
          onClick={() => handleCardClick('__prazo_urgente__')}
          className="p-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-[#F59E0B]/15 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#F59E0B] text-black">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-[#F59E0B]">
                Atenção da Bancada: {urgentesCount} ordem(ns) com prazo urgente ou atrasadas no servidor!
              </span>
              <p className="text-[11px] text-[#D1D5DB] mt-0.5">
                Priorize o reparo ou diagnóstico desses aparelhos hoje.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shrink-0 cursor-pointer"
          >
            Ver Prioridades
          </button>
        </div>
      )}

      {/* Quick Action Navigation Strip */}
      <div className="flex items-center gap-2 p-3 bg-[#14171C] border border-[#22262E] rounded-xl overflow-x-auto text-xs">
        <span className="text-[#9CA3AF] font-bold uppercase tracking-wider text-[11px] pl-2 pr-1 shrink-0">
          Filtro Rápido:
        </span>
        <button
          onClick={() => {
            setTableFilter('recent');
            const el = document.getElementById('dashboard-orders-table');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
            tableFilter === 'recent'
              ? 'bg-[#E51D24] text-white font-bold border-transparent'
              : 'bg-[#1C2028] hover:bg-[#252B36] text-white border-[#2D323C]'
          }`}
        >
          Todas ({orders.length})
        </button>
        {retornosMesCount > 0 && (
          <button
            onClick={() => {
              setTableFilter('retornos');
              const el = document.getElementById('dashboard-orders-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 border inline-flex items-center gap-1.5 ${
              tableFilter === 'retornos'
                ? 'bg-[#F43F5E] text-white font-bold border-transparent'
                : 'bg-[#38101E] hover:bg-[#4C1529] text-[#FB7185] border-[#F43F5E]/40'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retornos no Mês ({retornosMesCount})</span>
          </button>
        )}
        {urgentesCount > 0 && (
          <button
            onClick={() => {
              setTableFilter('urgentes');
              const el = document.getElementById('dashboard-orders-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border ${
              tableFilter === 'urgentes'
                ? 'bg-[#F59E0B] text-black font-bold border-transparent'
                : 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] border-[#F59E0B]/50'
            }`}
          >
            ⏰ Vencendo / Atrasadas ({urgentesCount})
          </button>
        )}
        <button
          onClick={() => {
            setTableFilter('abertas');
            const el = document.getElementById('dashboard-orders-table');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 border ${
            tableFilter === 'abertas'
              ? 'bg-[#E51D24] text-white font-bold border-transparent'
              : 'bg-[#2A0D0F] hover:bg-[#3D1417] text-[#FF4D52] border-[#E51D24]/40'
          }`}
        >
          Em Aberto ({abertasCount})
        </button>
        <button
          onClick={() => handleCardClick('Em andamento')}
          className="px-3 py-1.5 rounded-lg bg-[#1C2028] hover:bg-[#252B36] text-white font-semibold transition-colors cursor-pointer shrink-0 border border-[#4B5563]"
        >
          Em Andamento ({andamentoCount})
        </button>
        <button
          onClick={() => handleCardClick('Concluído')}
          className="px-3 py-1.5 rounded-lg bg-[#073322]/80 hover:bg-[#0A4730] text-[#10B981] font-semibold transition-colors cursor-pointer shrink-0 border border-[#059669]/60"
        >
          Concluído ({concluidasMesCount})
        </button>
      </div>

      {/* Orders Table Panel with Filter Tabs */}
      <div id="dashboard-orders-table" className="bg-[#14171C] border border-[#22262E] rounded-xl overflow-hidden shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-[#22262E] bg-[#181B21]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#E51D24]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {tableFilter === 'retornos'
                ? 'Ordens com Retorno no Mês'
                : tableFilter === 'urgentes'
                ? 'Ordens com Prazo Urgente'
                : tableFilter === 'abertas'
                ? 'Ordens em Aberto'
                : 'Últimas Ordens de Serviço'}
            </h3>
            <span className="text-xs font-mono font-bold bg-[#1C2028] text-[#9CA3AF] px-2 py-0.5 rounded border border-[#2A303C]">
              {displayedTableOrders.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#101216] p-1 rounded-lg border border-[#22262E] text-xs">
              <button
                onClick={() => setTableFilter('recent')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  tableFilter === 'recent'
                    ? 'bg-[#E51D24] text-white font-bold'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Todas Recentes
              </button>
              <button
                onClick={() => setTableFilter('retornos')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  tableFilter === 'retornos'
                    ? 'bg-[#F43F5E] text-white font-bold'
                    : 'text-[#FDA4AF] hover:text-white'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retornos no Mês ({retornosMesCount})</span>
              </button>
              {urgentesCount > 0 && (
                <button
                  onClick={() => setTableFilter('urgentes')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    tableFilter === 'urgentes'
                      ? 'bg-[#F59E0B] text-black font-bold'
                      : 'text-[#F59E0B] hover:text-white'
                  }`}
                >
                  Urgentes ({urgentesCount})
                </button>
              )}
              {abertasCount > 0 && (
                <button
                  onClick={() => setTableFilter('abertas')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    tableFilter === 'abertas'
                      ? 'bg-white text-black font-bold'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Em Aberto ({abertasCount})
                </button>
              )}
            </div>

            <button
              onClick={() => onNavigate('ordens')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#374151] text-white hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5 ml-auto md:ml-0"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {displayedTableOrders.length === 0 ? (
            <div className="p-12 text-center text-[#9CA3AF]">
              <Inbox className="w-10 h-10 mx-auto mb-2.5 text-[#4B5563]" />
              <p className="text-sm font-bold text-white">
                {tableFilter === 'retornos'
                  ? 'Nenhuma ordem com retorno com defeito neste mês.'
                  : tableFilter === 'urgentes'
                  ? 'Nenhuma ordem com prazo urgente no momento.'
                  : tableFilter === 'abertas'
                  ? 'Nenhuma ordem com status em aberto.'
                  : 'Nenhuma ordem de serviço cadastrada.'}
              </p>
              <p className="text-xs mt-1 text-[#9CA3AF]">
                {tableFilter === 'retornos'
                  ? 'Quando um aparelho retornar com defeito dentro do mês, ele aparecerá destacado aqui.'
                  : 'Clique no botão "Nova Ordem" acima para registrar uma nova entrada.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Orders Card List (Visible on mobile/tablet portrait < md) */}
              <div className="md:hidden divide-y divide-[#22262E]">
                {displayedTableOrders.map((order) => {
                  const client = clients.find((c) => c.id === order.clienteId);
                  const total = getOrderValue(order);
                  const badge = getStatusBadgeStyle(order.situacao);
                  const prazoInfo = getPrazoInfo(order.prazo, order.situacao);
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
                      className="p-3.5 sm:p-4 hover:bg-[#181C23] active:bg-[#1C2028] transition-colors cursor-pointer space-y-2.5"
                    >
                      {/* Top: Order #, Status and Price */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#E51D24]">
                            #{order.numero}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF]">
                            {formatDateTime(order.entrada)}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-[#10B981]">
                          {formatCurrency(total)}
                        </span>
                      </div>

                      {/* Equipment and Client */}
                      <div>
                        <div className="font-bold text-[14px] text-white">
                          {order.equipamento}
                        </div>
                        <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5 mt-0.5">
                          <span className="text-white font-medium">
                            {client ? client.nome : '(cliente removido)'}
                          </span>
                          {(order.marca || order.modelo) && (
                            <>
                              <span>•</span>
                              <span>{[order.marca, order.modelo].filter(Boolean).join(' ')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Prazo and Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${prazoInfo.badgeStyle.bg} ${prazoInfo.badgeStyle.text} ${prazoInfo.badgeStyle.border}`}
                        >
                          <Clock className={`w-3 h-3 ${prazoInfo.isUrgent ? 'animate-pulse text-[#EF4444]' : ''}`} />
                          <span>{prazoInfo.label}</span>
                        </span>

                        <div onClick={(e) => e.stopPropagation()}>
                          {onUpdateOrderStatus ? (
                            <select
                              value={order.situacao}
                              onChange={(e) =>
                                onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                              }
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg font-mono border cursor-pointer ${badge.bg} ${badge.text} ${badge.border} focus:outline-none`}
                            >
                              <option value="Aguardando Análise">Aguardando Análise</option>
                              <option value="Em Manutenção">Em Manutenção</option>
                              <option value="Aguardando Peça">Aguardando Peça</option>
                              <option value="Aguardando Retirada">Aguardando Retirada</option>
                              <option value="Concluído">Concluído</option>
                              <option value="Sem Reparo">Sem Reparo</option>
                              <option value="Retornou com defeito">Retornou com defeito</option>
                              <option value="Em aberto">Em aberto</option>
                              <option value="Em andamento">Em andamento</option>
                              <option value="Aguardando aprovação">Aguardando aprovação</option>
                              <option value="Aprovado">Aprovado</option>
                              <option value="Cancelado">Cancelado</option>
                              <option value="Entregue">Entregue</option>
                            </select>
                          ) : (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                              {order.situacao}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center justify-between gap-2 pt-2 border-t border-[#1C2028]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPrintOrder(order)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#E51D24] hover:bg-[#C81018] text-white cursor-pointer shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditOrder(order.id)}
                            className="p-1.5 rounded-lg border border-[#374151] text-[#D1D5DB] hover:text-white cursor-pointer"
                            title="Editar O.S."
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262E]">
                {displayedTableOrders.map((order) => {
                  const client = clients.find((c) => c.id === order.clienteId);
                  const total = getOrderValue(order);
                  const badge = getStatusBadgeStyle(order.situacao);
                  const prazoInfo = getPrazoInfo(order.prazo, order.situacao);
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
                      className="hover:bg-[#1A1E26] cursor-pointer transition-colors group"
                      title="Clique para visualizar e imprimir a ordem de serviço"
                    >
                      <td className="py-3 px-4 font-mono text-[13px] text-[#E51D24] font-bold group-hover:underline">
                        #{order.numero}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[13.5px] text-white">
                        {client ? client.nome : '(cliente removido)'}
                      </td>
                      <td className="py-3 px-4 text-[13.5px] text-[#D1D5DB]">
                        <div className="font-medium text-white">{order.equipamento}</div>
                        {(order.marca || order.modelo) && (
                          <div className="text-xs text-[#9CA3AF]">
                            {[order.marca, order.modelo].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#9CA3AF]">
                        {formatDateTime(order.entrada)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${prazoInfo.badgeStyle.bg} ${prazoInfo.badgeStyle.text} ${prazoInfo.badgeStyle.border}`}
                          title={`Previsão no servidor: ${prazoInfo.formattedDate}`}
                        >
                          <Clock className={`w-3 h-3 ${prazoInfo.isUrgent ? 'animate-pulse text-[#EF4444]' : ''}`} />
                          <span>{prazoInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {onUpdateOrderStatus ? (
                          <select
                            value={order.situacao}
                            onChange={(e) =>
                              onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                            }
                            className={`text-[11px] font-bold px-2 py-1 rounded font-mono border cursor-pointer ${badge.bg} ${badge.text} ${badge.border} focus:outline-none`}
                            title="Alterar situação diretamente"
                          >
                            <option value="Em aberto" className="bg-[#14171C] text-white">
                              Em aberto
                            </option>
                            <option value="Em andamento" className="bg-[#14171C] text-white">
                              Em andamento
                            </option>
                            <option value="Aguardando peça" className="bg-[#14171C] text-white">
                              Aguardando peça
                            </option>
                            <option value="Concluído" className="bg-[#14171C] text-[#10B981] font-bold">
                              ✓ Concluído
                            </option>
                            <option value="Entregue" className="bg-[#14171C] text-white">
                              Entregue
                            </option>
                            <option value="Retornou com defeito" className="bg-[#14171C] text-white">
                              ⚠️ Retornou com defeito
                            </option>
                            <option value="Cancelado" className="bg-[#14171C] text-white">
                              Cancelado
                            </option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded font-mono border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {order.situacao}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[13px] text-white font-bold">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1.5 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {whatsappLink && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-colors cursor-pointer"
                              title="Avisar cliente via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Zap</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onPrintOrder(order)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded bg-[#E51D24] hover:bg-[#C81018] text-white transition-colors cursor-pointer shadow-xs"
                            title="Imprimir ordem de serviço"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditOrder(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-[#374151] text-[#D1D5DB] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit className="w-3.5 h-3.5" />
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
    </div>
  );
};
