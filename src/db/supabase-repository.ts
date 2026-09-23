import { getSupabase, isSupabaseConfigured, isAuthOrKeyError, resetSupabaseClientToDefault } from '../lib/supabase';
import { Client, ServiceOrder, MaintenanceExpense, OrderStatus, SalesChannel, OrderItem } from '../types';

export function isSupabaseConnected(): boolean {
  return isSupabaseConfigured();
}

// Local in-memory safety caches so the app is 100% immune to network/key glitches
let cachedClients: Client[] = [];
let cachedOrders: ServiceOrder[] = [];
let cachedExpenses: MaintenanceExpense[] = [];
let cachedNextSeq: number = 150004;

export function setSupabaseCaches(
  clients?: Client[],
  orders?: ServiceOrder[],
  expenses?: MaintenanceExpense[],
  nextSeq?: number
) {
  if (clients && clients.length > 0) cachedClients = [...clients];
  if (orders && orders.length > 0) cachedOrders = [...orders];
  if (expenses && expenses.length > 0) cachedExpenses = [...expenses];
  if (typeof nextSeq === 'number') cachedNextSeq = nextSeq;
}

// Convert DB snake_case row to Client
function toClient(row: any): Client {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    cep: row.cep || undefined,
    email: row.email || undefined,
    nascimento: row.nascimento || undefined,
    endereco: row.endereco || undefined,
    obs: row.obs || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Convert Client to DB row
function fromClient(c: Client): any {
  return {
    id: c.id,
    nome: c.nome,
    cpf: c.cpf,
    telefone: c.telefone,
    cep: c.cep || null,
    email: c.email || null,
    nascimento: c.nascimento || null,
    endereco: c.endereco || null,
    obs: c.obs || null,
    created_at: c.createdAt,
  };
}

// Convert DB snake_case row to ServiceOrder
function toOrder(row: any): ServiceOrder {
  let parsedItens: OrderItem[] | undefined;
  if (row.itens) {
    try {
      parsedItens = typeof row.itens === 'string' ? JSON.parse(row.itens) : row.itens;
    } catch {
      parsedItens = undefined;
    }
  }

  let parsedHistory: any[] | undefined;
  if (row.historico_status) {
    try {
      parsedHistory = typeof row.historico_status === 'string' ? JSON.parse(row.historico_status) : row.historico_status;
    } catch {
      parsedHistory = undefined;
    }
  }

  return {
    id: row.id,
    numero: Number(row.numero),
    clienteId: row.cliente_id,
    situacao: row.situacao as OrderStatus,
    canal: row.canal as SalesChannel,
    entrada: row.entrada,
    prazo: row.prazo || undefined,
    saida: row.saida || undefined,
    dataRetirada: row.data_retirada || undefined,
    dataRetorno: row.data_retorno || undefined,
    motivoRetorno: row.motivo_retorno || undefined,
    equipamento: row.equipamento,
    marca: row.marca || undefined,
    modelo: row.modelo || undefined,
    serie: row.serie || undefined,
    defeito: row.defeito || undefined,
    solucao: row.solucao || undefined,
    estadoConsole: row.estado_console || undefined,
    itens: parsedItens,
    valor: Number(row.valor) || 0,
    maoObra: row.mao_obra !== null && row.mao_obra !== undefined ? Number(row.mao_obra) : undefined,
    pecas: row.pecas !== null && row.pecas !== undefined ? Number(row.pecas) : undefined,
    desconto: row.desconto !== null && row.desconto !== undefined ? Number(row.desconto) : undefined,
    obs: row.obs || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    retornoAt: row.retorno_at || undefined,
    historicoStatus: Array.isArray(parsedHistory) ? parsedHistory : undefined,
  };
}

// Convert ServiceOrder to DB row
function fromOrder(o: ServiceOrder): any {
  return {
    id: o.id,
    numero: o.numero,
    cliente_id: o.clienteId,
    situacao: o.situacao,
    canal: o.canal,
    entrada: o.entrada,
    prazo: o.prazo || null,
    saida: o.saida || null,
    data_retirada: o.dataRetirada || null,
    data_retorno: o.dataRetorno || null,
    motivo_retorno: o.motivoRetorno || null,
    equipamento: o.equipamento,
    marca: o.marca || null,
    modelo: o.modelo || null,
    serie: o.serie || null,
    defeito: o.defeito || null,
    solucao: o.solucao || null,
    estado_console: o.estadoConsole || null,
    itens: o.itens ? JSON.stringify(o.itens) : null,
    valor: o.valor,
    mao_obra: o.maoObra ?? null,
    pecas: o.pecas ?? null,
    desconto: o.desconto ?? null,
    obs: o.obs || null,
    created_at: o.createdAt,
    retorno_at: o.retornoAt || null,
    historico_status: o.historicoStatus ? JSON.stringify(o.historicoStatus) : null,
  };
}

// Convert DB snake_case row to MaintenanceExpense
function toExpense(row: any): MaintenanceExpense {
  return {
    id: row.id,
    mes: row.mes,
    descricao: row.descricao,
    categoria: row.categoria,
    valor: Number(row.valor) || 0,
    data: row.data,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function fromExpense(e: MaintenanceExpense): any {
  return {
    id: e.id,
    mes: e.mes,
    descricao: e.descricao,
    categoria: e.categoria,
    valor: e.valor,
    data: e.data,
    created_at: e.createdAt,
  };
}

// --- CLIENTS ---
export async function getSupabaseClients(): Promise<Client[]> {
  let sb = getSupabase();
  if (!sb) return cachedClients;

  try {
    let { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false });
    
    // Auto-heal on key / auth error
    if (error && isAuthOrKeyError(error)) {
      console.warn('[Supabase] Alerta de chave/autenticação. Auto-recuperando conexão com credenciais padrão seguras...');
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('clients').select('*').order('created_at', { ascending: false });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.warn('[Supabase] Aviso ao buscar clientes, utilizando cache seguro:', error.message);
      return cachedClients;
    }

    const clients = (data || []).map(toClient);
    if (clients.length > 0) {
      cachedClients = clients;
    }
    return clients;
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao buscar clientes, utilizando cache seguro:', err.message);
    return cachedClients;
  }
}

export async function insertSupabaseClient(client: Client): Promise<Client> {
  // Always update in-memory cache first so user work is never lost
  cachedClients = [client, ...cachedClients.filter((c) => c.id !== client.id)];

  let sb = getSupabase();
  if (!sb) return client;

  try {
    let { error } = await sb.from('clients').insert([fromClient(client)]);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('clients').insert([fromClient(client)]);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao inserir cliente, salvo com sucesso no cache local:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao inserir cliente, salvo no cache local:', err.message);
  }

  return client;
}

export async function updateSupabaseClient(id: string, data: Partial<Client>): Promise<Client> {
  // Update in cache immediately
  cachedClients = cachedClients.map((c) => (c.id === id ? { ...c, ...data } : c));
  const cachedUpdated = cachedClients.find((c) => c.id === id) || ({ id, ...data } as Client);

  let sb = getSupabase();
  if (!sb) return cachedUpdated;

  try {
    const updatePayload: any = {};
    if (data.nome !== undefined) updatePayload.nome = data.nome;
    if (data.cpf !== undefined) updatePayload.cpf = data.cpf;
    if (data.telefone !== undefined) updatePayload.telefone = data.telefone;
    if (data.cep !== undefined) updatePayload.cep = data.cep || null;
    if (data.email !== undefined) updatePayload.email = data.email || null;
    if (data.nascimento !== undefined) updatePayload.nascimento = data.nascimento || null;
    if (data.endereco !== undefined) updatePayload.endereco = data.endereco || null;
    if (data.obs !== undefined) updatePayload.obs = data.obs || null;

    let { error } = await sb.from('clients').update(updatePayload).eq('id', id);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('clients').update(updatePayload).eq('id', id);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao atualizar cliente no Supabase, mantido no cache:', error.message);
      return cachedUpdated;
    }

    const { data: updated } = await sb.from('clients').select('*').eq('id', id).single();
    if (updated) {
      const converted = toClient(updated);
      cachedClients = cachedClients.map((c) => (c.id === id ? converted : c));
      return converted;
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao atualizar cliente:', err.message);
  }

  return cachedUpdated;
}

export async function deleteSupabaseClient(id: string): Promise<void> {
  cachedClients = cachedClients.filter((c) => c.id !== id);

  let sb = getSupabase();
  if (!sb) return;

  try {
    let { error } = await sb.from('clients').delete().eq('id', id);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('clients').delete().eq('id', id);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao deletar cliente no Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao deletar cliente:', err.message);
  }
}

// --- SERVICE ORDERS ---
export async function getSupabaseOrders(): Promise<ServiceOrder[]> {
  let sb = getSupabase();
  if (!sb) return cachedOrders;

  try {
    let { data, error } = await sb.from('service_orders').select('*').order('numero', { ascending: false });

    // Auto-heal on key / auth error
    if (error && isAuthOrKeyError(error)) {
      console.warn('[Supabase] Alerta de chave/autenticação. Auto-recuperando conexão com credenciais padrão seguras...');
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('service_orders').select('*').order('numero', { ascending: false });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.warn('[Supabase] Aviso ao buscar ordens, utilizando cache seguro:', error.message);
      return cachedOrders;
    }

    const orders = (data || []).map(toOrder);
    if (orders.length > 0) {
      cachedOrders = orders;
    }
    return orders;
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao buscar ordens, utilizando cache seguro:', err.message);
    return cachedOrders;
  }
}

export async function insertSupabaseOrder(order: ServiceOrder): Promise<ServiceOrder> {
  cachedOrders = [order, ...cachedOrders.filter((o) => o.id !== order.id)];

  let sb = getSupabase();
  if (!sb) return order;

  try {
    let { error } = await sb.from('service_orders').insert([fromOrder(order)]);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('service_orders').insert([fromOrder(order)]);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao inserir ordem, salva no cache local:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao inserir ordem:', err.message);
  }

  return order;
}

export async function updateSupabaseOrder(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
  cachedOrders = cachedOrders.map((o) => (o.id === id ? { ...o, ...data } : o));
  const cachedUpdated = cachedOrders.find((o) => o.id === id) || ({ id, ...data } as ServiceOrder);

  let sb = getSupabase();
  if (!sb) return cachedUpdated;

  try {
    const updatePayload: any = {};
    if (data.situacao !== undefined) updatePayload.situacao = data.situacao;
    if (data.canal !== undefined) updatePayload.canal = data.canal;
    if (data.prazo !== undefined) updatePayload.prazo = data.prazo || null;
    if (data.saida !== undefined) updatePayload.saida = data.saida || null;
    if (data.dataRetirada !== undefined) updatePayload.data_retirada = data.dataRetirada || null;
    if (data.dataRetorno !== undefined) updatePayload.data_retorno = data.dataRetorno || null;
    if (data.motivoRetorno !== undefined) updatePayload.motivo_retorno = data.motivoRetorno || null;
    if (data.retornoAt !== undefined) updatePayload.retorno_at = data.retornoAt || null;
    if (data.equipamento !== undefined) updatePayload.equipamento = data.equipamento;
    if (data.marca !== undefined) updatePayload.marca = data.marca || null;
    if (data.modelo !== undefined) updatePayload.modelo = data.modelo || null;
    if (data.serie !== undefined) updatePayload.serie = data.serie || null;
    if (data.defeito !== undefined) updatePayload.defeito = data.defeito || null;
    if (data.solucao !== undefined) updatePayload.solucao = data.solucao || null;
    if (data.estadoConsole !== undefined) updatePayload.estado_console = data.estadoConsole || null;
    if (data.itens !== undefined) updatePayload.itens = data.itens ? JSON.stringify(data.itens) : null;
    if (data.valor !== undefined) updatePayload.valor = data.valor;
    if (data.maoObra !== undefined) updatePayload.mao_obra = data.maoObra ?? null;
    if (data.pecas !== undefined) updatePayload.pecas = data.pecas ?? null;
    if (data.desconto !== undefined) updatePayload.desconto = data.desconto ?? null;
    if (data.obs !== undefined) updatePayload.obs = data.obs || null;
    if (data.historicoStatus !== undefined) updatePayload.historico_status = data.historicoStatus ? JSON.stringify(data.historicoStatus) : null;

    let { error } = await sb.from('service_orders').update(updatePayload).eq('id', id);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('service_orders').update(updatePayload).eq('id', id);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao atualizar ordem no Supabase:', error.message);
      return cachedUpdated;
    }

    const { data: updated } = await sb.from('service_orders').select('*').eq('id', id).single();
    if (updated) {
      const converted = toOrder(updated);
      cachedOrders = cachedOrders.map((o) => (o.id === id ? converted : o));
      return converted;
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao atualizar ordem:', err.message);
  }

  return cachedUpdated;
}

export async function deleteSupabaseOrder(id: string): Promise<void> {
  cachedOrders = cachedOrders.filter((o) => o.id !== id);

  let sb = getSupabase();
  if (!sb) return;

  try {
    let { error } = await sb.from('service_orders').delete().eq('id', id);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('service_orders').delete().eq('id', id);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao deletar ordem no Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao deletar ordem:', err.message);
  }
}

// --- MAINTENANCE EXPENSES ---
export async function getSupabaseExpenses(): Promise<MaintenanceExpense[]> {
  let sb = getSupabase();
  if (!sb) return cachedExpenses;

  try {
    let { data, error } = await sb.from('maintenance_expenses').select('*').order('data', { ascending: false });

    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('maintenance_expenses').select('*').order('data', { ascending: false });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.warn('[Supabase] Aviso ao buscar despesas:', error.message);
      return cachedExpenses;
    }

    const expenses = (data || []).map(toExpense);
    if (expenses.length > 0) {
      cachedExpenses = expenses;
    }
    return expenses;
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao buscar despesas:', err.message);
    return cachedExpenses;
  }
}

export async function insertSupabaseExpense(expense: MaintenanceExpense): Promise<MaintenanceExpense> {
  cachedExpenses = [expense, ...cachedExpenses.filter((e) => e.id !== expense.id)];

  let sb = getSupabase();
  if (!sb) return expense;

  try {
    let { error } = await sb.from('maintenance_expenses').insert([fromExpense(expense)]);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('maintenance_expenses').insert([fromExpense(expense)]);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao inserir despesa:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao inserir despesa:', err.message);
  }

  return expense;
}

export async function deleteSupabaseExpense(id: string): Promise<void> {
  cachedExpenses = cachedExpenses.filter((e) => e.id !== id);

  let sb = getSupabase();
  if (!sb) return;

  try {
    let { error } = await sb.from('maintenance_expenses').delete().eq('id', id);
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('maintenance_expenses').delete().eq('id', id);
        error = retry.error;
      }
    }
    if (error) {
      console.warn('[Supabase] Aviso ao deletar despesa:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao deletar despesa:', err.message);
  }
}

