import { Client, ServiceOrder, OrderStatus, MaintenanceExpense, AuthUser, ExpenseCategory } from '../types';
import {
  getSupabaseClients,
  insertSupabaseClient,
  updateSupabaseClient,
  deleteSupabaseClient,
  getSupabaseOrders,
  insertSupabaseOrder,
  updateSupabaseOrder,
  deleteSupabaseOrder,
  getSupabaseExpenses,
  insertSupabaseExpense,
  deleteSupabaseExpense,
  getSupabaseNextOrderSeq,
  incrementSupabaseOrderSeq,
  isSupabaseConnected,
} from '../db/supabase-repository';
import { isSupabaseConfigured } from '../lib/supabase';

export interface ServerHealth {
  status: string;
  server: string;
  engine?: string;
  supabaseConnected?: boolean;
  uptime: number;
  timestamp: string;
  database: {
    totalClients: number;
    totalOrders: number;
    totalExpenses?: number;
    nextOrderSeq: number;
  };
}

export interface BootstrapResponse {
  clients: Client[];
  orders: ServiceOrder[];
  maintenanceExpenses?: MaintenanceExpense[];
  nextOrderSeq: number;
  serverTime: string;
}

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Master account for offline / static host fallback (Netlify, Vercel, GitHub Pages)
const MASTER_CNPJ_CLEAN = '34467363000153';
const MASTER_CNPJ_FORMATTED = '34.467.363/0001-53';
const MASTER_PASSWORD = 'Loja3637';
const MASTER_RAZAO_SOCIAL = 'N! GAMES ASSISTÊNCIA TÉCNICA ESPECIALIZADA';
const MASTER_NOME_FANTASIA = 'N! GAMES';

// Local storage keys matching App.tsx
const STORAGE_KEYS = {
  CLIENTS: 'ngames_os_clients_v2',
  ORDERS: 'ngames_os_orders_v2',
  SEQ: 'ngames_os_seq_v2',
  EXPENSES: 'ngames_os_expenses_v2',
};

function getLocalData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

/**
 * Safely fetches JSON from the API.
 * If the response is not JSON (e.g. 404 HTML, Netlify SPA redirect returning index.html,
 * or network disconnect), throws an explicit error so fallback handlers can activate.
 */
