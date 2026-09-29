/**
 * Controlador de fluxo para operações de Ordens de Serviço.
 * Valida parâmetros e orquestra a execução via comandos transacionais.
 */
import { ServiceOrderCommandFactory } from '../factories/ServiceOrderCommandFactory';
import { CreateServiceOrderInput } from '../commands/CreateServiceOrderCommand';
import { UpdateServiceOrderInput } from '../commands/UpdateServiceOrderCommand';
import { ListServiceOrdersInput } from '../commands/ListServiceOrdersCommand';
import { ChangeServiceOrderStatusInput } from '../commands/ChangeServiceOrderStatusCommand';
import { ServiceOrder } from '../types';

export class ServiceOrderController {
  constructor(private commandFactory: ServiceOrderCommandFactory) {}

  /**
   * Consulta todas as ordens de serviço com suporte a filtros
   */
  public async listOrders(filters?: ListServiceOrdersInput): Promise<ServiceOrder[]> {
    const command = this.commandFactory.createCommand('LIST');
    return await command.execute(filters);
  }

  /**
   * Obtém os detalhes completos de uma ordem de serviço pelo ID ou Número
   */
  public async getOrderById(idOrNumber: string | number): Promise<ServiceOrder | null> {
    if (!idOrNumber) {
      throw new Error('ID ou Número da O.S. é obrigatório para consulta.');
    }
    const command = this.commandFactory.createCommand('GET_BY_ID');
    return await command.execute({ idOrNumber });
  }

  /**
   * Criação de nova O.S. utilizando Command + Builder internamente
   */
  public async createOrder(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    if (!input.clienteId || !input.clienteId.trim()) {
      throw new Error('Cliente é obrigatório para criar uma Ordem de Serviço.');
    }
    if (!input.equipamento || !input.equipamento.trim()) {
      throw new Error('Equipamento principal é obrigatório para registrar a O.S.');
    }

    const command = this.commandFactory.createCommand('CREATE');
    return await command.execute(input);
  }

  /**
   * Atualização de ordem de serviço existente
   */
  public async updateOrder(input: UpdateServiceOrderInput): Promise<ServiceOrder> {
    if (!input.id || !input.id.trim()) {
      throw new Error('ID da O.S. é obrigatório para atualização.');
    }
    const command = this.commandFactory.createCommand('UPDATE');
    return await command.execute(input);
  }

  /**
   * Exclusão segura de ordem de serviço
   */
  public async deleteOrder(id: string): Promise<boolean> {
    if (!id || !id.trim()) {
      throw new Error('ID da O.S. é obrigatório para exclusão.');
    }
    const command = this.commandFactory.createCommand('DELETE');
    return await command.execute({ id: id.trim() });
  }

  /**
   * Transição auditada de status com automação de regras de negócio
   */
  public async changeStatus(input: ChangeServiceOrderStatusInput): Promise<ServiceOrder> {
    if (!input.orderId || !input.orderId.trim()) {
      throw new Error('ID da O.S. é obrigatório para alteração de status.');
    }
    if (!input.newStatus) {
      throw new Error('Novo status é obrigatório.');
    }
    const command = this.commandFactory.createCommand('CHANGE_STATUS');
    return await command.execute(input);
  }
}
