/**
 * Service: ServiceOrderBusinessService
 * 
 * Centraliza e encapsula as automações de processos de negócio de Ordens de Serviço:
 * 1. Geração e incremento automático da numeração sequencial
 * 2. Registro automático da data/hora de entrada na abertura
 * 3. Definição do status inicial padronizado ('Em aberto')
 * 4. Automação de datas de conclusão (saida) ao mudar para 'Concluído'
 * 5. Automação de controle de retirada e ativação de garantia (90 dias legais)
 * 6. Automação de retorno com defeito / reincidência de garantia (retornoAt, motivoRetorno)
 * 7. Geração e manutenção de histórico cronológico auditável de status
 */
import { ServiceOrder, OrderStatus, StatusHistoryEntry } from '../types';

export class ServiceOrderBusinessService {
  /**
   * Determina a data/hora oficial no fuso ISO para aberturas de ordem
   */
  public static generateEntryTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Inicializa o histórico formal com o evento de abertura
   */
  public static createInitialHistory(status: OrderStatus = 'Em aberto', timestamp?: string): StatusHistoryEntry {
    const time = timestamp || this.generateEntryTimestamp();
    return {
      id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      de: 'Criada',
      para: status,
      data: time,
      observacao: 'Abertura da Ordem de Serviço na N! GAMES',
      usuario: 'Sistema N! Games',
    };
  }

  /**
   * Aplica automações de datas e estados ao mudar o status da O.S.
   */
  public static applyStatusTransitionRules(
    currentOrder: ServiceOrder,
    newStatus: OrderStatus,
    options?: {
      observacao?: string;
      usuario?: string;
      motivoRetorno?: string;
      customDate?: string;
    }
  ): {
    updatedFields: Partial<ServiceOrder>;
    newHistoryEntry: StatusHistoryEntry;
  } {
    const nowIso = options?.customDate || new Date().toISOString();
    const updatedFields: Partial<ServiceOrder> = {
      situacao: newStatus,
    };

    // Automação: Ao concluir serviço
    if (newStatus === 'Concluído') {
      if (!currentOrder.saida) {
        updatedFields.saida = nowIso;
      }
    } 
    // Automação: Ao retornar com defeito (Garantia)
    else if (newStatus === 'Retornou com defeito') {
      updatedFields.dataRetorno = nowIso;
      updatedFields.retornoAt = nowIso;
      if (options?.motivoRetorno) {
        updatedFields.motivoRetorno = options.motivoRetorno.trim();
      }
    }
    // Automação: Ao reabrir ordem concluída
    else if (currentOrder.situacao === 'Concluído' && (newStatus === 'Em andamento' || newStatus === 'Em aberto')) {
      updatedFields.saida = undefined;
    }

    const newHistoryEntry: StatusHistoryEntry = {
      id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      de: currentOrder.situacao,
      para: newStatus,
      data: nowIso,
      observacao: options?.observacao || (newStatus === 'Concluído' ? 'Serviço concluído com sucesso' : undefined),
      usuario: options?.usuario || 'Técnico Especialista',
    };

    return {
      updatedFields,
      newHistoryEntry,
    };
  }

  /**
   * Processa a retirada do equipamento pelo cliente com ativação de garantia
   */
  public static processEquipmentPickup(currentOrder: ServiceOrder, pickupDate?: string): Partial<ServiceOrder> {
    const date = pickupDate || new Date().toISOString();
    return {
      dataRetirada: date,
      situacao: 'Concluído',
      saida: currentOrder.saida || date,
    };
  }

  /**
   * Calcula o período de garantia legal ativa (90 dias após a retirada)
   */
  public static calculateWarrantyPeriod(dataRetirada?: string): {
    isActive: boolean;
    daysRemaining: number;
    expirationDate: string | null;
  } {
    if (!dataRetirada) {
      return { isActive: false, daysRemaining: 0, expirationDate: null };
    }

    const pickup = new Date(dataRetirada).getTime();
    if (isNaN(pickup)) {
      return { isActive: false, daysRemaining: 0, expirationDate: null };
    }

    const WARRANTY_DAYS = 90;
    const expiresAt = new Date(pickup + WARRANTY_DAYS * 24 * 60 * 60 * 1000);
    const now = Date.now();
    const diffMs = expiresAt.getTime() - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      isActive: diffMs > 0,
      daysRemaining,
      expirationDate: expiresAt.toISOString().split('T')[0],
    };
  }
}
