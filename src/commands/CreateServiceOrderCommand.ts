/**
 * Command: CreateServiceOrderCommand
 * Implementa o Command Pattern para a criação e registro de nova Ordem de Serviço.
 * Utiliza o ServiceOrderBuilder para construir e validar a entidade com rigor.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ServiceOrderBuilder } from '../builders/ServiceOrderBuilder';
import { ServiceOrder } from '../types';

export interface CreateServiceOrderInput {
  clienteId: string;
  equipamento: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  defeito?: string;
  estadoConsole?: string;
  itens?: any[];
  valor?: number;
  maoObra?: number;
  pecas?: number;
  desconto?: number;
  obs?: string;
  canal?: any;
  situacao?: any;
  prazo?: string;
  entrada?: string;
}

export class CreateServiceOrderCommand implements ICommand<CreateServiceOrderInput, ServiceOrder> {
  constructor(
    private orderDAO: IServiceOrderDAO,
    private historyDAO?: IStatusHistoryDAO
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    const nextSeq = await this.orderDAO.incrementSequence();
    const entryDate = input.entrada || new Date().toISOString();

    const order = ServiceOrderBuilder.create()
      .withNumber(nextSeq)
      .withClient(input.clienteId)
      .withEquipment(input.equipamento)
      .withBrand(input.marca)
      .withModel(input.modelo)
      .withSerialNumber(input.serie)
      .withProblem(input.defeito)
      .withConsoleCondition(input.estadoConsole)
      .withItems(input.itens)
      .withValue(input.valor ?? 0)
      .withLabor(input.maoObra)
      .withParts(input.pecas)
      .withDiscount(input.desconto)
      .withObservations(input.obs)
      .withChannel(input.canal || 'Presencial')
      .withStatus(input.situacao || 'Em aberto')
      .withEntryDate(entryDate)
      .withDeadline(input.prazo)
      .build();

    const createdOrder = await this.orderDAO.create(order);

    // Registro automático da abertura no histórico persistente (Automação de processo)
    if (this.historyDAO && createdOrder.id) {
      try {
        await this.historyDAO.create({
          id: `hist-init-${createdOrder.id}`,
          serviceOrderId: createdOrder.id,
          statusAnterior: 'Criada',
          statusNovo: createdOrder.situacao,
          observacao: 'Abertura da Ordem de Serviço na N! GAMES',
          usuario: 'Sistema / Atendente',
          createdAt: entryDate,
        });
      } catch (err) {
        console.warn('[CreateServiceOrderCommand] Aviso ao persistir histórico inicial:', err);
      }
    }

    return createdOrder;
  }
}
