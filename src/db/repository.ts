import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { clients, serviceOrders, maintenanceExpenses, systemSettings, users } from './schema.ts';
import { Client, ServiceOrder, MaintenanceExpense, OrderItem } from '../types.ts';

// Helper to sanitize numeric values for Drizzle
function toNumericString(val: number | undefined | null): string | undefined {
  if (val === undefined || val === null || isNaN(val)) return undefined;
  return Number(val).toFixed(2);
}

function parseNumeric(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return Number(val) || 0;
}

// User / Auth Helpers
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users).values({ uid, email }).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query getOrCreateUser failed:', error);
    throw new Error('Falha ao autenticar usuário no banco de dados', { cause: error });
  }
}

// System Settings (e.g. Next Order Sequence)
export async function getNextOrderSequence(): Promise<number> {
  try {
    const row = await db.select().from(systemSettings).where(eq(systemSettings.key, 'nextOrderSeq')).limit(1);
    if (row.length > 0) {
      const parsed = parseInt(row[0].value, 10);
      if (!isNaN(parsed) && parsed >= 150001) return parsed;
    }

    // Default or check highest existing order number
    const highestOrder = await db.select({ numero: serviceOrders.numero }).from(serviceOrders).orderBy(desc(serviceOrders.numero)).limit(1);
    const highest = highestOrder.length > 0 ? highestOrder[0].numero : 150165;
    const nextSeq = Math.max(highest + 1, 150166);

    await db.insert(systemSettings)
      .values({ key: 'nextOrderSeq', value: String(nextSeq) })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(nextSeq), updatedAt: new Date() },
      });

    return nextSeq;
  } catch (error) {
    console.error('Failed to get next order sequence:', error);
    return 150166;
  }
}

export async function incrementOrderSequence(): Promise<number> {
  try {
    const current = await getNextOrderSequence();
    const next = current + 1;
    await db.insert(systemSettings)
      .values({ key: 'nextOrderSeq', value: String(next) })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(next), updatedAt: new Date() },
      });
    return current;
  } catch (error) {
    console.error('Failed to increment order sequence:', error);
    return 150166;
  }
}

// Client Queries
export async function getDbClients(): Promise<Client[]> {
  try {
    const rows = await db.select().from(clients);
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      cpf: r.cpf,
      telefone: r.telefone,
      cep: r.cep || undefined,
      email: r.email || undefined,
      nascimento: r.nascimento || undefined,
      endereco: r.endereco || undefined,
      obs: r.obs || undefined,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Database getDbClients failed:', error);
    throw new Error('Falha ao listar clientes no banco de dados', { cause: error });
  }
}

export async function insertDbClient(client: Client): Promise<Client> {
  try {
    await db.insert(clients).values({
      id: client.id,
      nome: client.nome,
      cpf: client.cpf,
      telefone: client.telefone,
      cep: client.cep || null,
      email: client.email || null,
      nascimento: client.nascimento || null,
      endereco: client.endereco || null,
      obs: client.obs || null,
      createdAt: client.createdAt || new Date().toISOString(),
    });
    return client;
  } catch (error) {
    console.error('Database insertDbClient failed:', error);
    throw new Error('Falha ao cadastrar cliente no banco de dados', { cause: error });
  }
}

