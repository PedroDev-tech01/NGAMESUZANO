/**
 * SupabaseClientDAO
 * Implementação concreta de IClientDAO utilizando Supabase PostgreSQL com fallback resiliente.
 */
import { IClientDAO } from '../interfaces/IClientDAO';
import { Client } from '../types';
import { getSupabase, isAuthOrKeyError, resetSupabaseClientToDefault } from '../lib/supabase';
import { onlyDigits, formatCPF, formatPhone, formatCEP } from '../utils/formatters';

// Conversão linha Supabase -> Client
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

export class SupabaseClientDAO implements IClientDAO {
  private inMemoryCache: Client[] = [];

  constructor(initialCache?: Client[]) {
    if (initialCache && initialCache.length > 0) {
      this.inMemoryCache = [...initialCache];
    }
  }

  public setCache(clients: Client[]): void {
    this.inMemoryCache = [...clients];
  }

  public getCache(): Client[] {
    return [...this.inMemoryCache];
  }

  async findAll(): Promise<Client[]> {
    let sb = getSupabase();
    if (!sb) return this.inMemoryCache;

    try {
      let { data, error } = await sb.from('clients').select('*').order('nome', { ascending: true });

      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('clients').select('*').order('nome', { ascending: true });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.warn('[SupabaseClientDAO] Erro ao buscar clientes, utilizando cache seguro:', error.message);
        return this.inMemoryCache;
      }

      const list = (data || []).map(toClient);
      if (list.length > 0) {
        this.inMemoryCache = list;
      }
      return list;
    } catch (err: any) {
      console.warn('[SupabaseClientDAO] Exceção ao consultar clientes:', err.message);
      return this.inMemoryCache;
    }
  }

  async findById(id: string): Promise<Client | null> {
    const list = await this.findAll();
    return list.find((c) => c.id === id) || null;
  }

  async findByCpf(cpf: string): Promise<Client | null> {
    const clean = onlyDigits(cpf);
    if (!clean) return null;
    const list = await this.findAll();
    return list.find((c) => onlyDigits(c.cpf) === clean || c.id === `cpf-${clean}`) || null;
  }

  async create(client: Client): Promise<Client> {
    const cleanDigits = onlyDigits(client.cpf || '');
    const canonicalId = cleanDigits.length === 11 ? `cpf-${cleanDigits}` : client.id;
    const normalized: Client = {
      ...client,
      id: client.id || canonicalId,
      nome: (client.nome || '').trim().toUpperCase(),
      cpf: formatCPF(client.cpf),
      telefone: formatPhone(client.telefone),
      cep: client.cep ? formatCEP(client.cep) : undefined,
      createdAt: client.createdAt || new Date().toISOString(),
    };

    this.inMemoryCache = [normalized, ...this.inMemoryCache.filter((c) => c.id !== normalized.id)];

    let sb = getSupabase();
    if (!sb) return normalized;

    try {
      let { error } = await sb.from('clients').insert([fromClient(normalized)]);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('clients').insert([fromClient(normalized)]);
          error = retry.error;
        }
      }
      if (error) {
        console.warn('[SupabaseClientDAO] Aviso ao inserir cliente no Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[SupabaseClientDAO] Exceção ao gravar cliente:', err.message);
    }

    return normalized;
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Cliente com id ${id} não localizado para atualização.`);
    }

    const updated: Client = {
      ...existing,
      ...data,
      nome: data.nome !== undefined ? String(data.nome).trim().toUpperCase() : existing.nome,
      cpf: data.cpf !== undefined ? formatCPF(data.cpf) : existing.cpf,
      telefone: data.telefone !== undefined ? formatPhone(data.telefone) : existing.telefone,
      cep: data.cep !== undefined ? (data.cep ? formatCEP(data.cep) : undefined) : existing.cep,
    };

    this.inMemoryCache = this.inMemoryCache.map((c) => (c.id === id ? updated : c));

    let sb = getSupabase();
    if (!sb) return updated;

    try {
      const payload: any = {};
      if (data.nome !== undefined) payload.nome = updated.nome;
      if (data.cpf !== undefined) payload.cpf = updated.cpf;
      if (data.telefone !== undefined) payload.telefone = updated.telefone;
      if (data.cep !== undefined) payload.cep = updated.cep || null;
      if (data.email !== undefined) payload.email = data.email || null;
      if (data.nascimento !== undefined) payload.nascimento = data.nascimento || null;
      if (data.endereco !== undefined) payload.endereco = data.endereco || null;
      if (data.obs !== undefined) payload.obs = data.obs || null;

      let { error } = await sb.from('clients').update(payload).eq('id', id);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('clients').update(payload).eq('id', id);
          error = retry.error;
        }
      }
      if (error) {
        console.warn('[SupabaseClientDAO] Aviso ao atualizar cliente no Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[SupabaseClientDAO] Exceção ao atualizar cliente:', err.message);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.inMemoryCache = this.inMemoryCache.filter((c) => c.id !== id);

    let sb = getSupabase();
    if (!sb) return true;

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
        console.warn('[SupabaseClientDAO] Aviso ao deletar cliente:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[SupabaseClientDAO] Exceção ao deletar cliente:', err.message);
      return false;
    }
  }
}
