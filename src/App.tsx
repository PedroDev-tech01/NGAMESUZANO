/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Client, ServiceOrder, ViewType, OrderStatus, MaintenanceExpense, AuthUser, StatusHistoryEntry } from './types';
import { INITIAL_CLIENTS, INITIAL_ORDERS } from './data/initialData';
import { uid, onlyDigits } from './utils/formatters';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { OrdersListView } from './components/OrdersListView';
import { OrderFormView } from './components/OrderFormView';
import { ClientsListView } from './components/ClientsListView';
import { ClientFormView } from './components/ClientFormView';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';
import { OrderPrintModal } from './components/OrderPrintModal';
import { PrintStandaloneView } from './components/PrintStandaloneView';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ServerStatusModal } from './components/ServerStatusModal';
import { ThemeToggle } from './components/ThemeToggle';
import { ReportsView } from './components/ReportsView';
import { LoginView } from './components/LoginView';
import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, Zap, Search, Server, Menu, LogOut, LayoutDashboard, FileText, PlusCircle, Users, BarChart3, Plus } from 'lucide-react';

const STORAGE_KEYS = {
  CLIENTS: 'ngames_clients_v1',
  ORDERS: 'ngames_orders_v1',
  SEQ: 'ngames_order_seq_v1',
  THEME: 'ngames_theme',
  EXPENSES: 'ngames_expenses_v1',
};

