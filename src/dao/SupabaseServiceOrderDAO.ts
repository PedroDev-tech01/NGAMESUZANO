/**
 * SupabaseServiceOrderDAO
 * Implementação concreta de IServiceOrderDAO utilizando Supabase PostgreSQL com reconciliação de integridade referencial.
 */
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { ServiceOrder, OrderStatus, OrderItem, SalesChannel } from '../types';
import { getSupabase, isAuthOrKeyError, resetSupabaseClientToDefault } from '../lib/supabase';
import { onlyDigits } from '../utils/formatters';

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

  if (!parsedHistory || parsedHistory.length === 0) {
    parsedHistory = [
      {
        id: `init-${row.id}`,
        de: 'Criada',
        para: row.situacao || 'Em aberto',
        data: row.entrada || row.created_at || new Date().toISOString(),
        observacao: 'Abertura da O.S.',
      },
    ];
    if (row.data_retorno || row.retorno_at) {
      parsedHistory.push({
        id: `ret-${row.id}`,
        de: 'Em aberto',
        para: 'Retornou com defeito',
        data: row.data_retorno || row.retorno_at,
        observacao: row.motivo_retorno || 'Retornou com defeito',
      });
    }
    if (row.data_retirada) {
      parsedHistory.push({
        id: `retirada-${row.id}`,
        de: row.situacao || 'Concluído',
        para: 'Concluído',
        data: row.data_retirada,
        observacao: 'Equipamento retirado pelo cliente (Garantia ativada)',
      });
    } else if (row.saida) {
      parsedHistory.push({
        id: `saida-${row.id}`,
        de: 'Em andamento',
        para: 'Concluído',
        data: row.saida,
        observacao: 'Serviço concluído',
      });
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
  };
}

export class SupabaseServiceOrderDAO implements IServiceOrderDAO {
  private inMemoryCache: ServiceOrder[] = [];
  private cachedNextSeq: number = 150030;

  constructor(initialCache?: ServiceOrder[], nextSeq?: number) {
    if (initialCache && initialCache.length > 0) {
      this.inMemoryCache = [...initialCache];
    }
    if (typeof nextSeq === 'number') {
      this.cachedNextSeq = nextSeq;
    }
  }

  public setCache(orders: ServiceOrder[], nextSeq?: number): void {
    this.inMemoryCache = [...orders];
    if (typeof nextSeq === 'number') this.cachedNextSeq = nextSeq;
  }

  public getCache(): ServiceOrder[] {
    return [...this.inMemoryCache];
  }

