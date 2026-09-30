/**
 * Composition Root para a ServiceOrderCommandFactory.
 * Centraliza o registro dos comandos concretos mantendo a Factory desacoplada.
 */
import { ServiceOrderCommandFactory } from './ServiceOrderCommandFactory';
import { IServiceOrderDAO } from '../interfaces/IServiceOrderDAO';
import { IStatusHistoryDAO } from '../interfaces/IStatusHistoryDAO';
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import { CreateServiceOrderCommand } from '../commands/CreateServiceOrderCommand';
import { UpdateServiceOrderCommand } from '../commands/UpdateServiceOrderCommand';
import { DeleteServiceOrderCommand } from '../commands/DeleteServiceOrderCommand';
import { GetServiceOrderByIdCommand } from '../commands/GetServiceOrderByIdCommand';
import { ListServiceOrdersCommand } from '../commands/ListServiceOrdersCommand';
import { ChangeServiceOrderStatusCommand } from '../commands/ChangeServiceOrderStatusCommand';

export interface ServiceOrderCommandFactoryDependencies {
  orderDAO?: IServiceOrderDAO;
  serviceOrderDAO?: IServiceOrderDAO;
  statusHistoryDAO?: IStatusHistoryDAO;
  technicalReportDAO?: ITechnicalReportDAO;
}

/**
 * Função de composição que instancia a ServiceOrderCommandFactory e registra
 * os Command Creators concretos para cada operação de Ordem de Serviço.
 */
export function createServiceOrderCommandFactory(
  depsOrOrderDAO: ServiceOrderCommandFactoryDependencies | IServiceOrderDAO,
  historyDAO?: IStatusHistoryDAO,
  reportDAO?: ITechnicalReportDAO
): ServiceOrderCommandFactory {
  let orderDAO: IServiceOrderDAO;
  let statusHistoryDAO: IStatusHistoryDAO | undefined;
  let technicalReportDAO: ITechnicalReportDAO | undefined;

  if (depsOrOrderDAO && typeof (depsOrOrderDAO as any).findAll === 'function') {
    orderDAO = depsOrOrderDAO as IServiceOrderDAO;
    statusHistoryDAO = historyDAO;
    technicalReportDAO = reportDAO;
  } else {
    const deps = (depsOrOrderDAO || {}) as ServiceOrderCommandFactoryDependencies;
    const resolvedOrderDAO = deps.orderDAO || deps.serviceOrderDAO;
    if (!resolvedOrderDAO) {
      throw new Error('orderDAO ou serviceOrderDAO é obrigatório para inicializar os comandos.');
    }
    orderDAO = resolvedOrderDAO;
    statusHistoryDAO = deps.statusHistoryDAO;
    technicalReportDAO = deps.technicalReportDAO;
  }

  const factory = new ServiceOrderCommandFactory();

  // Registro dinâmico de criadores de comando (Command Creators)
  factory.register('CREATE', () => new CreateServiceOrderCommand(orderDAO, statusHistoryDAO));
  factory.register('UPDATE', () => new UpdateServiceOrderCommand(orderDAO));
  factory.register('DELETE', () => new DeleteServiceOrderCommand(orderDAO, technicalReportDAO, statusHistoryDAO));
  factory.register('GET_BY_ID', () => new GetServiceOrderByIdCommand(orderDAO, technicalReportDAO, statusHistoryDAO));
  factory.register('LIST', () => new ListServiceOrdersCommand(orderDAO));
  factory.register('CHANGE_STATUS', () => new ChangeServiceOrderStatusCommand(orderDAO, statusHistoryDAO));

  return factory;
}
