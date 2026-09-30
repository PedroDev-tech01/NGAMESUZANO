import { Client, ServiceOrder, OrderStatus, MaintenanceExpense, AuthUser, TechnicalReport } from '../types';

export interface ServerHealth {
  status: string;
  server: string;
  engine?: string;
  database?: string;
  uptime: number;
  timestamp: string;
}

export interface BootstrapResponse {
  clients: Client[];
  orders: ServiceOrder[];
  maintenanceExpenses?: MaintenanceExpense[];
  nextOrderSeq: number;
  serverTime: string;
}

const API_BASE = '/api';

const STORAGE_AUTH_USER = 'ngames_auth_user';
const STORAGE_AUTH_TOKEN = 'ngames_auth_token';

let currentAuthToken: string = '';
try {
  currentAuthToken = localStorage.getItem(STORAGE_AUTH_TOKEN) || '';
  if (!currentAuthToken) {
    const userRaw = localStorage.getItem(STORAGE_AUTH_USER);
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (parsed?.token) currentAuthToken = parsed.token;
    }
  }
} catch {
  currentAuthToken = '';
}

export function setAuthToken(token: string) {
  currentAuthToken = token || '';
  try {
    if (token) {
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_AUTH_TOKEN);
    }
  } catch {
    // ignore
  }
}

export function getAuthToken(): string {
  return currentAuthToken;
}

async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    let errorMsg = data?.error || (data?.details ? JSON.stringify(data.details) : `Erro HTTP ${res.status}`);
    if (res.status === 404 && !data?.error) {
      errorMsg = 'Servidor da API não encontrado (HTTP 404). Verifique se o deploy da Netlify Function foi concluído.';
    }
    const error = new Error(errorMsg) as any;
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }

  return data as T;
}

export const api = {
  setAuthToken,
  getAuthToken,

  async getHealth(): Promise<ServerHealth> {
    return await fetchJsonOrThrow<ServerHealth>(`${API_BASE}/health`);
  },

  async login(cnpj: string, senha: string): Promise<{ success: boolean; user: AuthUser; token: string; message: string }> {
    const res = await fetchJsonOrThrow<{ success: boolean; user: AuthUser; token: string; message: string }>(
      `${API_BASE}/auth/login`,
      {
        method: 'POST',
        body: JSON.stringify({ cnpj, senha }),
      }
    );

    if (res?.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await fetchJsonOrThrow(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setAuthToken('');
    }
  },

  async getBootstrap(): Promise<BootstrapResponse> {
    return await fetchJsonOrThrow<BootstrapResponse>(`${API_BASE}/bootstrap`);
  },

  // --- CLIENTES ---
  async getClients(): Promise<Client[]> {
    return await fetchJsonOrThrow<Client[]>(`${API_BASE}/clients`);
  },

  async getClientById(id: string): Promise<Client> {
    return await fetchJsonOrThrow<Client>(`${API_BASE}/clients/${encodeURIComponent(id)}`);
  },

  async getClientByCpf(cpf: string): Promise<Client> {
    return await fetchJsonOrThrow<Client>(`${API_BASE}/clients/by-cpf/${encodeURIComponent(cpf)}`);
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    return await fetchJsonOrThrow<Client>(`${API_BASE}/clients`, {
      method: 'POST',
      body: JSON.stringify(client),
    });
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    return await fetchJsonOrThrow<Client>(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  },

  async deleteClient(id: string): Promise<void> {
    await fetchJsonOrThrow(`${API_BASE}/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // --- ORDENS DE SERVIÇO ---
  async getOrders(filters?: Record<string, string>): Promise<ServiceOrder[]> {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return await fetchJsonOrThrow<ServiceOrder[]>(`${API_BASE}/orders${query}`);
  },

  async getOrderById(id: string): Promise<ServiceOrder> {
    return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}`);
  },

  async createOrder(order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  async updateOrder(id: string, order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  },

  async updateOrderStatus(
    id: string,
    situacao: OrderStatus,
    extra?: { observacao?: string; usuario?: string; saida?: string; dataRetorno?: string; motivoRetorno?: string; retornoAt?: string; historicoStatus?: any[] }
  ): Promise<ServiceOrder> {
    return await fetchJsonOrThrow<ServiceOrder>(`${API_BASE}/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ situacao, ...extra }),
    });
  },

  async updateOrderPrazo(id: string, prazo: string | null): Promise<ServiceOrder> {
    return await this.updateOrder(id, { prazo });
  },

  async updateOrderRetirada(id: string, dataRetirada: string): Promise<ServiceOrder> {
    return await this.updateOrder(id, { dataRetirada, saida: dataRetirada });
  },

  async deleteOrder(id: string): Promise<void> {
    await fetchJsonOrThrow(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getOrderHistory(id: string): Promise<any[]> {
    return await fetchJsonOrThrow<any[]>(`${API_BASE}/orders/${encodeURIComponent(id)}/history`);
  },

  // --- LAUDO TÉCNICO PERICIAL (1:1) ---
  async getTechnicalReport(orderId: string): Promise<TechnicalReport | null> {
    try {
      return await fetchJsonOrThrow<TechnicalReport>(`${API_BASE}/orders/${encodeURIComponent(orderId)}/technical-report`);
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  async createTechnicalReport(orderId: string, data: Partial<TechnicalReport>): Promise<TechnicalReport> {
    return await fetchJsonOrThrow<TechnicalReport>(`${API_BASE}/orders/${encodeURIComponent(orderId)}/technical-report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTechnicalReport(orderId: string, data: Partial<TechnicalReport>): Promise<TechnicalReport> {
    return await fetchJsonOrThrow<TechnicalReport>(`${API_BASE}/orders/${encodeURIComponent(orderId)}/technical-report`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTechnicalReport(orderId: string): Promise<void> {
    await fetchJsonOrThrow(`${API_BASE}/orders/${encodeURIComponent(orderId)}/technical-report`, {
      method: 'DELETE',
    });
  },

  // --- DESPESAS DE MANUTENÇÃO ---
  async getMaintenanceExpenses(): Promise<MaintenanceExpense[]> {
    return await fetchJsonOrThrow<MaintenanceExpense[]>(`${API_BASE}/maintenance-expenses`);
  },

  async createMaintenanceExpense(data: Partial<MaintenanceExpense>): Promise<MaintenanceExpense> {
    return await fetchJsonOrThrow<MaintenanceExpense>(`${API_BASE}/maintenance-expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMaintenanceExpense(id: string): Promise<void> {
    await fetchJsonOrThrow(`${API_BASE}/maintenance-expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async resetData(): Promise<void> {
    await fetchJsonOrThrow(`${API_BASE}/reset`, { method: 'POST' });
  },
};
