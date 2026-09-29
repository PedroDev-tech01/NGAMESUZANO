/**
 * Model: StatusHistory
 * Entidade de domínio para Histórico Persistente de Mudanças de Status de O.S.
 * Relacionamento 1:N com ServiceOrder (uma O.S. possui N registros de histórico auditados).
 */
import { OrderStatus } from '../types';

export class StatusHistoryModel {
  public readonly id: string;
  public readonly serviceOrderId: string; // Chave estrangeira 1:N
  public readonly statusAnterior: string;
  public readonly statusNovo: OrderStatus;
  public readonly observacao?: string;
  public readonly usuario?: string;
  public readonly createdAt: string;

  constructor(data: {
    id?: string;
    serviceOrderId: string;
    statusAnterior: string;
    statusNovo: OrderStatus;
    observacao?: string;
    usuario?: string;
    createdAt?: string;
  }) {
    if (!data.serviceOrderId) {
      throw new Error('StatusHistory requer o vínculo obrigatório a uma ServiceOrder.');
    }
    this.id = data.id || `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.serviceOrderId = data.serviceOrderId;
    this.statusAnterior = data.statusAnterior;
    this.statusNovo = data.statusNovo;
    this.observacao = data.observacao?.trim() || undefined;
    this.usuario = data.usuario?.trim() || 'Sistema / Técnico';
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  public toJSON() {
    return {
      id: this.id,
      serviceOrderId: this.serviceOrderId,
      statusAnterior: this.statusAnterior,
      statusNovo: this.statusNovo,
      observacao: this.observacao,
      usuario: this.usuario,
      createdAt: this.createdAt,
    };
  }
}
