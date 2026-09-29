/**
 * SupabaseTechnicalReportDAO
 * Implementação concreta de ITechnicalReportDAO utilizando Supabase PostgreSQL.
 * Assegura o relacionamento 1:1 estrito entre ServiceOrder e TechnicalReport (Laudo Técnico).
 */
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import { TechnicalReport } from '../types';
import { getSupabase, isAuthOrKeyError, resetSupabaseClientToDefault } from '../lib/supabase';

function toReport(row: any): TechnicalReport {
  return {
    id: row.id,
    serviceOrderId: row.service_order_id,
    diagnostico: row.diagnostico,
    servicoRealizado: row.servico_realizado,
    pecasUtilizadas: row.pecas_utilizadas || undefined,
    observacaoTecnica: row.observacao_tecnica || undefined,
    tecnicoResponsavel: row.tecnico_responsavel,
    dataAnalise: row.data_analise,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function fromReport(r: TechnicalReport): any {
  return {
    id: r.id,
    service_order_id: r.serviceOrderId,
    diagnostico: r.diagnostico,
    servico_realizado: r.servicoRealizado,
    pecas_utilizadas: r.pecasUtilizadas || null,
    observacao_tecnica: r.observacaoTecnica || null,
    tecnico_responsavel: r.tecnicoResponsavel,
    data_analise: r.dataAnalise,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export class SupabaseTechnicalReportDAO implements ITechnicalReportDAO {
  private inMemoryCache: TechnicalReport[] = [];

  constructor(initialCache?: TechnicalReport[]) {
    if (initialCache && initialCache.length > 0) {
      this.inMemoryCache = [...initialCache];
    }
  }

  public setCache(reports: TechnicalReport[]): void {
    this.inMemoryCache = [...reports];
  }

  public getCache(): TechnicalReport[] {
    return [...this.inMemoryCache];
  }

  async findByOrderId(serviceOrderId: string): Promise<TechnicalReport | null> {
    const cached = this.inMemoryCache.find((r) => r.serviceOrderId === serviceOrderId);
    let sb = getSupabase();
    if (!sb) return cached || null;

    try {
      let { data, error } = await sb
        .from('technical_reports')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .maybeSingle();

      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('technical_reports').select('*').eq('service_order_id', serviceOrderId).maybeSingle();
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.warn('[SupabaseTechnicalReportDAO] Aviso ao consultar laudo:', error.message);
        return cached || null;
      }

      if (data) {
        const report = toReport(data);
        this.inMemoryCache = [report, ...this.inMemoryCache.filter((r) => r.serviceOrderId !== serviceOrderId)];
        return report;
      }
      return cached || null;
    } catch (err: any) {
      console.warn('[SupabaseTechnicalReportDAO] Exceção ao consultar laudo:', err.message);
      return cached || null;
    }
  }

  async findById(id: string): Promise<TechnicalReport | null> {
    const cached = this.inMemoryCache.find((r) => r.id === id);
    if (cached) return cached;
    let sb = getSupabase();
    if (!sb) return null;

    try {
      const { data } = await sb.from('technical_reports').select('*').eq('id', id).maybeSingle();
      return data ? toReport(data) : null;
    } catch {
      return null;
    }
  }

  async create(report: TechnicalReport): Promise<TechnicalReport> {
    // Validação estrita do relacionamento 1:1: não permitir mais de um laudo para a mesma O.S.
    const existing = await this.findByOrderId(report.serviceOrderId);
    if (existing) {
      throw new Error(`Conflito 1:1: A Ordem de Serviço ${report.serviceOrderId} já possui um Laudo Técnico cadastrado.`);
    }

    const normalized: TechnicalReport = {
      ...report,
      id: report.id || `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryCache = [normalized, ...this.inMemoryCache.filter((r) => r.serviceOrderId !== normalized.serviceOrderId)];

    let sb = getSupabase();
    if (!sb) return normalized;

    try {
      const payload = fromReport(normalized);
      let { error } = await sb.from('technical_reports').insert([payload]);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('technical_reports').insert([payload]);
          error = retry.error;
        }
      }
      if (error) {
        console.warn('[SupabaseTechnicalReportDAO] Aviso ao gravar laudo técnico no Supabase:', error.message);
      } else {
        console.log(`[SupabaseTechnicalReportDAO] Laudo pericial gravado para O.S. ${normalized.serviceOrderId}!`);
      }
    } catch (err: any) {
      console.warn('[SupabaseTechnicalReportDAO] Exceção ao gravar laudo:', err.message);
    }

    return normalized;
  }

  async update(serviceOrderId: string, data: Partial<TechnicalReport>): Promise<TechnicalReport> {
    const existing = await this.findByOrderId(serviceOrderId);
    if (!existing) {
      throw new Error(`Laudo técnico da O.S. ${serviceOrderId} não encontrado para atualização.`);
    }

    const updated: TechnicalReport = {
      ...existing,
      ...data,
      serviceOrderId,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryCache = this.inMemoryCache.map((r) => (r.serviceOrderId === serviceOrderId ? updated : r));

    let sb = getSupabase();
    if (!sb) return updated;

    try {
      const payload: any = {
        updated_at: updated.updatedAt,
      };
      if (data.diagnostico !== undefined) payload.diagnostico = data.diagnostico;
      if (data.servicoRealizado !== undefined) payload.servico_realizado = data.servicoRealizado;
      if (data.pecasUtilizadas !== undefined) payload.pecas_utilizadas = data.pecasUtilizadas || null;
      if (data.observacaoTecnica !== undefined) payload.observacao_tecnica = data.observacaoTecnica || null;
      if (data.tecnicoResponsavel !== undefined) payload.tecnico_responsavel = data.tecnicoResponsavel;
      if (data.dataAnalise !== undefined) payload.data_analise = data.dataAnalise;

      let { error } = await sb.from('technical_reports').update(payload).eq('service_order_id', serviceOrderId);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('technical_reports').update(payload).eq('service_order_id', serviceOrderId);
          error = retry.error;
        }
      }
      if (error) {
        console.warn('[SupabaseTechnicalReportDAO] Aviso ao atualizar laudo no Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[SupabaseTechnicalReportDAO] Exceção ao atualizar laudo:', err.message);
    }

    return updated;
  }

  async delete(serviceOrderId: string): Promise<boolean> {
    this.inMemoryCache = this.inMemoryCache.filter((r) => r.serviceOrderId !== serviceOrderId);

    let sb = getSupabase();
    if (!sb) return true;

    try {
      let { error } = await sb.from('technical_reports').delete().eq('service_order_id', serviceOrderId);
      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('technical_reports').delete().eq('service_order_id', serviceOrderId);
          error = retry.error;
        }
      }
      return !error;
    } catch (err: any) {
      console.warn('[SupabaseTechnicalReportDAO] Exceção ao excluir laudo:', err.message);
      return false;
    }
  }
}
