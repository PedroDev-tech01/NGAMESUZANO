/**
 * Factory para criação desacoplada dos comandos de Ordens de Serviço.
 * Fornece injeção de dependências para DAOs de persistência, histórico e laudos.
 */
import { ICommand } from '../interfaces/ICommand';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import {
  CreateServiceOrderCommand,
  CreateServiceOrderInput,
} from '../commands/CreateServiceOrderCommand';
import {
  UpdateServiceOrderCommand,
  UpdateServiceOrderInput,
} from '../commands/UpdateServiceOrderCommand';
import {
  DeleteServiceOrderCommand,
  DeleteServiceOrderInput,
} from '../commands/DeleteServiceOrderCommand';
import {
  GetServiceOrderByIdCommand,
  GetServiceOrderByIdInput,
} from '../commands/GetServiceOrderByIdCommand';
import {
  ListServiceOrdersCommand,
  ListServiceOrdersInput,
} from '../commands/ListServiceOrdersCommand';
import {
  ChangeServiceOrderStatusCommand,
  ChangeServiceOrderStatusInput,
} from '../commands/ChangeServiceOrderStatusCommand';
import { ServiceOrder } from '../types';

export type ServiceOrderCommandType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'GET_BY_ID'
  | 'LIST'
  | 'CHANGE_STATUS';

export interface CommandMap {
  CREATE: ICommand<CreateServiceOrderInput, ServiceOrder>;
  UPDATE: ICommand<UpdateServiceOrderInput, ServiceOrder>;
  DELETE: ICommand<DeleteServiceOrderInput, boolean>;
  GET_BY_ID: ICommand<GetServiceOrderByIdInput, ServiceOrder | null>;
  LIST: ICommand<ListServiceOrdersInput | undefined, ServiceOrder[]>;
  CHANGE_STATUS: ICommand<ChangeServiceOrderStatusInput, ServiceOrder>;
}

export class ServiceOrderCommandFactory {
  constructor(
    private orderDAO: IServiceOrderDAO,
    private historyDAO?: IStatusHistoryDAO,
    private reportDAO?: ITechnicalReportDAO
  ) {}

  /**
   * Cria o Command correspondente de acordo com o tipo solicitado.
   * Evita switches complexos e estruturas acopladas em Controllers.
   */
  public createCommand<K extends ServiceOrderCommandType>(type: K): CommandMap[K] {
    switch (type) {
      case 'CREATE':
        return new CreateServiceOrderCommand(
          this.orderDAO,
          this.historyDAO
        ) as unknown as CommandMap[K];

      case 'UPDATE':
        return new UpdateServiceOrderCommand(this.orderDAO) as unknown as CommandMap[K];

      case 'DELETE':
        return new DeleteServiceOrderCommand(
          this.orderDAO,
          this.reportDAO,
          this.historyDAO
        ) as unknown as CommandMap[K];

      case 'GET_BY_ID':
        return new GetServiceOrderByIdCommand(
          this.orderDAO,
          this.reportDAO,
          this.historyDAO
        ) as unknown as CommandMap[K];

      case 'LIST':
        return new ListServiceOrdersCommand(this.orderDAO) as unknown as CommandMap[K];

      case 'CHANGE_STATUS':
        return new ChangeServiceOrderStatusCommand(
          this.orderDAO,
          this.historyDAO
        ) as unknown as CommandMap[K];

      default:
        throw new Error(`Tipo de comando não suportado: ${type}`);
    }
  }
}
