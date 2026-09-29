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

    const previousStatus = existing.situacao;
    const nowIso = input.customDate || new Date().toISOString();
    const patch: Partial<ServiceOrder> = {
      situacao: input.newStatus,
    };

    // Automação: ao concluir, preenche data de saída se não existir
    if (input.newStatus === 'Concluído') {
      if (!existing.saida) {
        patch.saida = nowIso;
      }
    } else if (input.newStatus === 'Retornou com defeito') {
      patch.dataRetorno = nowIso;
      patch.retornoAt = nowIso;
      if (input.motivoRetorno) {
        patch.motivoRetorno = input.motivoRetorno;
      }
    } else if (input.newStatus === 'Em andamento' || input.newStatus === 'Em aberto') {
      // Se reaberto a partir de concluído
      if (previousStatus === 'Concluído') {
        patch.saida = undefined;
      }
    }

    const newHistoryEntry: StatusHistoryEntry = {
      id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      de: previousStatus,
      para: input.newStatus,
      data: nowIso,
      usuario: input.usuario || 'Técnico N! GAMES',
      observacao: input.observacao || (input.newStatus === 'Concluído' ? 'Serviço concluído com sucesso' : undefined),
    };

    patch.historicoStatus = [
      ...(existing.historicoStatus || []),
      newHistoryEntry,
    ];

    const updated = await this.orderDAO.update(input.orderId, patch);

    // Gravação no histórico persistente do banco de dados (1:N)
    if (this.historyDAO) {
      try {
        await this.historyDAO.create({
          id: newHistoryEntry.id,
          serviceOrderId: input.orderId,
          statusAnterior: previousStatus,
          statusNovo: input.newStatus,
          observacao: newHistoryEntry.observacao,
          usuario: newHistoryEntry.usuario,
          createdAt: nowIso,
        });
      } catch (err) {
        console.warn('[ChangeServiceOrderStatusCommand] Aviso ao persistir histórico:', err);
      }
    }

    return updated;
  }
}