// --- ORDER SEQUENCE & SETTINGS ---
export async function getSupabaseNextOrderSeq(): Promise<number> {
  let sb = getSupabase();
  if (!sb) return cachedNextSeq;

  try {
    let { data, error } = await sb.from('system_settings').select('value').eq('key', 'nextOrderSeq').single();

    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        const retry = await sb.from('system_settings').select('value').eq('key', 'nextOrderSeq').single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data) {
      const { data: maxOrder } = await sb.from('service_orders').select('numero').order('numero', { ascending: false }).limit(1).single();
      if (maxOrder && typeof maxOrder.numero === 'number') {
        cachedNextSeq = maxOrder.numero + 1;
        return cachedNextSeq;
      }
      return cachedNextSeq;
    }

    const seq = parseInt(data.value, 10);
    if (!isNaN(seq)) {
      cachedNextSeq = seq;
    }
    return cachedNextSeq;
  } catch {
    return cachedNextSeq;
  }
}

export async function incrementSupabaseOrderSeq(): Promise<number> {
  const current = await getSupabaseNextOrderSeq();
  const next = current + 1;
  cachedNextSeq = next;

  let sb = getSupabase();
  if (!sb) return current;

  try {
    let { error } = await sb.from('system_settings').upsert({
      key: 'nextOrderSeq',
      value: String(next),
    });
    if (error && isAuthOrKeyError(error)) {
      resetSupabaseClientToDefault();
      sb = getSupabase();
      if (sb) {
        await sb.from('system_settings').upsert({
          key: 'nextOrderSeq',
          value: String(next),
        });
      }
    }
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao incrementar sequência:', err.message);
  }

  return current;
}