export async function updateDbClient(id: string, data: Partial<Client>): Promise<Client> {
  try {
    const updateValues: Record<string, any> = {};
    if (data.nome !== undefined) updateValues.nome = data.nome;
    if (data.cpf !== undefined) updateValues.cpf = data.cpf;
    if (data.telefone !== undefined) updateValues.telefone = data.telefone;
    if (data.cep !== undefined) updateValues.cep = data.cep || null;
    if (data.email !== undefined) updateValues.email = data.email || null;
    if (data.nascimento !== undefined) updateValues.nascimento = data.nascimento || null;
    if (data.endereco !== undefined) updateValues.endereco = data.endereco || null;
    if (data.obs !== undefined) updateValues.obs = data.obs || null;

    await db.update(clients).set(updateValues).where(eq(clients.id, id));
    const updated = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!updated.length) throw new Error('Cliente não encontrado');
    const r = updated[0];
    return {
      id: r.id,
      nome: r.nome,
      cpf: r.cpf,
      telefone: r.telefone,
      cep: r.cep || undefined,
      email: r.email || undefined,
      nascimento: r.nascimento || undefined,
      endereco: r.endereco || undefined,
      obs: r.obs || undefined,
      createdAt: r.createdAt,
    };
  } catch (error) {
    console.error('Database updateDbClient failed:', error);
    throw new Error('Falha ao atualizar cliente no banco de dados', { cause: error });
  }
}

export async function deleteDbClient(id: string): Promise<void> {
  try {
    await db.delete(clients).where(eq(clients.id, id));
  } catch (error) {
    console.error('Database deleteDbClient failed:', error);
    throw new Error('Falha ao excluir cliente no banco de dados', { cause: error });
  }
}

// Service Orders Queries
export async function getDbOrders(): Promise<ServiceOrder[]> {
  try {
    const rows = await db.select().from(serviceOrders).orderBy(desc(serviceOrders.numero));
    return rows.map((r) => {
      let parsedItens: OrderItem[] | undefined;
      if (r.itens) {
        try {
          parsedItens = JSON.parse(r.itens);
        } catch {
          parsedItens = undefined;
        }
      }

      return {
        id: r.id,
        numero: r.numero,
        clienteId: r.clienteId,
        situacao: r.situacao as ServiceOrder['situacao'],
        canal: r.canal as ServiceOrder['canal'],
        entrada: r.entrada,
        prazo: r.prazo || undefined,
        saida: r.saida || undefined,
        dataRetirada: r.dataRetirada || undefined,
        dataRetorno: r.dataRetorno || undefined,
        motivoRetorno: r.motivoRetorno || undefined,
        equipamento: r.equipamento,
        marca: r.marca || undefined,
        modelo: r.modelo || undefined,
        serie: r.serie || undefined,
        defeito: r.defeito || undefined,
        estadoConsole: r.estadoConsole || undefined,
        itens: parsedItens,
        valor: parseNumeric(r.valor),
        maoObra: r.maoObra ? parseNumeric(r.maoObra) : undefined,
        pecas: r.pecas ? parseNumeric(r.pecas) : undefined,
        desconto: r.desconto ? parseNumeric(r.desconto) : undefined,
        obs: r.obs || undefined,
        createdAt: r.createdAt,
        retornoAt: r.retornoAt || undefined,
      };
    });
  } catch (error) {
    console.error('Database getDbOrders failed:', error);
    throw new Error('Falha ao listar ordens de serviço no banco de dados', { cause: error });
  }
}

export async function insertDbOrder(order: ServiceOrder): Promise<ServiceOrder> {
  try {
    await db.insert(serviceOrders).values({
      id: order.id,
      numero: order.numero,
      clienteId: order.clienteId,
      situacao: order.situacao,
      canal: order.canal,
      entrada: order.entrada,
      prazo: order.prazo || null,
      saida: order.saida || null,
      dataRetirada: order.dataRetirada || null,
      dataRetorno: order.dataRetorno || null,
      motivoRetorno: order.motivoRetorno || null,
      equipamento: order.equipamento,
      marca: order.marca || null,
      modelo: order.modelo || null,
      serie: order.serie || null,
      defeito: order.defeito || null,
      estadoConsole: order.estadoConsole || null,
      itens: order.itens ? JSON.stringify(order.itens) : null,
      valor: toNumericString(order.valor) || '0.00',
      maoObra: toNumericString(order.maoObra) || null,
      pecas: toNumericString(order.pecas) || null,
      desconto: toNumericString(order.desconto) || null,
      obs: order.obs || null,
      createdAt: order.createdAt || new Date().toISOString(),
      retornoAt: order.retornoAt || null,
    });
    return order;
  } catch (error) {
    console.error('Database insertDbOrder failed:', error);
    throw new Error('Falha ao registrar ordem de serviço no banco de dados', { cause: error });
  }
}

