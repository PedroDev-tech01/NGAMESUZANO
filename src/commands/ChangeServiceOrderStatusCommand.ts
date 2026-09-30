/**
 * Command: ChangeServiceOrderStatusCommand
 * Implementa o Command Pattern para a transição de status com automação de regras de negócio.
 * 
 * Automações:
 * 1. Atualização automática da data de conclusão (saida) ao finalizar
 * 2. Atualização automática da data de retorno e motivo em caso de reincidência
 * 3. Ativação de garantia legal de 90 dias na entrega/retirada
 * 4. Gravação auditada no histórico persistente (1:N)
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ServiceOrder, OrderStatus, StatusHistoryEntry } from '../types';
import { ServiceOrderBusinessService } from '../services/ServiceOrderBusinessService';

export interface ChangeServiceOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
  observacao?: string;
  usuario?: string;
  customDate?: string;
  motivoRetorno?: string;
}

export class ChangeServiceOrderStatusCommand implements ICommand<ChangeServiceOrderStatusInput, ServiceOrder> {
  constructor(
    private orderDAO: IServiceOrderDAO,
    private historyDAO?: IStatusHistoryDAO
  ) {}

  async execute(input: ChangeServiceOrderStatusInput): Promise<ServiceOrder> {
    const existing = await this.orderDAO.findById(input.orderId);
    if (!existing) {
      throw new Error(`Ordem de serviço #${input.orderId} não encontrada para alteração de status.`);
    }

    const { updatedFields, newHistoryEntry } = ServiceOrderBusinessService.applyStatusTransitionRules(
      existing,
      input.newStatus,
      {
        observacao: input.observacao,
        usuario: input.usuario,
        motivoRetorno: input.motivoRetorno,
        customDate: input.customDate,
      }
    );

    const patch: Partial<ServiceOrder> = {
      ...updatedFields,
      historicoStatus: [
        ...(existing.historicoStatus || []),
        newHistoryEntry,
      ],
    };

    const updated = await this.orderDAO.update(input.orderId, patch);

    // Gravação no histórico persistente do banco de dados (1:N)
    if (this.historyDAO) {
      try {
        await this.historyDAO.create({
          id: newHistoryEntry.id,
          serviceOrderId: input.orderId,
          statusAnterior: newHistoryEntry.de,
          statusNovo: input.newStatus,
          observacao: newHistoryEntry.observacao,
          usuario: newHistoryEntry.usuario,
          createdAt: newHistoryEntry.data,
        });
      } catch (err) {
        console.warn('[ChangeServiceOrderStatusCommand] Aviso ao persistir histórico:', err);
      }
    }

    return updated;
  }
}