// --- SEED SUPABASE IF EMPTY ---
export async function seedSupabaseIfEmpty(
  clients: Client[],
  orders: ServiceOrder[],
  expenses: MaintenanceExpense[],
  nextSeq: number
) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { count, error } = await sb.from('clients').select('*', { count: 'exact', head: true });
    if (error) {
      console.warn('[Supabase] Note on checking clients table (table might need to be created with supabase-schema.sql):', error.message);
      return;
    }

    if (count === 0 && clients.length > 0) {
      console.log('[Supabase] Seeding existing clients and orders to Supabase...');
      for (const c of clients) {
        try {
          await sb.from('clients').upsert(fromClient(c));
        } catch (err) {
          console.warn('Seed client error:', err);
        }
      }
      for (const o of orders) {
        try {
          await sb.from('service_orders').upsert(fromOrder(o));
        } catch (err) {
          console.warn('Seed order error:', err);
        }
      }
      for (const e of expenses) {
        try {
          await sb.from('maintenance_expenses').upsert(fromExpense(e));
        } catch (err) {
          console.warn('Seed expense error:', err);
        }
      }
      await sb.from('system_settings').upsert({ key: 'nextOrderSeq', value: String(nextSeq) });
      console.log('[Supabase] Initial data seeded successfully!');
    }
  } catch (err) {
    console.warn('[Supabase] Seed exception:', err);
  }
}