export default function App() {
  // Navigation
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<ServiceOrder | null>(null);
  const [autoWhatsAppOnOpen, setAutoWhatsAppOnOpen] = useState(false);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('ngames_auth_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  const handleLoginSuccess = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ngames_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ngames_auth_user');
    } catch {
      // ignore
    }
    api.logout();
  }, []);

  // Theme mode: dark | light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('ngames_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const toggleTheme = useCallback((targetTheme?: 'dark' | 'light') => {
    setTheme((prev) => {
      const next = targetTheme ? targetTheme : prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ngames_theme', next);
      } catch {
        // ignore
      }
      if (next === 'light') {
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
      }
      return next;
    });
  }, []);

  // Sync theme to document element on mount and change
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
    }
  }, [theme]);

  const [standalonePrintOrderId, setStandalonePrintOrderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('print') || params.get('orderId') || params.get('os');
  });

  // Fictitious mock IDs to strip out
  const FICTITIOUS_CLIENT_IDS = new Set(['cli-1', 'cli-2', 'cli-3', 'cli-4']);
  const FICTITIOUS_ORDER_IDS = new Set([
    'ord-1', 'ord-2', 'ord-3', 'ord-4',
    'ord-hist-1', 'ord-hist-2', 'ord-hist-3', 'ord-hist-4',
    'ord-hist-5', 'ord-hist-6', 'ord-hist-7', 'ord-hist-8'
  ]);

  // Clients state - real data only
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: Client) => !FICTITIOUS_CLIENT_IDS.has(c.id));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_CLIENTS;
  });

  // Orders state - real data only
  const [orders, setOrders] = useState<ServiceOrder[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (o: ServiceOrder) => !FICTITIOUS_ORDER_IDS.has(o.id) && !FICTITIOUS_CLIENT_IDS.has(o.clienteId)
          );
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ORDERS;
  });

  // Next Order Sequence Number
  const [nextOrderSeq, setNextOrderSeq] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEQ);
      if (stored) return parseInt(stored, 10);
    } catch {
      // ignore
    }
    return 150001;
  });

  // Auto-fetch order if requested via standalone print link and not yet in memory
  useEffect(() => {
    if (
      standalonePrintOrderId &&
      !orders.some((o) => o.id === standalonePrintOrderId || String(o.numero) === standalonePrintOrderId)
    ) {
      api
        .getOrderById(standalonePrintOrderId)
        .then((fetched) => {
          if (fetched) {
            setOrders((prev) => (prev.some((o) => o.id === fetched.id) ? prev : [fetched, ...prev]));
          }
        })
        .catch((err) => {
          console.warn('Could not load standalone order:', err);
        });
    }
  }, [standalonePrintOrderId, orders]);

  // Maintenance Expenses state
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<MaintenanceExpense[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2600);
  }, []);

  // Sync to backend on mount & periodic heartbeat
  const syncWithServer = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      if (Array.isArray(data.clients)) {
        setClients(data.clients.filter((c: Client) => !FICTITIOUS_CLIENT_IDS.has(c.id)));
      }
      if (Array.isArray(data.orders)) {
        setOrders(
          data.orders.filter(
            (o: ServiceOrder) => !FICTITIOUS_ORDER_IDS.has(o.id) && !FICTITIOUS_CLIENT_IDS.has(o.clienteId)
          )
        );
      }
      if (Array.isArray(data.maintenanceExpenses)) {
        setMaintenanceExpenses(data.maintenanceExpenses);
      }
      if (typeof data.nextOrderSeq === 'number') setNextOrderSeq(data.nextOrderSeq);
      setIsServerOnline(true);
    } catch (err) {
      console.warn('Backend server offline or unreachable, using local data:', err);
      setIsServerOnline(false);
    }
  }, []);

  useEffect(() => {
    syncWithServer();

    // Heartbeat check every 25 seconds
    const interval = setInterval(async () => {
      try {
        await api.getHealth();
        setIsServerOnline(true);
      } catch {
        setIsServerOnline(false);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Sync to localStorage as offline cache fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch {
      // ignore
    }
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEQ, nextOrderSeq.toString());
    } catch {
      // ignore
    }
  }, [nextOrderSeq]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(maintenanceExpenses));
    } catch {
      // ignore
    }
  }, [maintenanceExpenses]);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'order' | 'client';
    id: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'order',
    id: '',
    title: '',
    message: '',
  });

  // Navigation handler
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);

  const handleNavigate = (view: ViewType) => {
    if (view === 'os-form') {
      setEditingOrderId(null);
    }
    if (view === 'cliente-form') {
      setEditingClientId(null);
    }
    if (view !== 'os-form') {
      setPreselectedClientId(null);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick Filter Navigation from Dashboard
  const handleFilterStatus = (status: string) => {
    setOrdersStatusFilter(status);
    setCurrentView('ordens');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Inline Quick Status Update for orders
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.situacao === newStatus) return;

    const willBeFinished = newStatus === 'Concluído' && !target?.saida;
    const isReopening = newStatus === 'Retornou com defeito' || newStatus === 'Em aberto' || newStatus === 'Em andamento';
    const nowIso = new Date().toISOString();

    const newHistoryEntry: StatusHistoryEntry = {
      id: uid(),
      de: target.situacao,
      para: newStatus,
      data: nowIso,
      observacao: newStatus === 'Concluído' ? 'Serviço concluído' : undefined,
    };

    const updatedHistory: StatusHistoryEntry[] = [
      ...(target.historicoStatus && target.historicoStatus.length > 0
        ? target.historicoStatus
        : [
            {
              id: `init-${target.id}`,
              de: 'Criada',
              para: target.situacao,
              data: target.entrada || target.createdAt || nowIso,
              observacao: 'Abertura da O.S.',
            },
          ]),
      newHistoryEntry,
    ];

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          situacao: newStatus,
          saida: willBeFinished ? nowIso : (isReopening ? undefined : o.saida),
          retornoAt: newStatus === 'Retornou com defeito' ? (o.retornoAt || nowIso) : o.retornoAt,
          historicoStatus: updatedHistory,
        };
      })
    );

    showToast(`O.S. #${target ? target.numero : ''} atualizada para "${newStatus}"!`);

    // Sync to server
    try {
      await api.updateOrderStatus(orderId, newStatus, {
        historicoStatus: updatedHistory,
        saida: willBeFinished ? nowIso : (isReopening ? undefined : target.saida),
        retornoAt: newStatus === 'Retornou com defeito' ? (target.retornoAt || nowIso) : target.retornoAt,
      });
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to sync status change to server:', err);
    }
  };

  // Inline Quick Prazo (Deadline) Update for orders
  const handleUpdateOrderPrazo = async (orderId: string, newPrazo: string | null) => {
    const target = orders.find((o) => o.id === orderId);

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          prazo: newPrazo || undefined,
        };
      })
    );

    // Sync to server
    try {
      await api.updateOrderPrazo(orderId, newPrazo);
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to sync prazo change to server:', err);
      syncWithServer();
    }
  };

  // Inline Quick Retirada (Pickup/Handover to Client) for orders
  const handleUpdateOrderRetirada = async (orderId: string, customDate?: string | null) => {
    const target = orders.find((o) => o.id === orderId);
    const nowIso = customDate !== undefined ? (customDate ? customDate : undefined) : new Date().toISOString();

    const newHistoryEntry: StatusHistoryEntry = {
      id: uid(),
      de: target?.situacao || 'Concluído',
      para: 'Concluído',
      data: nowIso || new Date().toISOString(),
      observacao: nowIso
        ? 'Equipamento retirado pelo cliente (Garantia legal de 90 dias ativada)'
        : 'Registro de retirada da O.S. desmarcado',
    };

    const updatedHistory: StatusHistoryEntry[] = [
      ...(target?.historicoStatus && target.historicoStatus.length > 0
        ? target.historicoStatus
        : target
        ? [
            {
              id: `init-${target.id}`,
              de: 'Criada',
              para: target.situacao,
              data: target.entrada || target.createdAt || new Date().toISOString(),
              observacao: 'Abertura da O.S.',
            },
          ]
        : []),
      newHistoryEntry,
    ];

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          situacao: 'Concluído',
          saida: o.saida || nowIso || new Date().toISOString(),
          dataRetirada: nowIso,
          historicoStatus: updatedHistory,
        };
      })
    );

    showToast(
      nowIso
        ? `Retirada da O.S. #${target?.numero} registrada! Garantia legal de 90 dias ativada.`
        : `Registro de retirada da O.S. #${target?.numero} desmarcado.`
    );

    // Sync to server
    try {
      await api.updateOrderRetirada(orderId, nowIso);
      await api.updateOrder(orderId, { historicoStatus: updatedHistory });
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to sync retirada to server:', err);
      syncWithServer();
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;

      // Escape closes modals
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isServerModalOpen) {
          setIsServerModalOpen(false);
          return;
        }
        if (printingOrder) {
          setPrintingOrder(null);
          return;
        }
        if (confirmModal.isOpen) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          return;
        }
        return;
      }

      // Ctrl + K or '/' for search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNavigate('os-form');
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleNavigate('cliente-form');
      } else if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleNavigate('dashboard');
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleNavigate('ordens');
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleNavigate('clientes');
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleNavigate('relatorios');
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isServerModalOpen, printingOrder, confirmModal.isOpen]);

  // Print & WhatsApp PDF for Order
  const handlePrintOrder = (order: ServiceOrder, autoWhatsApp: boolean = false) => {
    setAutoWhatsAppOnOpen(autoWhatsApp);
    setPrintingOrder(order);
  };

  // Edit Order
  const handleEditOrder = (orderId: string) => {
    setEditingOrderId(orderId);
    setCurrentView('os-form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Order
  const handleSaveOrder = async (
    orderData: Partial<ServiceOrder>,
    nextAction: 'view' | 'whatsapp' | 'print' = 'view'
  ) => {
    let savedOrder: ServiceOrder | null = null;

    if (editingOrderId) {
      const existing = orders.find((o) => o.id === editingOrderId);
      let updatedHistory = existing?.historicoStatus || [];
      if (existing && orderData.situacao && orderData.situacao !== existing.situacao) {
        const newHistoryEntry: StatusHistoryEntry = {
          id: uid(),
          de: existing.situacao,
          para: orderData.situacao,
          data: new Date().toISOString(),
          observacao: orderData.motivoRetorno || (orderData.situacao === 'Concluído' ? 'Serviço concluído' : undefined),
        };
        updatedHistory = [
          ...(updatedHistory.length > 0
            ? updatedHistory
            : [
                {
                  id: `init-${existing.id}`,
                  de: 'Criada',
                  para: existing.situacao,
                  data: existing.entrada || existing.createdAt || new Date().toISOString(),
                  observacao: 'Abertura da O.S.',
                },
              ]),
          newHistoryEntry,
        ];
        orderData.historicoStatus = updatedHistory;
      }

      savedOrder = {
        ...(existing || {}),
        ...orderData,
        historicoStatus: updatedHistory.length > 0 ? updatedHistory : existing?.historicoStatus,
        valor: orderData.valor !== undefined ? Number(orderData.valor) : (existing?.valor ?? 0),
      } as ServiceOrder;

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === editingOrderId ? savedOrder! : o))
      );
      showToast('Ordem de serviço atualizada com sucesso.');

      try {
        const updated = await api.updateOrder(editingOrderId, orderData);
        savedOrder = updated;
        setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? updated : o)));
        setIsServerOnline(true);
      } catch (err) {
        console.error('Failed to update order on server:', err);
      }
    } else {
      const clientTempNumber = nextOrderSeq;
      const exactCreationTime = new Date().toISOString();

      const initialHistory: StatusHistoryEntry[] = [
        {
          id: uid(),
          de: 'Criada',
          para: orderData.situacao || 'Em aberto',
          data: exactCreationTime,
          observacao: 'Abertura da Ordem de Serviço',
        },
      ];

      // Optimistic create
      const newOrderLocal: ServiceOrder = {
        id: uid(),
        numero: clientTempNumber,
        clienteId: orderData.clienteId!,
        situacao: orderData.situacao || 'Em aberto',
        canal: orderData.canal || 'Presencial',
        entrada: exactCreationTime, // Automático exatamente no momento da criação
        saida: orderData.saida,
        equipamento: orderData.equipamento || '',
        marca: orderData.marca,
        modelo: orderData.modelo,
        serie: orderData.serie,
        defeito: orderData.defeito,
        solucao: orderData.solucao,
        valor: orderData.valor !== undefined ? Number(orderData.valor) : 0,
        obs: orderData.obs,
        createdAt: exactCreationTime,
        retornoAt: orderData.situacao === 'Retornou com defeito' ? exactCreationTime : undefined,
        historicoStatus: initialHistory,
      };

      savedOrder = newOrderLocal;
      setOrders((prev) => [newOrderLocal, ...prev]);
      setNextOrderSeq((prev) => prev + 1);
      showToast(`Ordem de serviço #${clientTempNumber} cadastrada!`);

      // Server create
      try {
        const created = await api.createOrder({
          ...orderData,
          entrada: exactCreationTime,
          historicoStatus: initialHistory,
        });
        savedOrder = created;
        // Replace local optimistic item with server item
        setOrders((prev) => prev.map((o) => (o.id === newOrderLocal.id ? created : o)));
        setNextOrderSeq((prev) => Math.max(prev, created.numero + 1));
        setIsServerOnline(true);
      } catch (err) {
        console.error('Failed to create order on server:', err);
      }
    }

    setEditingOrderId(null);
    setCurrentView('ordens');

    if (savedOrder && nextAction === 'whatsapp') {
      setAutoWhatsAppOnOpen(true);
      setPrintingOrder(savedOrder);
    } else if (savedOrder && nextAction === 'print') {
      setAutoWhatsAppOnOpen(false);
      setPrintingOrder(savedOrder);
    }
  };

  // Delete Order Prompt
  const handleDeleteOrderPrompt = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    setConfirmModal({
      isOpen: true,
      type: 'order',
      id: orderId,
      title: 'Excluir ordem de serviço?',
      message: `Tem certeza que deseja excluir a O.S. #${order ? order.numero : ''}? Esta ação não pode ser desfeita.`,
    });
  };

  // Edit Client
  const handleEditClient = (clientId: string) => {
    setEditingClientId(clientId);
    setCurrentView('cliente-form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Client
  const handleSaveClient = async (clientData: Partial<Client>, andGoToOrder = false) => {
    const nomeUpper = (clientData.nome || '').toUpperCase();
    const cleanCpf = onlyDigits(clientData.cpf || '');
    const canonicalId = `cpf-${cleanCpf}`;

    // Check duplicate CPF - CPF is unique identifier
    const duplicate = clients.find(
      (c) => (!editingClientId || c.id !== editingClientId) && onlyDigits(c.cpf) === cleanCpf
    );
    if (duplicate) {
      showToast(`Atenção: Já existe um cadastro com este CPF (${duplicate.nome}).`);
      return;
    }

    let savedClientId = editingClientId;

    if (editingClientId) {
      setClients((prev) =>
        prev.map((c) => (c.id === editingClientId ? ({ ...c, ...clientData, nome: nomeUpper } as Client) : c))
      );
      showToast('Cliente atualizado com sucesso.');

      try {
        const updated = await api.updateClient(editingClientId, { ...clientData, nome: nomeUpper });
        setClients((prev) => prev.map((c) => (c.id === editingClientId ? updated : c)));
        setIsServerOnline(true);
      } catch (err: any) {
        console.error('Failed to update client on server:', err);
        showToast(err.message || 'Erro ao atualizar cliente no servidor');
      }
    } else {
      savedClientId = canonicalId;
      const newClientLocal: Client = {
        id: canonicalId,
        nome: nomeUpper,
        cpf: clientData.cpf!,
        telefone: clientData.telefone!,
        cep: clientData.cep,
        email: clientData.email,
        nascimento: clientData.nascimento,
        endereco: clientData.endereco,
        obs: clientData.obs,
        createdAt: new Date().toISOString(),
      };
      setClients((prev) => [...prev, newClientLocal]);
      showToast('Cliente cadastrado com sucesso!');

      try {
        const created = await api.createClient({ ...clientData, nome: nomeUpper });
        setClients((prev) => prev.map((c) => (c.id === canonicalId ? created : c)));
        savedClientId = created.id;
        setIsServerOnline(true);
      } catch (err: any) {
        console.error('Failed to create client on server:', err);
        showToast(err.message || 'Erro ao cadastrar cliente no servidor');
      }
    }

    setEditingClientId(null);
    if (andGoToOrder && savedClientId) {
      setPreselectedClientId(savedClientId);
      setEditingOrderId(null);
      setCurrentView('os-form');
      showToast('Cliente selecionado! Preencha a Ordem de Serviço.');
    } else {
      setCurrentView('clientes');
    }
  };

  // Inline Client Creation (e.g. from Order Form without leaving screen)
  const handleCreateClientInline = async (clientData: Partial<Client>): Promise<Client> => {
    const cleanCpf = onlyDigits(clientData.cpf || '');
    const canonicalId = `cpf-${cleanCpf}`;

    // If client with this CPF already exists, reuse it immediately (CPF is unique ID)
    const existing = clients.find((c) => onlyDigits(c.cpf) === cleanCpf);
    if (existing) {
      showToast(`Cliente já cadastrado (${existing.nome}) selecionado na O.S.`);
      return existing;
    }

    const nomeUpper = (clientData.nome || '').toUpperCase();
    const newClientLocal: Client = {
      id: canonicalId,
      nome: nomeUpper,
      cpf: clientData.cpf!,
      telefone: clientData.telefone!,
      cep: clientData.cep,
      email: clientData.email,
      nascimento: clientData.nascimento,
      endereco: clientData.endereco,
      obs: clientData.obs,
      createdAt: new Date().toISOString(),
    };

    setClients((prev) => [...prev, newClientLocal]);
    showToast(`Cliente ${nomeUpper} cadastrado!`);

    try {
      const created = await api.createClient({ ...clientData, nome: nomeUpper });
      setClients((prev) => prev.map((c) => (c.id === canonicalId ? created : c)));
      setIsServerOnline(true);
      return created;
    } catch (err: any) {
      console.error('Failed to create client on server:', err);
      return newClientLocal;
    }
  };

  // Maintenance Expenses Handlers
  const handleAddExpense = async (data: Partial<MaintenanceExpense>) => {
    const localId = uid();
    const newExp: MaintenanceExpense = {
      id: localId,
      descricao: data.descricao || '',
      categoria: data.categoria || 'Peças & Componentes',
      valor: Number(data.valor || 0),
      mes: data.mes || new Date().toISOString().slice(0, 7),
      data: data.data || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    setMaintenanceExpenses((prev) => [...prev, newExp]);
    showToast('Custo de manutenção adicionado!');

    try {
      const created = await api.createMaintenanceExpense(data);
      setMaintenanceExpenses((prev) => prev.map((e) => (e.id === localId ? created : e)));
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to create maintenance expense on server:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setMaintenanceExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('Custo de manutenção excluído.');

    try {
      await api.deleteMaintenanceExpense(id);
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to delete maintenance expense on server:', err);
    }
  };

  // Delete Client Prompt
  const handleDeleteClientPrompt = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const linkedCount = orders.filter((o) => o.clienteId === clientId).length;

    const message =
      linkedCount > 0
        ? `${client ? client.nome : 'Este cliente'} possui ${linkedCount} ordem(ns) de serviço vinculada(s). Elas não serão excluídas, mas ficarão sem cliente associado.`
        : `Tem certeza que deseja excluir ${client ? client.nome : 'este cliente'}? Esta ação não pode ser desfeita.`;

    setConfirmModal({
      isOpen: true,
      type: 'client',
      id: clientId,
      title: 'Excluir cliente?',
      message,
    });
  };

  // Confirm Deletion Execution
  const handleConfirmDelete = async () => {
    const targetId = confirmModal.id;
    const targetType = confirmModal.type;

    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (targetType === 'order') {
      setOrders((prev) => prev.filter((o) => o.id !== targetId));
      showToast('Ordem de serviço excluída.');
      try {
        await api.deleteOrder(targetId);
        setIsServerOnline(true);
      } catch (err) {
        console.error('Failed to delete order on server:', err);
      }
    } else {
      setClients((prev) => prev.filter((c) => c.id !== targetId));
      showToast('Cliente excluído.');
      try {
        await api.deleteClient(targetId);
        setIsServerOnline(true);
      } catch (err) {
        console.error('Failed to delete client on server:', err);
      }
    }
  };

  // Reset Data handler
  const handleResetData = async () => {
    try {
      await api.resetData();
      await syncWithServer();
      showToast('Dados restaurados para o padrão de demonstração.');
    } catch (err) {
      showToast('Falha ao restaurar dados no servidor.');
    }
  };

  const editingOrder = editingOrderId ? orders.find((o) => o.id === editingOrderId) || null : null;
  const editingClient = editingClientId ? clients.find((c) => c.id === editingClientId) || null : null;

  // Handle standalone print view (e.g. from ?print=orderId in a new tab)
  const standaloneOrder = standalonePrintOrderId
    ? orders.find((o) => o.id === standalonePrintOrderId || String(o.numero) === standalonePrintOrderId) || null
    : null;

  if (standalonePrintOrderId) {
    if (standaloneOrder) {
      const standaloneClient = clients.find((c) => c.id === standaloneOrder.clienteId) || null;
      return (
        <PrintStandaloneView
          order={standaloneOrder}
          client={standaloneClient}
          onBack={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('print');
            url.searchParams.delete('orderId');
            url.searchParams.delete('os');
            url.searchParams.delete('autoprint');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            setStandalonePrintOrderId(null);
          }}
        />
      );
    }
    return (
      <div className="min-h-screen bg-[#0B0C0E] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-3 border-[#E51D24] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-[#D1D5DB]">Carregando folha da Ordem de Serviço...</p>
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('print');
            url.searchParams.delete('orderId');
            url.searchParams.delete('os');
            url.searchParams.delete('autoprint');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            setStandalonePrintOrderId(null);
          }}
          className="mt-4 px-4 py-1.5 bg-[#1F242D] hover:bg-[#2A313E] text-xs font-semibold rounded text-[#9CA3AF] hover:text-white transition-colors cursor-pointer border border-[#374151]"
        >
          Voltar ao Sistema
        </button>
      </div>
    );
  }

  // If user is not authenticated, show Login Screen following the standard
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className={`flex min-h-screen ${theme === 'light' ? 'theme-light bg-[#F4F5F8] text-[#0F172A]' : 'bg-[#0B0C0E] text-[#FFFFFF]'}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 lg:hidden cursor-pointer"
        />
      )}

      {/* Navigation Sidebar - Sticky & Fixed */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => {
          handleNavigate(v);
          setIsMobileSidebarOpen(false);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main View Area with Top Quick Bar and Smooth Motion */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#22252B] bg-[#0E1014]/90 backdrop-blur-md px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-[#14171C] hover:bg-[#1C2028] border border-[#22262E] text-[#9CA3AF] hover:text-white transition-colors cursor-pointer shrink-0"
              title="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider font-mono shrink-0 hidden sm:inline">
              N! GAMES OS
            </span>
            <span className="text-[#374151] hidden sm:inline">/</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
              {currentView === 'dashboard' && 'Painel'}
              {currentView === 'ordens' && 'Ordens de Serviço'}
              {currentView === 'os-form' && (editingOrderId ? 'Editar O.S.' : 'Nova O.S.')}
              {currentView === 'clientes' && 'Clientes'}
              {currentView === 'cliente-form' && (editingClientId ? 'Editar Cliente' : 'Novo Cliente')}
              {currentView === 'relatorios' && 'Gráficos & Fluxo'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
                if (searchInput) {
                  searchInput.focus();
                } else {
                  handleNavigate('ordens');
                }
              }}
              className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#14171C] hover:bg-[#1C2028] border border-[#22262E] text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer shrink-0"
              title="Buscar (Ctrl + K ou /)"
            >
              <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span className="text-[11px]">Buscar</span>
              <kbd className="text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded border border-[#374151] text-[#9CA3AF]">
                /
              </kbd>
            </button>

            {/* Dark / Light Theme Toggle Button - Fixed & Protected */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} variant="header" />

            {/* Sair do Sistema (Logout) */}
            <button
              id="btn-header-logout"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#14171C] hover:bg-[#EF4444]/15 border border-[#22262E] hover:border-[#EF4444]/40 text-xs font-semibold text-[#9CA3AF] hover:text-[#EF4444] transition-colors cursor-pointer shrink-0"
              title="Sair do sistema (Logout)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Sair</span>
            </button>

            <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-[#22252B] text-xs text-[#9CA3AF] shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#E51D24]" />
              <span className="font-mono text-[11px] text-white font-bold">{orders.length}</span>
              <span className="text-[11px]">O.S.</span>
            </div>
          </div>
        </header>

        {/* Content with 60fps AnimatePresence */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 pb-24 lg:pb-8 max-w-[1240px] w-full mx-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {currentView === 'dashboard' && (
                <DashboardView
                  orders={orders}
                  clients={clients}
                  onNavigate={handleNavigate}
                  onEditOrder={handleEditOrder}
                  onPrintOrder={(order) => handlePrintOrder(order)}
                  onFilterStatus={handleFilterStatus}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onOpenShortcuts={() => setIsShortcutsOpen(true)}
                />
              )}

              {currentView === 'ordens' && (
                <OrdersListView
                  orders={orders}
                  clients={clients}
                  initialStatusFilter={ordersStatusFilter}
                  onNavigate={handleNavigate}
                  onEditOrder={handleEditOrder}
                  onDeleteOrder={handleDeleteOrderPrompt}
                  onPrintOrder={(order, autoWhatsApp) => handlePrintOrder(order, autoWhatsApp)}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateOrderPrazo={handleUpdateOrderPrazo}
                  onUpdateOrderRetirada={handleUpdateOrderRetirada}
                  onShowToast={showToast}
                />
              )}

              {currentView === 'os-form' && (
                <OrderFormView
                  editingOrder={editingOrder}
                  clients={clients}
                  nextOrderSeq={nextOrderSeq}
                  initialClientId={preselectedClientId}
                  onSave={handleSaveOrder}
                  onNavigate={handleNavigate}
                  onCreateClient={handleCreateClientInline}
                  onGoToNewClient={() => {
                    setEditingClientId(null);
                    setCurrentView('cliente-form');
                  }}
                />
              )}

              {currentView === 'clientes' && (
                <ClientsListView
                  clients={clients}
                  orders={orders}
                  onNavigate={handleNavigate}
                  onEditClient={handleEditClient}
                  onDeleteClient={handleDeleteClientPrompt}
                  onFilterOrdersByClient={(clientName) => {
                    setOrdersStatusFilter('');
                    setCurrentView('ordens');
                    setTimeout(() => {
                      const input = document.getElementById('os-search-input') as HTMLInputElement | null;
                      if (input) {
                        input.value = clientName;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }, 50);
                  }}
                />
              )}

              {currentView === 'cliente-form' && (
                <ClientFormView
                  editingClient={editingClient}
                  clients={clients}
                  onSave={handleSaveClient}
                  onNavigate={handleNavigate}
                  onEditClient={handleEditClient}
                />
              )}

              {currentView === 'relatorios' && (
                <ReportsView
                  orders={orders}
                  clients={clients}
                  expenses={maintenanceExpenses}
                  onNavigate={handleNavigate}
                  onEditOrder={(order) => handleEditOrder(order.id)}
                  onPrintOrder={(order) => handlePrintOrder(order)}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Smartphones & Tablets < lg) */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A0D11]/95 backdrop-blur-md border-t border-[#22252B] safe-area-bottom px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none transition-colors"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* 1. Painel */}
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] ${
              currentView === 'dashboard'
                ? 'text-[#E51D24] font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Painel</span>
          </button>

          {/* 2. Ordens de Serviço */}
          <button
            type="button"
            onClick={() => handleNavigate('ordens')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] relative ${
              currentView === 'ordens'
                ? 'text-[#E51D24] font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <div className="relative">
              <FileText className="w-4 h-4 mb-0.5" />
              {orders.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#E51D24] text-white text-[8.5px] font-mono font-bold px-1 rounded-full leading-tight">
                  {orders.length > 99 ? '99+' : orders.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Ordens</span>
          </button>

          {/* 3. + Nova O.S. (Ação Central em Destaque) */}
          <button
            type="button"
            onClick={() => {
              setEditingOrderId(null);
              handleNavigate('os-form');
            }}
            className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
            title="Criar nova Ordem de Serviço"
          >
            <div className="w-11 h-11 rounded-full bg-[#E51D24] group-hover:bg-[#C81018] group-active:scale-95 text-white flex items-center justify-center shadow-[0_0_16px_rgba(229,29,36,0.6)] border-2 border-[#0A0D11] transition-transform">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[9.5px] font-bold text-white uppercase tracking-wider mt-0.5">
              Nova O.S.
            </span>
          </button>

          {/* 4. Clientes */}
          <button
            type="button"
            onClick={() => handleNavigate('clientes')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] ${
              currentView === 'clientes'
                ? 'text-[#E51D24] font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Clientes</span>
          </button>

          {/* 5. Relatórios & Gráficos */}
          <button
            type="button"
            onClick={() => handleNavigate('relatorios')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] ${
              currentView === 'relatorios'
                ? 'text-[#E51D24] font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Gráficos</span>
          </button>
        </div>
      </nav>


      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Server Status & Controls Modal */}
      <ServerStatusModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onSync={syncWithServer}
        onResetData={handleResetData}
      />

      {/* Order Print / Details Modal */}
      <OrderPrintModal
        isOpen={!!printingOrder}
        order={printingOrder}
        client={printingOrder ? clients.find((c) => c.id === printingOrder.clienteId) || null : null}
        clients={clients}
        autoWhatsApp={autoWhatsAppOnOpen}
        onClose={() => {
          setPrintingOrder(null);
          setAutoWhatsAppOnOpen(false);
        }}
        onEdit={(orderId) => {
          setPrintingOrder(null);
          setAutoWhatsAppOnOpen(false);
          handleEditOrder(orderId);
        }}
      />
    </div>
  );
}
