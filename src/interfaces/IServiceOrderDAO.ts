/**
 * Interface IServiceOrderDAO
 * Contrato de persistência para a entidade ServiceOrder (DAO Pattern).
 * Provê métodos de consulta, filtragem, criação, atualização, exclusão e numeração sequencial.
 */
import { ServiceOrder, OrderStatus } from '../types';

export interface IServiceOrderDAO {
  findAll(): Promise<ServiceOrder[]>;
  findById(id: string): Promise<ServiceOrder | null>;
  findByNumber(numero: number): Promise<ServiceOrder | null>;
  findByClientId(clientId: string): Promise<ServiceOrder[]>;
  findByStatus(status: OrderStatus): Promise<ServiceOrder[]>;
  create(order: ServiceOrder): Promise<ServiceOrder>;
  update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder>;
  delete(id: string): Promise<boolean>;
  getNextSequence(): Promise<number>;
  incrementSequence(): Promise<number>;
}