export async function updateDbOrder(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
  try {
    const updateValues: Record<string, any> = {};
    if (data.situacao !== undefined) updateValues.situacao = data.situacao;
    if (data.canal !== undefined) updateValues.canal = data.canal;
    if (data.entrada !== undefined) updateValues.entrada = data.entrada;
    if (data.prazo !== undefined) updateValues.prazo = data.prazo || null;
    if (data.saida !== undefined) updateValues.saida = data.saida || null;
    if (data.dataRetirada !== undefined) updateValues.dataRetirada = data.dataRetirada || null;
    if (data.dataRetorno !== undefined) updateValues.dataRetorno = data.dataRetorno || null;
    if (data.motivoRetorno !== undefined) updateValues.motivoRetorno = data.motivoRetorno || null;
    if (data.equipamento !== undefined) updateValues.equipamento = data.equipamento;
    if (data.marca !== undefined) updateValues.marca = data.marca || null;
    if (data.modelo !== undefined) updateValues.modelo = data.modelo || null;
    if (data.serie !== undefined) updateValues.serie = data.serie || null;
    if (data.defeito !== undefined) updateValues.defeito = data.defeito || null;
    if (data.estadoConsole !== undefined) updateValues.estadoConsole = data.estadoConsole || null;
    if (data.itens !== undefined) updateValues.itens = data.itens ? JSON.stringify(data.itens) : null;
    if (data.valor !== undefined) updateValues.valor = toNumericString(data.valor);
    if (data.maoObra !== undefined) updateValues.maoObra = toNumericString(data.maoObra) || null;
    if (data.pecas !== undefined) updateValues.pecas = toNumericString(data.pecas) || null;
    if (data.desconto !== undefined) updateValues.desconto = toNumericString(data.desconto) || null;
    if (data.obs !== undefined) updateValues.obs = data.obs || null;
    if (data.retornoAt !== undefined) updateValues.retornoAt = data.retornoAt || null;

    await db.update(serviceOrders).set(updateValues).where(eq(serviceOrders.id, id));
    const updated = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
    if (!updated.length) throw new Error('Ordem de serviço não encontrada');
    const r = updated[0];
    let parsedItens: OrderItem[] | undefined;
    if (r.itens) {
      try {
        parsedItens = JSON.parse(r.itens);
      } catch {
        parsedItens = undefined;
      }
    }
    return {
      id: r.id,
      numero: r.numero,
      clienteId: r.clienteId,
      situacao: r.situacao as ServiceOrder['situacao'],
      canal: r.canal as ServiceOrder['canal'],
      entrada: r.entrada,
      prazo: r.prazo || undefined,
      saida: r.saida || undefined,
      dataRetirada: r.dataRetirada || undefined,
      dataRetorno: r.dataRetorno || undefined,
      motivoRetorno: r.motivoRetorno || undefined,
      equipamento: r.equipamento,
      marca: r.marca || undefined,
      modelo: r.modelo || undefined,
      serie: r.serie || undefined,
      defeito: r.defeito || undefined,
      estadoConsole: r.estadoConsole || undefined,
      itens: parsedItens,
      valor: parseNumeric(r.valor),
      maoObra: r.maoObra ? parseNumeric(r.maoObra) : undefined,
      pecas: r.pecas ? parseNumeric(r.pecas) : undefined,
      desconto: r.desconto ? parseNumeric(r.desconto) : undefined,
      obs: r.obs || undefined,
      createdAt: r.createdAt,
      retornoAt: r.retornoAt || undefined,
    };
  } catch (error) {
    console.error('Database updateDbOrder failed:', error);
    throw new Error('Falha ao atualizar ordem de serviço no banco de dados', { cause: error });
  }
}

