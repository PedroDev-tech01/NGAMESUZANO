/**
 * Controlador de fluxo para operações de Clientes.
 * Valida dados de entrada, executa regras de higienização de CPF/Telefone e orquestra operações.
 */
import { IClientDAO } from '../interfaces/IClientDAO';
import { Client } from '../types';
import { onlyDigits, formatCPF, formatPhone, validateCPF, validatePhone } from '../utils/formatters';

export class ClientController {
  constructor(private clientDAO: IClientDAO) {}

  public async listClients(): Promise<Client[]> {
    return await this.clientDAO.findAll();
  }

  public async getClientById(id: string): Promise<Client | null> {
    if (!id || !id.trim()) {
      throw new Error('ID do cliente é obrigatório para consulta.');
    }
    return await this.clientDAO.findById(id.trim());
  }

  public async getClientByCpf(cpf: string): Promise<Client | null> {
    const digits = onlyDigits(cpf);
    if (!digits) {
      throw new Error('CPF válido é obrigatório para busca.');
    }
    return await this.clientDAO.findByCpf(digits);
  }

  public async createClient(input: Partial<Client>): Promise<Client> {
    if (!input.cpf || !input.telefone) {
      throw new Error('CPF e Telefone são campos obrigatórios para cadastro.');
    }

    const cpfValidation = validateCPF(input.cpf);
    if (!cpfValidation.isValid) {
      throw new Error(cpfValidation.error || 'CPF inválido.');
    }

    const phoneValidation = validatePhone(input.telefone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error || 'Telefone inválido.');
    }

    const cleanCpfDigits = onlyDigits(input.cpf);
    const existing = await this.clientDAO.findByCpf(cleanCpfDigits);
    if (existing) {
      throw new Error(`Conflito: Já existe um cliente cadastrado com o CPF ${formatCPF(input.cpf)} (${existing.nome}).`);
    }

    const cleanNome = (input.nome || '').trim();
    const finalNome = cleanNome
      ? cleanNome.toUpperCase()
      : `CLIENTE (${formatCPF(cleanCpfDigits)})`;

    const clientToCreate: Client = {
      id: input.id || `cpf-${cleanCpfDigits}`,
      nome: finalNome,
      cpf: formatCPF(cleanCpfDigits),
      telefone: formatPhone(input.telefone),
      cep: input.cep ? input.cep.trim() : undefined,
      endereco: input.endereco ? input.endereco.trim() : undefined,
      email: input.email ? input.email.trim() : undefined,
      nascimento: input.nascimento ? input.nascimento.trim() : undefined,
      obs: input.obs ? input.obs.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    return await this.clientDAO.create(clientToCreate);
  }

  public async updateClient(id: string, input: Partial<Client>): Promise<Client> {
    const existing = await this.clientDAO.findById(id);
    if (!existing) {
      throw new Error(`Cliente ${id} não localizado para atualização.`);
    }

    let finalCpf = existing.cpf;
    if (input.cpf && input.cpf !== existing.cpf) {
      const cpfValidation = validateCPF(input.cpf);
      if (!cpfValidation.isValid) {
        throw new Error(cpfValidation.error || 'CPF inválido.');
      }
      const newDigits = onlyDigits(input.cpf);
      const duplicate = await this.clientDAO.findByCpf(newDigits);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`O CPF informado já está vinculado ao cliente ${duplicate.nome}.`);
      }
      finalCpf = formatCPF(newDigits);
    }

    let finalTelefone = existing.telefone;
    if (input.telefone && input.telefone !== existing.telefone) {
      const phoneValidation = validatePhone(input.telefone);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error || 'Telefone inválido.');
      }
      finalTelefone = formatPhone(input.telefone);
    }

    const patch: Partial<Client> = {
      ...input,
      nome: input.nome !== undefined ? (input.nome.trim() ? input.nome.trim().toUpperCase() : existing.nome) : existing.nome,
      cpf: finalCpf,
      telefone: finalTelefone,
    };

    return await this.clientDAO.update(id, patch);
  }

  public async deleteClient(id: string): Promise<boolean> {
    const existing = await this.clientDAO.findById(id);
    if (!existing) {
      return false;
    }
    return await this.clientDAO.delete(id);
  }
}
