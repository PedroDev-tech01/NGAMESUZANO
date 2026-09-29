/**
 * Model: Client
 * Entidade de domínio representando o Cliente da assistência técnica.
 * Relacionamento 1:N com ServiceOrder (um Cliente possui N Ordens de Serviço).
 */
import { onlyDigits, formatCPF, formatPhone, formatCEP, validateCPF, validatePhone } from '../utils/formatters';

export class ClientModel {
  public readonly id: string;
  public nome: string;
  public cpf: string;
  public telefone: string;
  public cep?: string;
  public email?: string;
  public nascimento?: string;
  public endereco?: string;
  public obs?: string;
  public readonly createdAt: string;

  constructor(data: {
    id?: string;
    nome: string;
    cpf: string;
    telefone: string;
    cep?: string;
    email?: string;
    nascimento?: string;
    endereco?: string;
    obs?: string;
    createdAt?: string;
  }) {
    const cleanCpfDigits = onlyDigits(data.cpf || '');
    this.id = data.id || (cleanCpfDigits.length === 11 ? `cpf-${cleanCpfDigits}` : `cli-${Date.now().toString(36)}`);
    this.nome = (data.nome || '').trim().toUpperCase();
    this.cpf = formatCPF(data.cpf);
    this.telefone = formatPhone(data.telefone);
    this.cep = data.cep ? formatCEP(data.cep) : undefined;
    this.email = data.email?.trim() || undefined;
    this.nascimento = data.nascimento?.trim() || undefined;
    this.endereco = data.endereco?.trim() || undefined;
    this.obs = data.obs?.trim() || undefined;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const cpfVal = validateCPF(this.cpf);
    if (!cpfVal.isValid) {
      errors.push(cpfVal.error || 'CPF inválido');
    }
    const phoneVal = validatePhone(this.telefone);
    if (!phoneVal.isValid) {
      errors.push(phoneVal.error || 'Telefone inválido');
    }
    if (!this.nome.trim()) {
      errors.push('O nome do cliente é obrigatório');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      cpf: this.cpf,
      telefone: this.telefone,
      cep: this.cep,
      email: this.email,
      nascimento: this.nascimento,
      endereco: this.endereco,
      obs: this.obs,
      createdAt: this.createdAt,
    };
  }
}
