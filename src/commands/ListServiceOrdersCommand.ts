/**
 * Command: ListServiceOrdersCommand
 * Implementa o Command Pattern para listagem de Ordens de Serviço com suporte a filtros de status e busca.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { ServiceOrder, OrderStatus } from '../types';

export interface ListServiceOrdersInput {
  status?: OrderStatus;
  clientId?: string;
}

export class ListServiceOrdersCommand implements ICommand<ListServiceOrdersInput, ServiceOrder[]> {
  constructor(private orderDAO: IServiceOrderDAO) {}

  async execute(input?: ListServiceOrdersInput): Promise<ServiceOrder[]> {
    if (input?.status) {
      return await this.orderDAO.findByStatus(input.status);
    }
    if (input?.clientId) {
      return await this.orderDAO.findByClientId(input.clientId);
    }
    return await this.orderDAO.findAll();
  }
}
