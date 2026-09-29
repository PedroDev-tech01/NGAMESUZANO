/**
 * Command: DeleteServiceOrderCommand
 * Implementa o Command Pattern para a exclusão de Ordem de Serviço e integridade referencial associada.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';

export interface DeleteServiceOrderInput {
  id: string;
}

export class DeleteServiceOrderCommand implements ICommand<DeleteServiceOrderInput, boolean> {
  constructor(
    private orderDAO: IServiceOrderDAO,
    private reportDAO?: ITechnicalReportDAO,
    private historyDAO?: IStatusHistoryDAO
  ) {}

  async execute(input: DeleteServiceOrderInput): Promise<boolean> {
    const existing = await this.orderDAO.findById(input.id);
    if (!existing) {
      throw new Error(`Ordem de serviço #${input.id} não encontrada para exclusão.`);
    }

    // Exclusão em cascata controlada dos vínculos
    if (this.reportDAO) {
      try {
        await this.reportDAO.delete(input.id);
      } catch (e) {
        console.warn('[DeleteServiceOrderCommand] Aviso ao excluir laudo associado:', e);
      }
    }

    if (this.historyDAO) {
      try {
        await this.historyDAO.deleteByOrderId(input.id);
      } catch (e) {
        console.warn('[DeleteServiceOrderCommand] Aviso ao excluir histórico associado:', e);
      }
    }

    return await this.orderDAO.delete(input.id);
  }
}