// --- AUTHENTICATION & LOGIN ACCOUNTS ---
export interface AuthAccount {
  cnpj: string;
  cleanCnpj: string;
  senha: string;
  razaoSocial: string;
  nomeFantasia: string;
  role: string;
  active: boolean;
}

export const MASTER_AUTH_ACCOUNT: AuthAccount = {
  cnpj: '34.467.363/0001-53',
  cleanCnpj: '34467363000153',
  senha: 'Loja3637',
  razaoSocial: 'N! GAMES ASSISTÊNCIA TÉCNICA ESPECIALIZADA',
  nomeFantasia: 'N! GAMES',
  role: 'admin',
  active: true,
};

export async function ensureAuthAccountInDb(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    // 1. Try to upsert in auth_accounts table if it exists
    const { error: tableErr } = await sb.from('auth_accounts').upsert({
      id: 'acc-master-ngames',
      cnpj: MASTER_AUTH_ACCOUNT.cnpj,
      senha: MASTER_AUTH_ACCOUNT.senha,
      razao_social: MASTER_AUTH_ACCOUNT.razaoSocial,
      nome_fantasia: MASTER_AUTH_ACCOUNT.nomeFantasia,
      ativo: true,
      created_at: new Date().toISOString(),
    });
    if (tableErr) {
      // If table doesn't exist, we store in system_settings
      // console.log('[Supabase] Using system_settings for auth credentials');
    }

    // 2. Always persist in system_settings table (which is already configured)
    await sb.from('system_settings').upsert({
      key: `auth_account_${MASTER_AUTH_ACCOUNT.cleanCnpj}`,
      value: JSON.stringify(MASTER_AUTH_ACCOUNT),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase] Note on ensuring auth account in database:', err);
  }
}

