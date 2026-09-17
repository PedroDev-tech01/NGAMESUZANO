import { pgTable, serial, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (mandatory for Firebase Auth integration)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Clients table
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cpf: text('cpf').notNull(),
  telefone: text('telefone').notNull(),
  cep: text('cep'),
  email: text('email'),
  nascimento: text('nascimento'),
  endereco: text('endereco'),
  obs: text('obs'),
  createdAt: text('created_at').notNull(),
});

// Service Orders table
export const serviceOrders = pgTable('service_orders', {
  id: text('id').primaryKey(),
  numero: integer('numero').notNull().unique(),
  clienteId: text('cliente_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  situacao: text('situacao').notNull(),
  canal: text('canal').notNull(),
  entrada: text('entrada').notNull(), // ISO string
  prazo: text('prazo'),
  saida: text('saida'),
  dataRetirada: text('data_retirada'),
  dataRetorno: text('data_retorno'),
  motivoRetorno: text('motivo_retorno'),
  equipamento: text('equipamento').notNull(),
  marca: text('marca'),
  modelo: text('modelo'),
  serie: text('serie'),
  defeito: text('defeito'),
  estadoConsole: text('estado_console'),
  itens: text('itens'), // JSON array of OrderItem
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
  maoObra: numeric('mao_obra', { precision: 12, scale: 2 }),
  pecas: numeric('pecas', { precision: 12, scale: 2 }),
  desconto: numeric('desconto', { precision: 12, scale: 2 }),
  obs: text('obs'),
  createdAt: text('created_at').notNull(),
  retornoAt: text('retorno_at'),
});

// Maintenance Expenses table
export const maintenanceExpenses = pgTable('maintenance_expenses', {
  id: text('id').primaryKey(),
  mes: text('mes').notNull(), // "YYYY-MM"
  descricao: text('descricao').notNull(),
  categoria: text('categoria').notNull(),
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
});

// System Settings table (order sequence, company info, etc.)
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(serviceOrders),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
  client: one(clients, {
    fields: [serviceOrders.clienteId],
    references: [clients.id],
  }),
}));
