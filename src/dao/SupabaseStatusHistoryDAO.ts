/**
 * SupabaseStatusHistoryDAO
 * Implementação concreta de IStatusHistoryDAO utilizando Supabase PostgreSQL.
 * Persiste cada mudança de status de maneira auditável (Relacionamento 1:N com ServiceOrder).
 */
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ServiceOrderStatusHistory, OrderStatus } from '../types';
import { getSupabase, isAuthOrKeyError, resetSupabaseClientToDefault } from '../lib/supabase';

function toHistory(row: any): ServiceOrderStatusHistory {
  return {
    id: row.id,
    serviceOrderId: row.service_order_id,
    statusAnterior: row.status_anterior,
    statusNovo: row.status_novo as OrderStatus,
    observacao: row.observacao || undefined,
    usuario: row.usuario || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function fromHistory(h: ServiceOrderStatusHistory): any {
  return {
    id: h.id,
    service_order_id: h.serviceOrderId,
    status_anterior: h.statusAnterior,
    status_novo: h.statusNovo,
    observacao: h.observacao || null,
    usuario: h.usuario || null,
    created_at: h.createdAt,
  };
}

export class SupabaseStatusHistoryDAO implements IStatusHistoryDAO {
  private inMemoryCache: ServiceOrderStatusHistory[] = [];

  constructor(initialCache?: ServiceOrderStatusHistory[]) {
    if (initialCache && initialCache.length > 0) {
      this.inMemoryCache = [...initialCache];
    }
  }

  public setCache(history: ServiceOrderStatusHistory[]): void {
    this.inMemoryCache = [...history];
  }

  public getCache(): ServiceOrderStatusHistory[] {
    return [...this.inMemoryCache];
  }

  async findByOrderId(serviceOrderId: string): Promise<ServiceOrderStatusHistory[]> {
    const cached = this.inMemoryCache.filter((h) => h.serviceOrderId === serviceOrderId);
    let sb = getSupabase();
    if (!sb) return cached;

    try {
      let { data, error } = await sb
        .from('service_order_status_history')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb
            .from('service_order_status_history')
            .select('*')
            .eq('service_order_id', serviceOrderId)
            .order('created_at', { ascending: true });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.warn('[SupabaseStatusHistoryDAO] Aviso ao consultar histórico:', error.message);
        return cached;
      }

      const list = (data || []).map(toHistory);
      if (list.length > 0) {
        this.inMemoryCache = [
          ...list,
          ...this.inMemoryCache.filter((h) => h.serviceOrderId !== serviceOrderId),
        ];
        return list;
      }
      return cached;
    } catch (err: any) {
      console.warn('[SupabaseStatusHistoryDAO] Exceção ao consultar histórico:', err.message);
      return cached;
    }
  }

  async create(entry: ServiceOrderStatusHistory): Promise<ServiceOrderStatusHistory> {
    const normalized: ServiceOrderStatusHistory = {
      ...entry,
      id: entry.id || `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    this.inMemoryCache.push(normalized);

    let sb = getSupabase();
    if (!sb) return normalized;

    try {
      const payload = fromHistory(normalized);
      let { error } = await sb.from('service_order_status_history').insert([payload]);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('service_order_status_history').insert([payload]);
          error = retry.error;
        }
      }
      if (error) {
        console.warn('[SupabaseStatusHistoryDAO] Aviso ao gravar histórico no Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[SupabaseStatusHistoryDAO] Exceção ao gravar histórico:', err.message);
    }

    return normalized;
  }

  async deleteByOrderId(serviceOrderId: string): Promise<boolean> {
    this.inMemoryCache = this.inMemoryCache.filter((h) => h.serviceOrderId !== serviceOrderId);

    let sb = getSupabase();
    if (!sb) return true;

    try {
      const { error } = await sb.from('service_order_status_history').delete().eq('service_order_id', serviceOrderId);
      return !error;
    } catch {
      return false;
    }
  }
}