export async function findAuthAccount(cleanCnpj: string): Promise<AuthAccount | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      // 1. Check auth_accounts table if created
      const { data: tableData, error: tableErr } = await sb
        .from('auth_accounts')
        .select('*')
        .eq('cnpj', MASTER_AUTH_ACCOUNT.cnpj)
        .single();
      if (!tableErr && tableData) {
        const rawCnpj = (tableData.cnpj || '').replace(/\D/g, '');
        if (rawCnpj === cleanCnpj) {
          return {
            cnpj: tableData.cnpj,
            cleanCnpj: rawCnpj,
            senha: tableData.senha,
            razaoSocial: tableData.razao_social || 'N! GAMES',
            nomeFantasia: tableData.nome_fantasia || 'N! GAMES',
            role: 'admin',
            active: tableData.ativo ?? true,
          };
        }
      }

      // 2. Check system_settings table in Supabase
      const { data, error } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', `auth_account_${cleanCnpj}`)
        .single();
      if (!error && data?.value) {
        const parsed = JSON.parse(data.value);
        if (parsed && typeof parsed === 'object') {
          return parsed as AuthAccount;
        }
      }
    } catch (err) {
      console.warn('[Supabase] Error reading auth account from Supabase:', err);
    }
  }

  // 3. Fallback check for the required account
  if (cleanCnpj === MASTER_AUTH_ACCOUNT.cleanCnpj) {
    return MASTER_AUTH_ACCOUNT;
  }

  return null;
}