  async findAll(): Promise<ServiceOrder[]> {
    let sb = getSupabase();
    if (!sb) return this.inMemoryCache;

    try {
      let { data, error } = await sb.from('service_orders').select('*').order('numero', { ascending: false });

      if (error && isAuthOrKeyError(error)) {
        resetSupabaseClientToDefault();
        sb = getSupabase();
        if (sb) {
          const retry = await sb.from('service_orders').select('*').order('numero', { ascending: false });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.warn('[SupabaseServiceOrderDAO] Erro ao buscar ordens:', error.message);
        return this.inMemoryCache;
      }

      const list = (data || []).map(toOrder);
      if (list.length > 0) {
        this.inMemoryCache = list;
      }
      return list;
    } catch (err: any) {
      console.warn('[SupabaseServiceOrderDAO] Exceção ao consultar ordens:', err.message);
      return this.inMemoryCache;
    }
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const list = await this.findAll();
    return list.find((o) => o.id === id || String(o.numero) === id) || null;
  }

  async findByNumber(numero: number): Promise<ServiceOrder | null> {
    const list = await this.findAll();
    return list.find((o) => o.numero === numero) || null;
  }

  async findByClientId(clientId: string): Promise<ServiceOrder[]> {
    const list = await this.findAll();
    const cleanId = onlyDigits(clientId);
    return list.filter((o) => o.clienteId === clientId || (cleanId && onlyDigits(o.clienteId) === cleanId));
  }

  async findByStatus(status: OrderStatus): Promise<ServiceOrder[]> {
    const list = await this.findAll();
    return list.filter((o) => o.situacao === status);
  }

  async create(order: ServiceOrder): Promise<ServiceOrder> {
    let finalClienteId = order.clienteId;
    let sb = getSupabase();

    if (sb && finalClienteId) {
      try {
        const { data: directClient } = await sb.from('clients').select('id, cpf').eq('id', finalClienteId).maybeSingle();
        if (!directClient) {
          const cleanDigits = onlyDigits(finalClienteId);
          if (cleanDigits.length >= 11) {
            const { data: allSbClients } = await sb.from('clients').select('id, cpf');
            const matched = allSbClients?.find((c) => onlyDigits(c.cpf) === cleanDigits);
            if (matched) {
              finalClienteId = matched.id;
            }
          }
        }
      } catch (e) {
        console.warn('[SupabaseServiceOrderDAO] Aviso ao verificar chave estrangeira:', e);
      }
    }

    const orderToSave: ServiceOrder = {
      ...order,
      clienteId: finalClienteId,
    };

    this.inMemoryCache = [orderToSave, ...this.inMemoryCache.filter((o) => o.id !== orderToSave.id)];
    this.cachedNextSeq = Math.max(this.cachedNextSeq, orderToSave.numero + 1);

    if (sb) {
      try {
        const payload = fromOrder(orderToSave);
        let { error } = await sb.from('service_orders').insert([payload]);
        if (error && isAuthOrKeyError(error)) {
          resetSupabaseClientToDefault();
          sb = getSupabase();
          if (sb) {
            const retry = await sb.from('service_orders').insert([payload]);
            error = retry.error;
          }
        }
        if (error) {
          console.warn('[SupabaseServiceOrderDAO] Erro ao gravar ordem:', error.message);
          if (error.code === '23503') {
            const { data: sbClients } = await sb.from('clients').select('id, cpf');
            const matched = sbClients?.find((c) => onlyDigits(c.cpf) === onlyDigits(order.clienteId));
            if (matched) {
              payload.cliente_id = matched.id;
              await sb.from('service_orders').insert([payload]);
            }
          }
        } else {
          console.log(`[SupabaseServiceOrderDAO] Ordem #${orderToSave.numero} gravada com sucesso!`);
        }
      } catch (err: any) {
        console.warn('[SupabaseServiceOrderDAO] Exceção ao persistir ordem:', err.message);
      }
    }

    return orderToSave;
  }

  async update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const existing = await this.findById(id);
    const updated: ServiceOrder = {
      ...(existing || {}),
      ...data,
      id,
      numero: existing?.numero || (data.numero as number) || 150001,
      clienteId: existing?.clienteId || (data.clienteId as string) || '',
      situacao: data.situacao || existing?.situacao || 'Em aberto',
      canal: data.canal || existing?.canal || 'Presencial',
      entrada: existing?.entrada || data.entrada || new Date().toISOString(),
      equipamento: data.equipamento || existing?.equipamento || 'Equipamento',
      valor: data.valor !== undefined ? Number(data.valor) : (existing?.valor ?? 0),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    this.inMemoryCache = this.inMemoryCache.map((o) => (o.id === id ? updated : o));

    let sb = getSupabase();
    if (!sb) return updated;

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
        console.warn('[SupabaseServiceOrderDAO] Aviso ao atualizar ordem no Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[SupabaseServiceOrderDAO] Exceção ao atualizar ordem:', err.message);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.inMemoryCache = this.inMemoryCache.filter((o) => o.id !== id);

    let sb = getSupabase();
    if (!sb) return true;

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
        console.warn('[SupabaseServiceOrderDAO] Aviso ao deletar ordem:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[SupabaseServiceOrderDAO] Exceção ao deletar ordem:', err.message);
      return false;
    }
  }

  async getNextSequence(): Promise<number> {
    let sb = getSupabase();
    if (!sb) return this.cachedNextSeq;

    try {
      const { data } = await sb.from('system_settings').select('value').eq('key', 'nextOrderSeq').maybeSingle();
      if (data && data.value) {
        const parsed = parseInt(data.value, 10);
        if (!isNaN(parsed)) {
          this.cachedNextSeq = parsed;
          return parsed;
        }
      }
      const { data: maxOrder } = await sb.from('service_orders').select('numero').order('numero', { ascending: false }).limit(1).maybeSingle();
      if (maxOrder && typeof maxOrder.numero === 'number') {
        this.cachedNextSeq = maxOrder.numero + 1;
      }
    } catch (e) {
      console.warn('[SupabaseServiceOrderDAO] Erro ao buscar sequencial:', e);
    }
    return this.cachedNextSeq;
  }

  async incrementSequence(): Promise<number> {
    const current = await this.getNextSequence();
    const next = current + 1;
    this.cachedNextSeq = next;

    let sb = getSupabase();
    if (sb) {
      try {
        await sb.from('system_settings').upsert({
          key: 'nextOrderSeq',
          value: next.toString(),
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[SupabaseServiceOrderDAO] Erro ao incrementar sequencial no Supabase:', e);
      }
    }

    return current;
  }
}
