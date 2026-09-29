/**
 * Interface IStatusHistoryDAO
 * Contrato de persistência para o histórico auditado de status (DAO Pattern - 1:N com ServiceOrder).
 */
import { ServiceOrderStatusHistory } from '../types';

export interface IStatusHistoryDAO {
  findByOrderId(serviceOrderId: string): Promise<ServiceOrderStatusHistory[]>;
  create(entry: ServiceOrderStatusHistory): Promise<ServiceOrderStatusHistory>;
  deleteByOrderId(serviceOrderId: string): Promise<boolean>;
}
