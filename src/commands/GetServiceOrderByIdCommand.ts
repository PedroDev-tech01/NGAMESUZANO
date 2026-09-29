/**
 * Command: GetServiceOrderByIdCommand
 * Implementa o Command Pattern para busca de Ordem de Serviço por ID ou Número,
 * enriquecendo com o Laudo Técnico 1:1 e Histórico de Status 1:N.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ServiceOrder } from '../types';

export interface GetServiceOrderByIdInput {
  idOrNumber: string | number;
}

export class GetServiceOrderByIdCommand implements ICommand<GetServiceOrderByIdInput, ServiceOrder | null> {
  constructor(
    private orderDAO: IServiceOrderDAO,
    private reportDAO?: ITechnicalReportDAO,
    private historyDAO?: IStatusHistoryDAO
  ) {}

  async execute(input: GetServiceOrderByIdInput): Promise<ServiceOrder | null> {
    const raw = String(input.idOrNumber).trim();
    let order: ServiceOrder | null = null;

    if (!isNaN(Number(raw))) {
      order = await this.orderDAO.findByNumber(Number(raw));
    }
    if (!order) {
      order = await this.orderDAO.findById(raw);
    }
    if (!order) return null;

    // Carrega relacionamento 1:1 com TechnicalReport
    if (this.reportDAO) {
      try {
        const report = await this.reportDAO.findByOrderId(order.id);
        order.technicalReport = report;
      } catch (e) {
        console.warn('[GetServiceOrderByIdCommand] Aviso ao carregar laudo 1:1:', e);
      }
    }

    // Carrega relacionamento 1:N com StatusHistory
    if (this.historyDAO) {
      try {
        const historyList = await this.historyDAO.findByOrderId(order.id);
        if (historyList && historyList.length > 0) {
          order.historicoStatus = historyList.map((h) => ({
            id: h.id,
            de: h.statusAnterior,
            para: h.statusNovo,
            data: h.createdAt,
            usuario: h.usuario,
            observacao: h.observacao,
          }));
        }
      } catch (e) {
        console.warn('[GetServiceOrderByIdCommand] Aviso ao carregar histórico 1:N:', e);
      }
    }

    return order;
  }
}
