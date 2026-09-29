/**
 * Interface ITechnicalReportDAO
 * Contrato de persistência para Laudos Técnicos Especializados (DAO Pattern - 1:1 com ServiceOrder).
 */
import { TechnicalReport } from '../types';

export interface ITechnicalReportDAO {
  findByOrderId(serviceOrderId: string): Promise<TechnicalReport | null>;
  findById(id: string): Promise<TechnicalReport | null>;
  create(report: TechnicalReport): Promise<TechnicalReport>;
  update(serviceOrderId: string, data: Partial<TechnicalReport>): Promise<TechnicalReport>;
  delete(serviceOrderId: string): Promise<boolean>;
}
