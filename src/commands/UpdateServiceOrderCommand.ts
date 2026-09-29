/**
 * Command: UpdateServiceOrderCommand
 * Implementa o Command Pattern para a atualização de dados técnicos ou financeiros de uma O.S.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { ServiceOrder } from '../types';

export interface UpdateServiceOrderInput {
  id: string;
  data: Partial<ServiceOrder>;
}

export class UpdateServiceOrderCommand implements ICommand<UpdateServiceOrderInput, ServiceOrder> {
  constructor(private orderDAO: IServiceOrderDAO) {}

  async execute(input: UpdateServiceOrderInput): Promise<ServiceOrder> {
    const existing = await this.orderDAO.findById(input.id);
    if (!existing) {
      throw new Error(`Ordem de serviço #${input.id} não encontrada para atualização.`);
    }

    // Regra de segurança: se a O.S. estiver Concluída, impede sobrescrita acidental de cliente e equipamento
    if (existing.situacao === 'Concluído') {
      delete input.data.clienteId;
      delete input.data.entrada;
    }

    return await this.orderDAO.update(input.id, input.data);
  }
}
