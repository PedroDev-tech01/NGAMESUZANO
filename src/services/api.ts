import { Client, ServiceOrder, OrderStatus, MaintenanceExpense, AuthUser } from '../types';

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

export const api = {
  async getHealth(): Promise<ServerHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Falha ao obter status do servidor');
    return res.json();
  },

  async getBootstrap(): Promise<BootstrapResponse> {
    const res = await fetch(`${API_BASE}/bootstrap`);
    if (!res.ok) throw new Error('Falha ao carregar dados do servidor');
    return res.json();
  },

  async getClients(): Promise<Client[]> {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error('Falha ao buscar clientes');
    return res.json();
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao criar cliente');
    }
    return res.json();
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar cliente');
    }
    return res.json();
  },

  async deleteClient(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao excluir cliente');
    }
  },

  async getOrders(): Promise<ServiceOrder[]> {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Falha ao buscar ordens');
    return res.json();
  },

  async getOrderById(id: string): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Ordem de serviço não encontrada');
    return res.json();
  },

  async createOrder(order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao criar ordem de serviço');
    }
    return res.json();
  },

  async updateOrder(id: string, order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar ordem de serviço');
    }
    return res.json();
  },

  async updateOrderStatus(id: string, situacao: OrderStatus): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situacao }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar situação da O.S.');
    }
    return res.json();
  },

  async updateOrderPrazo(id: string, prazo: string | null): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/prazo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prazo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar prazo no servidor');
    }
    return res.json();
  },

  async updateOrderRetirada(id: string, dataRetirada?: string | null): Promise<ServiceOrder> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/retirada`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataRetirada }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao registrar data de retirada no servidor');
    }
    return res.json();
  },

  async deleteOrder(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao excluir ordem de serviço');
    }
  },

  // --- MAINTENANCE EXPENSES API ---
  async getMaintenanceExpenses(): Promise<MaintenanceExpense[]> {
    const res = await fetch(`${API_BASE}/maintenance-expenses`);
    if (!res.ok) throw new Error('Falha ao buscar custos de manutenção');
    return res.json();
  },

  async createMaintenanceExpense(data: Partial<MaintenanceExpense>): Promise<MaintenanceExpense> {
    const res = await fetch(`${API_BASE}/maintenance-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao registrar custo de manutenção');
    }
    return res.json();
  },

  async deleteMaintenanceExpense(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/maintenance-expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao excluir custo de manutenção');
    }
  },

  async resetData(): Promise<void> {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao resetar banco');
  },

  // --- AUTHENTICATION API ---
  async login(cnpj: string, senha: string): Promise<{ success: boolean; user: AuthUser; message: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj, senha }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao realizar login');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // ignore
    }
  },
};
