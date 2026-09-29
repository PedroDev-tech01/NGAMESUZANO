/**
 * Interface IClientDAO
 * Contrato de persistência para a entidade Client (DAO Pattern).
 * Desacopla regras de negócio e controllers da tecnologia de persistência (Supabase/PostgreSQL/Cache).
 */
import { Client } from '../types';

export interface IClientDAO {
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  findByCpf(cpf: string): Promise<Client | null>;
  create(client: Client): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<Client>;
  delete(id: string): Promise<boolean>;
}
