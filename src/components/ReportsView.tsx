import React, { useState, useMemo } from 'react';
import { ServiceOrder, Client, ViewType, MaintenanceExpense, ExpenseCategory } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  ExternalLink,
  DollarSign,
  Package,
  Plus,
  Wrench,
  Trash2,
  Tag,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface ReportsViewProps {
  orders: ServiceOrder[];
  clients: Client[];
  expenses?: MaintenanceExpense[];
  onNavigate: (view: ViewType) => void;
  onEditOrder: (order: ServiceOrder) => void;
  onPrintOrder?: (order: ServiceOrder) => void;
  onAddExpense?: (data: Partial<MaintenanceExpense>) => Promise<void> | void;
  onDeleteExpense?: (id: string) => Promise<void> | void;
}

type PeriodFilter = '6m' | '12m' | '2026' | '2025' | 'all';
type MetricMode = 'financial' | 'orders';
type ChartType = 'bar' | 'area';

interface MonthlyStats {
  key: string; // "2026-09"
  label: string; // "Set/26"
  fullLabel: string; // "Setembro de 2026"
  year: number;
  month: number; // 0-11
  // Entradas
  qtdEntradas: number;
  valorEntradas: number;
  pecasEntradas: number;
  maoObraEntradas: number;
  ordersEntradas: ServiceOrder[];
  // Saídas
  qtdSaidas: number;
  valorSaidas: number;
  pecasSaidas: number;
  ordersSaidas: ServiceOrder[];
  // Custos gerais de manutenção do mês
  custoManutencaoGeral: number;
  despesasMes: MaintenanceExpense[];
  // Saldo
  saldoFinanceiro: number;
  saldoQtd: number;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  clients,
  expenses = [],
  onNavigate,
  onEditOrder,
  onPrintOrder,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('6m');
  const [metricMode, setMetricMode] = useState<MetricMode>('financial');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Maintenance expense form state
  const [expDescricao, setExpDescricao] = useState('');
  const [expCategoria, setExpCategoria] = useState<ExpenseCategory>('Peças & Componentes');
  const [expValor, setExpValor] = useState<number | ''>('');
  const [expMes, setExpMes] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expData, setExpData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  // Client lookup map
  const clientsMap = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of clients) {
      map.set(c.id, c);
    }
    return map;
  }, [clients]);

  // Aggregate monthly data
  const { allMonthlyStats, filteredStats, totals } = useMemo(() => {
    const map = new Map<string, MonthlyStats>();

    const getOrCreate = (d: Date): MonthlyStats => {
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${MONTH_SHORT[m]}/${String(y).slice(-2)}`,
          fullLabel: `${MONTH_NAMES[m]} de ${y}`,
          year: y,
          month: m,
          qtdEntradas: 0,
          valorEntradas: 0,
          pecasEntradas: 0,
          maoObraEntradas: 0,
          ordersEntradas: [],
          qtdSaidas: 0,
          valorSaidas: 0,
          pecasSaidas: 0,
          ordersSaidas: [],
          custoManutencaoGeral: 0,
          despesasMes: [],
          saldoFinanceiro: 0,
          saldoQtd: 0,
        });
      }
      return map.get(key)!;
    };

    // Process all orders
    for (const order of orders) {
      // Entrada
      if (order.entrada) {
        const dEntrada = new Date(order.entrada);
        if (!isNaN(dEntrada.getTime())) {
          const stats = getOrCreate(dEntrada);
          stats.qtdEntradas += 1;
          stats.valorEntradas += Number(order.valor || 0);
          stats.pecasEntradas += Number(order.pecas || 0);
          stats.maoObraEntradas += Number(order.maoObra || 0);
          stats.ordersEntradas.push(order);
        }
      }

      // Saída (either explicit saida date, or finished without explicit saida)
      const isOut = order.saida || order.situacao === 'Concluído';

      if (isOut) {
        const outDateStr = order.saida || order.createdAt || order.entrada;
        const dSaida = new Date(outDateStr);
        if (!isNaN(dSaida.getTime())) {
          const stats = getOrCreate(dSaida);
          stats.qtdSaidas += 1;
          stats.valorSaidas += Number(order.valor || 0);
          stats.pecasSaidas += Number(order.pecas || 0);
          stats.ordersSaidas.push(order);
        }
      }
    }

    // Process all maintenance expenses
    for (const exp of expenses) {
      const monthKey = exp.mes || (exp.data ? exp.data.slice(0, 7) : '');
      if (monthKey) {
        const [yearStr, monthStr] = monthKey.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          const dummyDate = new Date(y, m, 1);
          const stats = getOrCreate(dummyDate);
          stats.custoManutencaoGeral += Number(exp.valor) || 0;
          stats.despesasMes.push(exp);
        }
      }
    }

    // Convert map to sorted array - include months with orders or expenses
    const sorted = Array.from(map.values())
      .filter(
        (item) =>
          item.ordersEntradas.length > 0 ||
          item.ordersSaidas.length > 0 ||
          item.custoManutencaoGeral > 0
      )
      .sort((a, b) => a.key.localeCompare(b.key));

    // Calculate balances (Entradas - Peças de O.S. - Custo Geral de Manutenção do Mês)
    for (const item of sorted) {
      item.saldoFinanceiro = item.valorEntradas - item.pecasSaidas - item.custoManutencaoGeral;
      item.saldoQtd = item.qtdEntradas - item.qtdSaidas;
    }

    // Apply period filter
    let filtered = [...sorted];

    if (period === '6m') {
      filtered = sorted.slice(-6);
    } else if (period === '12m') {
      filtered = sorted.slice(-12);
    } else if (period === '2026') {
      filtered = sorted.filter((s) => s.year === 2026);
    } else if (period === '2025') {
      filtered = sorted.filter((s) => s.year === 2025);
    }

    // Compute totals for filtered period
    const t = filtered.reduce(
      (acc, curr) => {
        acc.totalEntradas += curr.valorEntradas;
        acc.totalSaidas += curr.valorSaidas;
        acc.totalPecas += curr.pecasSaidas;
        acc.totalCustoGeralManutencao += curr.custoManutencaoGeral;
        acc.totalQtdEntradas += curr.qtdEntradas;
        acc.totalQtdSaidas += curr.qtdSaidas;
        return acc;
      },
      {
        totalEntradas: 0,
        totalSaidas: 0,
        totalPecas: 0,
        totalCustoGeralManutencao: 0,
        totalQtdEntradas: 0,
        totalQtdSaidas: 0,
      }
    );

    const saldoPeriodo = t.totalEntradas - t.totalPecas - t.totalCustoGeralManutencao;
    const ticketMedio = t.totalQtdEntradas > 0 ? t.totalEntradas / t.totalQtdEntradas : 0;

    return {
      allMonthlyStats: sorted,
      filteredStats: filtered,
      totals: {
        ...t,
        saldoPeriodo,
        ticketMedio,
      },
    };
  }, [orders, expenses, period]);

  // Handle adding an expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescricao.trim()) {
      alert('Informe a descrição do custo de manutenção.');
      return;
    }
    const valorNum = Number(expValor);
    if (!valorNum || valorNum <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    setIsAddingExpense(true);
    try {
      if (onAddExpense) {
        await onAddExpense({
          descricao: expDescricao.trim(),
          categoria: expCategoria,
          valor: valorNum,
          mes: expMes,
          data: expData || new Date().toISOString().split('T')[0],
        });
      }
      setExpDescricao('');
      setExpValor('');
      setExpenseSuccessMsg('Custo de manutenção registrado com sucesso!');
      setTimeout(() => setExpenseSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao registrar custo de manutenção.');
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Chart data format
  const chartData = useMemo(() => {
    return filteredStats.map((item) => {
      return {
        key: item.key,
        name: item.label,
        fullLabel: item.fullLabel,
        // Financeiro
        Entrou: item.valorEntradas,
        Saiu: item.valorSaidas,
        'Custo Manutenção': item.pecasSaidas + item.custoManutencaoGeral,
        'Saldo Líquido': item.saldoFinanceiro,
        // Quantidades
        'O.S. Entraram': item.qtdEntradas,
        'O.S. Saíram': item.qtdSaidas,
        'Saldo O.S.': item.qtdEntradas - item.qtdSaidas,
      };
    });
  }, [filteredStats]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#14171C] p-5 rounded-2xl border border-[#22262E] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E51D24]/10 border border-[#E51D24]/30 flex items-center justify-center text-[#E51D24]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Gráficos &amp; Fluxo Mensal
              </h1>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Demonstrativo de quanto entrou, quanto saiu e custos gerais de manutenção mês a mês.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="inline-flex items-center rounded-lg bg-[#0E1014] p-1 border border-[#22262E]">
            <button
              id="filter-period-6m"
              type="button"
              onClick={() => setPeriod('6m')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === '6m' ? 'bg-[#E51D24] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              6 Meses
            </button>
            <button
              id="filter-period-12m"
              type="button"
              onClick={() => setPeriod('12m')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === '12m' ? 'bg-[#E51D24] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              12 Meses
            </button>
            <button
              id="filter-period-2026"
              type="button"
              onClick={() => setPeriod('2026')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === '2026' ? 'bg-[#E51D24] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              2026
            </button>
            <button
              id="filter-period-all"
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === 'all' ? 'bg-[#E51D24] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Metric Selector */}
          <div className="inline-flex items-center rounded-lg bg-[#0E1014] p-1 border border-[#22262E]">
            <button
              id="metric-financial"
              type="button"
              onClick={() => setMetricMode('financial')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                metricMode === 'financial' ? 'bg-[#10B981] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
              title="Valores Financeiros em Reais"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Valores (R$)</span>
            </button>
            <button
              id="metric-orders"
              type="button"
              onClick={() => setMetricMode('orders')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                metricMode === 'orders' ? 'bg-[#6366F1] text-white shadow-xs' : 'text-[#9CA3AF] hover:text-white'
              }`}
              title="Quantidade de Ordens de Serviço"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Quantidades</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Quanto Entrou */}
        <div className="bg-[#14171C] p-3.5 sm:p-5 rounded-xl border border-[#22262E] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/5 rounded-bl-full pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Total Entrou</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 self-start sm:self-auto">
              {totals.totalQtdEntradas} O.S.
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {formatCurrency(totals.totalEntradas)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 truncate">
              Faturamento no período
            </p>
          </div>
        </div>

        {/* Card 2: Quanto Saiu */}
        <div className="bg-[#14171C] p-3.5 sm:p-5 rounded-xl border border-[#22262E] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E51D24]/5 rounded-bl-full pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#E51D24] flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Total Saiu</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E51D24]/15 text-[#FF6B6B] border border-[#E51D24]/30 self-start sm:self-auto">
              {totals.totalQtdSaidas} O.S.
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {formatCurrency(totals.totalSaidas)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 truncate">
              Entregues ao cliente
            </p>
          </div>
        </div>

        {/* Card 3: Custo Geral em Manutenções */}
        <div className="bg-[#14171C] p-3.5 sm:p-5 rounded-xl border border-[#22262E] shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Custos Bancada</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
              Geral &amp; Peças
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
              {formatCurrency(totals.totalPecas + totals.totalCustoGeralManutencao)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 truncate">
              {formatCurrency(totals.totalCustoGeralManutencao)} em insumos
            </p>
          </div>
        </div>

        {/* Card 4: Saldo Líquido Real */}
        <div className="bg-[#14171C] p-3.5 sm:p-5 rounded-xl border border-[#22262E] shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981] shrink-0" />
              <span>Saldo Líquido</span>
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border self-start sm:self-auto ${
                totals.saldoPeriodo >= 0
                  ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30'
                  : 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
              }`}
            >
              {totals.saldoPeriodo >= 0 ? '+ Positivo' : '- Déficit'}
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                totals.saldoPeriodo >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {formatCurrency(totals.saldoPeriodo)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-1 truncate">
              Líquido deduzido custos
            </p>
          </div>
        </div>
      </div>

      {/* ÁREA DEDICADA: CUSTO GERAL DO MÊS EM MANUTENÇÕES & BANCADA (Exigência do Usuário) */}
      <div className="bg-[#14171C] rounded-2xl border border-amber-500/30 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22262E] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Custo da Manutenção ou Custo Geral do Mês</span>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                  Lançamento de Despesas
                </span>
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Cadastre os gastos da loja com peças, insumos de bancada, ferramentas e custo geral de manutenções do mês.
              </p>
            </div>
          </div>

          {expenseSuccessMsg && (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{expenseSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Formulário Rápido de Adição de Custo */}
        <form onSubmit={handleCreateExpense} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-white mb-1">
              Descrição do Custo / Manutenção <span className="text-[#E51D24]">*</span>
            </label>
            <input
              type="text"
              required
              value={expDescricao}
              onChange={(e) => setExpDescricao(e.target.value)}
              placeholder="Ex: Lote de pasta térmica Arctic, conectores HDMI PS5, troca de tela"
              className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded-lg text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-white mb-1">Categoria</label>
            <select
              value={expCategoria}
              onChange={(e) => setExpCategoria(e.target.value as ExpenseCategory)}
              className="w-full px-2.5 py-2 bg-[#101216] border border-[#22262E] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Peças & Componentes">Peças &amp; Componentes</option>
              <option value="Insumos & Ferramental">Insumos &amp; Ferramental</option>
              <option value="Custo Geral de Manutenção">Custo Geral de Manutenção</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-white mb-1">Mês de Competência</label>
            <input
              type="month"
              required
              value={expMes}
              onChange={(e) => setExpMes(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#101216] border border-[#22262E] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-amber-400 mb-1">
              Valor do Custo (R$) <span className="text-[#E51D24]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={expValor}
              onChange={(e) => setExpValor(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded-lg text-xs font-mono font-bold text-amber-400 placeholder-[#6B7280] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAddingExpense}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingExpense ? 'Salvando...' : 'Lançar Custo'}</span>
            </button>
          </div>
        </form>

        {/* Lista de Custos Registrados */}
        {expenses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#22262E]">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] mb-2 font-mono">
              <span>Despesas de manutenção registradas ({expenses.length})</span>
              <span>Total: {formatCurrency(expenses.reduce((acc, x) => acc + (Number(x.valor) || 0), 0))}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {expenses
                .slice()
                .reverse()
                .map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 rounded-lg bg-[#101216] border border-[#22262E] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono bg-[#1C2028] px-1.5 py-0.5 rounded text-[#D1D5DB] border border-[#2D323C]">
                          {exp.mes || exp.data?.slice(0, 7)}
                        </span>
                        <span className="text-[10px] text-amber-400/90 font-semibold truncate">
                          {exp.categoria}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate mt-0.5">{exp.descricao}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-amber-400">
                        {formatCurrency(exp.valor)}
                      </span>
                      {onDeleteExpense && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir custo "${exp.descricao}"?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1 rounded text-[#9CA3AF] hover:text-[#EF4444] transition-colors cursor-pointer"
                          title="Excluir custo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Chart Card */}
      <div className="bg-[#14171C] p-6 rounded-2xl border border-[#22262E] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#22262E] gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {metricMode === 'financial' ? (
                <>
                  <DollarSign className="w-4 h-4 text-[#10B981]" />
                  <span>Comparativo Mensal de Valores (Entradas, Saídas e Custos de Manutenção)</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 text-[#6366F1]" />
                  <span>Fluxo Mensal de Equipamentos (Entradas vs Entregas)</span>
                </>
              )}
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Visualização temporal mês a mês com separação clara de fluxo e lucratividade real.
            </p>
          </div>

          {/* Chart Type Toggle (Bar vs Area) */}
          <div className="inline-flex items-center rounded-lg bg-[#0E1014] p-1 border border-[#22262E] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                chartType === 'bar' ? 'bg-[#1C2028] text-white border border-[#2D323C]' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Barras
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                chartType === 'area' ? 'bg-[#1C2028] text-white border border-[#2D323C]' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Linhas / Área
            </button>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-[340px] w-full mt-6">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#9CA3AF]">
              <div className="w-12 h-12 rounded-full bg-[#1C2028] flex items-center justify-center text-[#6B7280] mb-3">
                <BarChart3 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Nenhum dado real registrado ainda</p>
              <p className="text-xs text-[#9CA3AF] max-w-sm mt-1">
                Cadastre suas ordens de serviço e custos de manutenção para ver o comparativo automático de fluxo.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('os-form')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#E51D24] hover:bg-[#C81018] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Nova Ordem</span>
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22262E" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#22262E' }} />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#22262E' }}
                    tickFormatter={(val) => (metricMode === 'financial' ? `R$ ${val}` : `${val} un`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dataItem = payload[0].payload;
                      return (
                        <div className="bg-[#14171C] border border-[#2D323C] p-3.5 rounded-xl shadow-xl text-xs font-sans">
                          <div className="font-bold text-white mb-2 pb-1 border-b border-[#22262E]">
                            {dataItem.fullLabel}
                          </div>
                          <div className="space-y-1.5">
                            {payload.map((entry, idx) => (
                              <div key={`tooltip-${idx}`} className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  {entry.name}:
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {metricMode === 'financial' ? formatCurrency(Number(entry.value)) : `${entry.value} O.S.`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => <span className="text-xs font-semibold text-[#D1D5DB]">{value}</span>}
                  />
                  {metricMode === 'financial' ? (
                    <>
                      <Bar dataKey="Entrou" fill="#10B981" radius={[4, 4, 0, 0]} name="Entrou (Faturamento)" />
                      <Bar dataKey="Saiu" fill="#E51D24" radius={[4, 4, 0, 0]} name="Saiu (Concluído)" />
                      <Bar dataKey="Custo Manutenção" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Custos Manutenção & Peças" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="O.S. Entraram" fill="#10B981" radius={[4, 4, 0, 0]} name="Equipamentos que Entraram" />
                      <Bar dataKey="O.S. Saíram" fill="#6366F1" radius={[4, 4, 0, 0]} name="Equipamentos Concluídos" />
                    </>
                  )}
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEntrou" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSaiu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E51D24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E51D24" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22262E" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#22262E' }} />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#22262E' }}
                    tickFormatter={(val) => (metricMode === 'financial' ? `R$ ${val}` : `${val} un`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dataItem = payload[0].payload;
                      return (
                        <div className="bg-[#14171C] border border-[#2D323C] p-3.5 rounded-xl shadow-xl text-xs font-sans">
                          <div className="font-bold text-white mb-2 pb-1 border-b border-[#22262E]">
                            {dataItem.fullLabel}
                          </div>
                          <div className="space-y-1.5">
                            {payload.map((entry, idx) => (
                              <div key={`tooltip-area-${idx}`} className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  {entry.name}:
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {metricMode === 'financial' ? formatCurrency(Number(entry.value)) : `${entry.value} O.S.`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => <span className="text-xs font-semibold text-[#D1D5DB]">{value}</span>}
                  />
                  {metricMode === 'financial' ? (
                    <>
                      <Area type="monotone" dataKey="Entrou" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntrou)" name="Entrou (Faturamento)" />
                      <Area type="monotone" dataKey="Saiu" stroke="#E51D24" strokeWidth={2} fillOpacity={1} fill="url(#colorSaiu)" name="Saiu (Concluído)" />
                      <Area type="monotone" dataKey="Custo Manutenção" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorCustos)" name="Custos Manutenção" />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="O.S. Entraram" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntrou)" name="Equipamentos que Entraram" />
                      <Area type="monotone" dataKey="O.S. Saíram" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorEntrou)" name="Equipamentos Concluídos" />
                    </>
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly Breakdown Table with Accordion Detail */}
      <div className="bg-[#14171C] rounded-2xl border border-[#22262E] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#22262E] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E51D24]" />
              Detalhamento Mês a Mês
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Clique em qualquer mês para ver as ordens de serviço e despesas correspondentes
            </p>
          </div>
          <span className="text-xs text-[#9CA3AF] font-mono">
            {filteredStats.length} {filteredStats.length === 1 ? 'mês' : 'meses'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredStats.length === 0 ? (
            <div className="p-12 text-center text-[#9CA3AF]">
              <Calendar className="w-10 h-10 text-[#4B5563] mx-auto mb-3" />
              <p className="text-sm font-bold text-white">Nenhum dado real registrado neste período</p>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto mt-1">
                A tabela e os gráficos exibem exclusivamente dados reais cadastrados. Assim que você cadastrar ordens ou custos de manutenção, os meses serão detalhados aqui.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('os-form')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#E51D24] hover:bg-[#C81018] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Nova O.S.</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0E1014] border-b border-[#22262E] text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  <th className="py-3 px-4">Mês / Ano</th>
                  <th className="py-3 px-4">Entradas (O.S.)</th>
                  <th className="py-3 px-4">Valor que Entrou</th>
                  <th className="py-3 px-4">Saídas (Concluídas)</th>
                  <th className="py-3 px-4">Valor que Saiu</th>
                  <th className="py-3 px-4">Custos Manutenção</th>
                  <th className="py-3 px-4">Saldo do Mês</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262E] text-xs">
                {filteredStats
                  .slice()
                  .reverse()
                  .map((item) => {
                    const isExpanded = expandedMonth === item.key;
                    const saldoMes = item.saldoFinanceiro;

                    return (
                      <React.Fragment key={item.key}>
                        <tr
                          onClick={() => setExpandedMonth(isExpanded ? null : item.key)}
                          className={`hover:bg-[#1C2028] transition-colors cursor-pointer ${
                            isExpanded ? 'bg-[#1C2028]/70' : ''
                          }`}
                        >
                          {/* Month Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{item.fullLabel}</span>
                              <span className="text-[10px] font-mono text-[#6B7280]">({item.key})</span>
                            </div>
                          </td>

                          {/* Qtd Entradas */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#34D399] font-mono font-semibold text-[11px] border border-[#10B981]/25">
                              <ArrowDownLeft className="w-3 h-3" />
                              {item.qtdEntradas} {item.qtdEntradas === 1 ? 'ordem' : 'ordens'}
                            </span>
                          </td>

                          {/* Valor Entradas */}
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {formatCurrency(item.valorEntradas)}
                          </td>

                          {/* Qtd Saídas */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E51D24]/10 text-[#FF6B6B] font-mono font-semibold text-[11px] border border-[#E51D24]/25">
                              <ArrowUpRight className="w-3 h-3" />
                              {item.qtdSaidas} {item.qtdSaidas === 1 ? 'saída' : 'saídas'}
                            </span>
                          </td>

                          {/* Valor Saídas */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-[#D1D5DB]">
                            {formatCurrency(item.valorSaidas)}
                          </td>

                          {/* Custos de Manutenção do Mês */}
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {formatCurrency(item.pecasSaidas + item.custoManutencaoGeral)}
                          </td>

                          {/* Saldo Líquido */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-mono font-bold ${
                                saldoMes >= 0 ? 'text-[#34D399]' : 'text-[#EF4444]'
                              }`}
                            >
                              {formatCurrency(saldoMes)}
                            </span>
                          </td>

                          {/* Expand Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedMonth(isExpanded ? null : item.key);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#14171C] hover:bg-[#252B36] border border-[#2D323C] text-[11px] font-semibold text-[#D1D5DB] transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? 'Ocultar' : 'Ver O.S.'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Accordion Detail: List of Orders and Expenses of this Month */}
                        {isExpanded && (
                          <tr className="bg-[#0B0C0E]/70 border-b border-[#22262E]">
                            <td colSpan={8} className="p-4">
                              <div className="bg-[#14171C] p-4 rounded-xl border border-[#22262E] space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-[#22262E]">
                                  <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-[#E51D24]" />
                                    Ordens de Serviço e Custos de Manutenção em {item.fullLabel}
                                  </span>
                                  <span className="text-[11px] text-[#9CA3AF]">
                                    {item.ordersEntradas.length} entradas • {item.ordersSaidas.length} saídas • {item.despesasMes.length} custos adicionais
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Coluna 1: Entradas do Mês */}
                                  <div>
                                    <div className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <ArrowDownLeft className="w-3.5 h-3.5" />
                                      Entradas ({item.ordersEntradas.length})
                                    </div>
                                    <div className="space-y-2">
                                      {item.ordersEntradas.length === 0 ? (
                                        <p className="text-xs text-[#6B7280] italic p-3 bg-[#0E1014] rounded-lg border border-[#22262E]">
                                          Nenhuma ordem recebida neste mês.
                                        </p>
                                      ) : (
                                        item.ordersEntradas.map((order) => {
                                          const client = clientsMap.get(order.clienteId);
                                          return (
                                            <div
                                              key={`ent-${order.id}`}
                                              onClick={() => onEditOrder(order)}
                                              className="p-3 rounded-lg bg-[#0E1014] border border-[#22262E] hover:border-[#10B981]/50 transition-colors cursor-pointer group"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-xs text-white group-hover:text-[#10B981] transition-colors">
                                                  O.S. #{order.numero}
                                                </span>
                                                <span className="font-mono font-bold text-xs text-[#34D399]">
                                                  {formatCurrency(order.valor)}
                                                </span>
                                              </div>
                                              <div className="text-xs text-[#D1D5DB] font-medium mt-1">
                                                {order.equipamento}
                                              </div>
                                              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] mt-1.5">
                                                <span>
                                                  Cliente:{' '}
                                                  {(client?.nome || '—').toUpperCase()}
                                                </span>
                                                <span>Entrada: {formatDateTime(order.entrada)}</span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>

                                  {/* Coluna 2: Saídas do Mês */}
                                  <div>
                                    <div className="text-[11px] font-bold text-[#E51D24] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                      Saídas / Concluídas ({item.ordersSaidas.length})
                                    </div>
                                    <div className="space-y-2">
                                      {item.ordersSaidas.length === 0 ? (
                                        <div className="text-xs text-[#6B7280] italic p-3 bg-[#0E1014] rounded-lg border border-[#22262E]">
                                          Nenhum equipamento finalizado neste mês.
                                        </div>
                                      ) : (
                                        item.ordersSaidas.map((order) => {
                                          const client = clientsMap.get(order.clienteId);
                                          return (
                                            <div
                                              key={`sai-${order.id}`}
                                              onClick={() => onEditOrder(order)}
                                              className="p-3 rounded-lg bg-[#0E1014] border border-[#22262E] hover:border-[#E51D24]/50 transition-colors cursor-pointer group"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-xs text-white group-hover:text-[#E51D24] transition-colors">
                                                  O.S. #{order.numero}
                                                </span>
                                                <span className="font-mono font-bold text-xs text-[#FF6B6B]">
                                                  {formatCurrency(order.valor)}
                                                </span>
                                              </div>
                                              <div className="text-xs text-[#D1D5DB] font-medium mt-1">
                                                {order.equipamento}
                                              </div>
                                              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] mt-1.5">
                                                <span>
                                                  Cliente:{' '}
                                                  {(client?.nome || '—').toUpperCase()}
                                                </span>
                                                <span>
                                                  Saída:{' '}
                                                  {order.saida
                                                    ? formatDateTime(order.saida)
                                                    : 'Concluído'}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