async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';

  // If the server returns HTML (typical for static hosts like Netlify returning index.html for unknown routes)
  if (!contentType.includes('application/json')) {
    throw new Error(`ENDPOINT_OFFLINE: Server returned non-JSON content (${contentType || 'empty'})`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  async getHealth(): Promise<ServerHealth> {
    try {
      return await fetchJsonOrThrow<ServerHealth>(`${API_BASE}/health`);
    } catch {
      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const clients = getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []);
      const expenses = getLocalData<MaintenanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      const seq = getLocalData<number>(STORAGE_KEYS.SEQ, 150001);
      const isSbActive = isSupabaseConfigured();

      return {
        status: 'ok',
        server: 'Netlify / Client Cloud',
        engine: isSbActive ? 'Supabase PostgreSQL Cloud' : 'Local Storage Cache',
        supabaseConnected: isSbActive && isSupabaseConnected(),
        uptime: Math.floor(performance.now() / 1000),
        timestamp: new Date().toISOString(),
        database: {
          totalClients: clients.length,
          totalOrders: orders.length,
          totalExpenses: expenses.length,
          nextOrderSeq: seq,
        },
      };
    }
  },

  async getBootstrap(): Promise<BootstrapResponse> {
    try {
      return await fetchJsonOrThrow<BootstrapResponse>(`${API_BASE}/bootstrap`);
    } catch (err) {
      if (isSupabaseConfigured()) {
        try {
          const [clients, orders, expenses, nextSeq] = await Promise.all([
            getSupabaseClients(),
            getSupabaseOrders(),
            getSupabaseExpenses(),
            getSupabaseNextOrderSeq(),
          ]);

          setLocalData(STORAGE_KEYS.CLIENTS, clients);
          setLocalData(STORAGE_KEYS.ORDERS, orders);
          setLocalData(STORAGE_KEYS.EXPENSES, expenses);
          setLocalData(STORAGE_KEYS.SEQ, nextSeq);

          return {
            clients,
            orders,
            maintenanceExpenses: expenses,
            nextOrderSeq: nextSeq,
            serverTime: new Date().toISOString(),
          };
        } catch (sbErr) {
          console.warn('[API] Falha ao consultar Supabase diretamente, usando cache local:', sbErr);
        }
      }

      console.info('[API] Using local storage bootstrap (Netlify / Static CDN mode)');
      return {
        clients: getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []),
        orders: getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []),
        maintenanceExpenses: getLocalData<MaintenanceExpense[]>(STORAGE_KEYS.EXPENSES, []),
        nextOrderSeq: getLocalData<number>(STORAGE_KEYS.SEQ, 150001),
        serverTime: new Date().toISOString(),
      };
    }
  },

  async getClients(): Promise<Client[]> {
    try {
      return await fetchJsonOrThrow<Client[]>(`${API_BASE}/clients`);
    } catch {
      if (isSupabaseConfigured()) {
        try {
          const sbClients = await getSupabaseClients();
          if (sbClients && sbClients.length > 0) {
            setLocalData(STORAGE_KEYS.CLIENTS, sbClients);
            return sbClients;
          }
        } catch {}
      }
      return getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []);
    }
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    try {
      return await fetchJsonOrThrow<Client>(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
    } catch (err: any) {
      const newClient: Client = {
        id: client.id || 'cli-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        nome: client.nome || '',
        telefone: client.telefone || '',
        cpf: client.cpf || '',
        email: client.email,
        cep: client.cep,
        endereco: client.endereco,
        obs: client.obs,
        createdAt: client.createdAt || new Date().toISOString(),
      };
      if (isSupabaseConfigured()) {
        try {
          await insertSupabaseClient(newClient);
        } catch (sbErr) {
          console.warn('[API] Aviso ao gravar cliente no Supabase:', sbErr);
        }
      }

      const current = getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []);
      setLocalData(STORAGE_KEYS.CLIENTS, [newClient, ...current]);
      return newClient;
    }
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    try {
      return await fetchJsonOrThrow<Client>(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await updateSupabaseClient(id, client);
        } catch (sbErr) {
          console.warn('[API] Aviso ao atualizar cliente no Supabase:', sbErr);
        }
      }

      const current = getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []);
      const updatedList = current.map((c) => (c.id === id ? { ...c, ...client } : c));
      setLocalData(STORAGE_KEYS.CLIENTS, updatedList);
      return updatedList.find((c) => c.id === id) as Client;
    }
  },

  async deleteClient(id: string): Promise<void> {
    try {
      await fetchJsonOrThrow(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await deleteSupabaseClient(id);
        } catch (sbErr) {
          console.warn('[API] Aviso ao deletar cliente no Supabase:', sbErr);
        }
      }

      const current = getLocalData<Client[]>(STORAGE_KEYS.CLIENTS, []);
      setLocalData(STORAGE_KEYS.CLIENTS, current.filter((c) => c.id !== id));
    }
  },

  async getOrders(): Promise<ServiceOrder[]> {
    try {
      return await fetchJsonOrThrow<ServiceOrder[]>(`${API_BASE}/orders`);
    } catch {
      if (isSupabaseConfigured()) {
        try {
          const sbOrders = await getSupabaseOrders();
          if (sbOrders && sbOrders.length > 0) {
            setLocalData(STORAGE_KEYS.ORDERS, sbOrders);
            return sbOrders;
          }
        } catch {}
      }
      return getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
    }
  },

  async getOrderById(id: string): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}`);
    } catch {
      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const found = orders.find((o) => o.id === id || String(o.numero) === id);
      if (!found) throw new Error('Ordem de serviço não encontrada');
      return found;
    }
  },

  async createOrder(order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch {
      let nextSeq = getLocalData<number>(STORAGE_KEYS.SEQ, 150001);
      if (isSupabaseConfigured()) {
        try {
          nextSeq = await incrementSupabaseOrderSeq();
        } catch {
          nextSeq = nextSeq + 1;
        }
      } else {
        nextSeq = nextSeq + 1;
      }

      const newOrder: ServiceOrder = {
        id: order.id || 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        numero: order.numero || nextSeq,
        clienteId: order.clienteId || '',
        situacao: (order.situacao as OrderStatus) || 'Em aberto',
        canal: order.canal || 'Presencial',
        entrada: order.entrada || new Date().toISOString(),
        saida: order.saida,
        prazo: order.prazo,
        dataRetirada: order.dataRetirada,
        dataRetorno: order.dataRetorno,
        motivoRetorno: order.motivoRetorno,
        equipamento: order.equipamento || '',
        marca: order.marca,
        modelo: order.modelo,
        serie: order.serie,
        defeito: order.defeito,
        solucao: order.solucao,
        valor: order.valor ?? 0,
        maoObra: order.maoObra,
        pecas: order.pecas,
        desconto: order.desconto,
        itens: order.itens,
        obs: order.obs,
        createdAt: order.createdAt || new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          await insertSupabaseOrder(newOrder);
        } catch (sbErr) {
          console.warn('[API] Aviso ao gravar ordem no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      setLocalData(STORAGE_KEYS.ORDERS, [newOrder, ...orders]);
      setLocalData(STORAGE_KEYS.SEQ, Math.max(nextSeq, newOrder.numero + 1));
      return newOrder;
    }
  },

  async updateOrder(id: string, order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await updateSupabaseOrder(id, order);
        } catch (sbErr) {
          console.warn('[API] Aviso ao atualizar ordem no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const updated = orders.map((o) => (o.id === id ? { ...o, ...order } : o));
      setLocalData(STORAGE_KEYS.ORDERS, updated);
      return updated.find((o) => o.id === id) as ServiceOrder;
    }
  },

  async updateOrderStatus(id: string, situacao: OrderStatus): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacao }),
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await updateSupabaseOrder(id, { situacao });
        } catch (sbErr) {
          console.warn('[API] Aviso ao atualizar status da ordem no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const updated = orders.map((o) => (o.id === id ? { ...o, situacao } : o));
      setLocalData(STORAGE_KEYS.ORDERS, updated);
      return updated.find((o) => o.id === id) as ServiceOrder;
    }
  },

  async updateOrderPrazo(id: string, prazo: string | null): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}/prazo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prazo }),
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await updateSupabaseOrder(id, { prazo: prazo ?? undefined });
        } catch (sbErr) {
          console.warn('[API] Aviso ao atualizar prazo da ordem no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const updated = orders.map((o) => (o.id === id ? { ...o, prazo: prazo ?? undefined } : o));
      setLocalData(STORAGE_KEYS.ORDERS, updated);
      return updated.find((o) => o.id === id) as ServiceOrder;
    }
  },

  async updateOrderRetirada(id: string, dataRetirada?: string | null): Promise<ServiceOrder> {
    try {
      return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}/retirada`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataRetirada }),
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await updateSupabaseOrder(id, { dataRetirada: dataRetirada ?? undefined, saida: dataRetirada ?? undefined });
        } catch (sbErr) {
          console.warn('[API] Aviso ao atualizar retirada no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      const updated = orders.map((o) => (o.id === id ? { ...o, saida: dataRetirada ?? undefined, dataRetirada: dataRetirada ?? undefined } : o));
      setLocalData(STORAGE_KEYS.ORDERS, updated);
      return updated.find((o) => o.id === id) as ServiceOrder;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      await fetchJsonOrThrow(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await deleteSupabaseOrder(id);
        } catch (sbErr) {
          console.warn('[API] Aviso ao deletar ordem no Supabase:', sbErr);
        }
      }

      const orders = getLocalData<ServiceOrder[]>(STORAGE_KEYS.ORDERS, []);
      setLocalData(STORAGE_KEYS.ORDERS, orders.filter((o) => o.id !== id));
    }
  },

  // --- MAINTENANCE EXPENSES API ---
  async getMaintenanceExpenses(): Promise<MaintenanceExpense[]> {
    try {
      return await fetchJsonOrThrow<MaintenanceExpense[]>(`${API_BASE}/maintenance-expenses`);
    } catch {
      if (isSupabaseConfigured()) {
        try {
          const sbExpenses = await getSupabaseExpenses();
          if (sbExpenses && sbExpenses.length > 0) {
            setLocalData(STORAGE_KEYS.EXPENSES, sbExpenses);
            return sbExpenses;
          }
        } catch {}
      }
      return getLocalData<MaintenanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
    }
  },

  async createMaintenanceExpense(data: Partial<MaintenanceExpense>): Promise<MaintenanceExpense> {
    try {
      return await fetchJsonOrThrow<MaintenanceExpense>(`${API_BASE}/maintenance-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      const todayIso = new Date().toISOString();
      const newExpense: MaintenanceExpense = {
        id: data.id || 'exp-' + Date.now().toString(36),
        mes: data.mes || todayIso.slice(0, 7),
        descricao: data.descricao || 'Despesa de manutenção',
        categoria: (data.categoria as ExpenseCategory) || 'Custo Geral de Manutenção',
        valor: data.valor ?? 0,
        data: data.data || todayIso.slice(0, 10),
        createdAt: data.createdAt || todayIso,
      };

      if (isSupabaseConfigured()) {
        try {
          await insertSupabaseExpense(newExpense);
        } catch (sbErr) {
          console.warn('[API] Aviso ao gravar despesa no Supabase:', sbErr);
        }
      }

      const expenses = getLocalData<MaintenanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      setLocalData(STORAGE_KEYS.EXPENSES, [newExpense, ...expenses]);
      return newExpense;
    }
  },

  async deleteMaintenanceExpense(id: string): Promise<void> {
    try {
      await fetchJsonOrThrow(`${API_BASE}/maintenance-expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      if (isSupabaseConfigured()) {
        try {
          await deleteSupabaseExpense(id);
        } catch (sbErr) {
          console.warn('[API] Aviso ao deletar despesa no Supabase:', sbErr);
        }
      }

      const expenses = getLocalData<MaintenanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      setLocalData(STORAGE_KEYS.EXPENSES, expenses.filter((e) => e.id !== id));
    }
  },

  async resetData(): Promise<void> {
    try {
      await fetchJsonOrThrow(`${API_BASE}/reset`, { method: 'POST' });
    } catch {
      localStorage.removeItem(STORAGE_KEYS.CLIENTS);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.setItem(STORAGE_KEYS.SEQ, '150001');
    }
  },

  // --- AUTHENTICATION API ---
  async login(cnpj: string, senha: string): Promise<{ success: boolean; user: AuthUser; message: string }> {
    const cleanCnpj = (cnpj || '').replace(/\D/g, '');
    const cleanSenha = String(senha || '').trim();

    // 1. Try backend server login if online
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, senha }),
      });

      const contentType = res.headers.get('content-type') || '';
      // Only parse if server actually returned JSON (and not Netlify's index.html fallback)
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data?.success) {
          return data;
        }
        // If the server explicitly denied with a business error (e.g. wrong password)
        if (data?.error) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      // If server explicitly returned a known rejection message (e.g. invalid password), respect it
      if (
        err?.message &&
        !err.message.includes('ENDPOINT_OFFLINE') &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('JSON') &&
        (err.message.includes('Senha incorreta') || err.message.includes('não cadastrada'))
      ) {
        throw err;
      }
      console.info('[Auth] Server API unreachable or hosted on static CDN (Netlify). Performing direct authentication.');
    }

    // 2. Client-side authentication fallback (for Netlify, Vercel static, or offline)
    if (cleanCnpj !== MASTER_CNPJ_CLEAN) {
      throw new Error('Conta não cadastrada ou não autorizada para este CNPJ.');
    }

    if (cleanSenha !== MASTER_PASSWORD) {
      throw new Error('Senha incorreta para esta conta.');
    }

    const user: AuthUser = {
      cnpj: MASTER_CNPJ_FORMATTED,
      razaoSocial: MASTER_RAZAO_SOCIAL,
      nomeFantasia: MASTER_NOME_FANTASIA,
      token: 'ngames-auth-direct-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      loggedAt: new Date().toISOString(),
    };

    return {
      success: true,
      user,
      message: 'Autenticação autorizada com sucesso',
    };
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // ignore
    }
  },
};