export async function deleteDbOrder(id: string): Promise<void> {
  try {
    await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
  } catch (error) {
    console.error('Database deleteDbOrder failed:', error);
    throw new Error('Falha ao excluir ordem de serviço no banco de dados', { cause: error });
  }
}

// Maintenance Expenses Queries
export async function getDbExpenses(): Promise<MaintenanceExpense[]> {
  try {
    const rows = await db.select().from(maintenanceExpenses).orderBy(desc(maintenanceExpenses.data));
    return rows.map((r) => ({
      id: r.id,
      mes: r.mes,
      descricao: r.descricao,
      categoria: r.categoria as MaintenanceExpense['categoria'],
      valor: parseNumeric(r.valor),
      data: r.data,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Database getDbExpenses failed:', error);
    throw new Error('Falha ao listar despesas no banco de dados', { cause: error });
  }
}

export async function insertDbExpense(expense: MaintenanceExpense): Promise<MaintenanceExpense> {
  try {
    await db.insert(maintenanceExpenses).values({
      id: expense.id,
      mes: expense.mes,
      descricao: expense.descricao,
      categoria: expense.categoria,
      valor: toNumericString(expense.valor) || '0.00',
      data: expense.data,
      createdAt: expense.createdAt || new Date().toISOString(),
    });
    return expense;
  } catch (error) {
    console.error('Database insertDbExpense failed:', error);
    throw new Error('Falha ao registrar despesa no banco de dados', { cause: error });
  }
}

export async function deleteDbExpense(id: string): Promise<void> {
  try {
    await db.delete(maintenanceExpenses).where(eq(maintenanceExpenses.id, id));
  } catch (error) {
    console.error('Database deleteDbExpense failed:', error);
    throw new Error('Falha ao excluir despesa no banco de dados', { cause: error });
  }
}

// Database stats
export async function getDbStats() {
  try {
    const allClients = await db.select({ id: clients.id }).from(clients);
    const allOrders = await db.select({ id: serviceOrders.id }).from(serviceOrders);
    const nextSeq = await getNextOrderSequence();
    return {
      totalClients: allClients.length,
      totalOrders: allOrders.length,
      nextOrderSeq: nextSeq,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { totalClients: 0, totalOrders: 0, nextOrderSeq: 150166 };
  }
}

// Seed initial / existing data if database is currently empty
export async function seedFromDiskIfEmpty(diskClients: Client[], diskOrders: ServiceOrder[], diskExpenses: MaintenanceExpense[], nextSeq: number) {
  try {
    const existing = await db.select({ id: clients.id }).from(clients).limit(1);
    if (existing.length === 0) {
      console.log('[Cloud SQL] Seeding initial data to PostgreSQL...');
      for (const c of diskClients) {
        try {
          await insertDbClient(c);
        } catch (e) {
          console.warn('[Cloud SQL] Seed client skipped/failed:', c.id, e);
        }
      }
      for (const o of diskOrders) {
        try {
          await insertDbOrder(o);
        } catch (e) {
          console.warn('[Cloud SQL] Seed order skipped/failed:', o.id, e);
        }
      }
      for (const exp of diskExpenses) {
        try {
          await insertDbExpense(exp);
        } catch (e) {
          console.warn('[Cloud SQL] Seed expense skipped/failed:', exp.id, e);
        }
      }
      if (nextSeq) {
        await db.insert(systemSettings)
          .values({ key: 'nextOrderSeq', value: String(nextSeq) })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value: String(nextSeq), updatedAt: new Date() },
          });
      }
      console.log('[Cloud SQL] Initial data seeded successfully.');
    }
  } catch (err) {
    console.warn('[Cloud SQL] Seed check/execution note:', err);
  }
}

