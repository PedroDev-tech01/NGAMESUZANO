/**
 * Model: ServiceOrder (Entidade Principal)
 * Contém mais de 10 atributos de negócio:
 * 1. id
 * 2. numero
 * 3. clienteId (FK 1:N com Client)
 * 4. situacao (OrderStatus)
 * 5. canal (SalesChannel)
 * 6. entrada (ISO datetime)
 * 7. prazo (ISO datetime)
 * 8. saida (ISO datetime)
 * 9. dataRetirada (ISO datetime - ativação garantia legal 90 dias)
 * 10. dataRetorno (ISO datetime - retorno garantia)
 * 11. motivoRetorno (string)
 * 12. equipamento (string)
 * 13. marca (string)
 * 14. modelo (string)
 * 15. serie (string)
 * 16. defeito (string)
 * 17. estadoConsole (string - integridade estética, lacre, avarias)
 * 18. itens (OrderItem[] - múltiplos itens de bancada)
 * 19. valor (numeric - valor total unificado)
 * 20. maoObra (numeric)
 * 21. pecas (numeric)
 * 22. desconto (numeric)
 * 23. obs (string)
 * 24. createdAt (ISO datetime)
 * 25. retornoAt (ISO datetime)
 * 26. technicalReport (1:1 com TechnicalReport)
 * 27. historicoStatus (1:N com StatusHistory)
 */
import { OrderStatus, SalesChannel, OrderItem, StatusHistoryEntry, TechnicalReport } from '../types';

export class ServiceOrderModel {
  public readonly id: string;
  public numero: number;
  public clienteId: string;
  public situacao: OrderStatus;
  public canal: SalesChannel;
  public entrada: string;
  public prazo?: string;
  public saida?: string;
  public dataRetirada?: string;
  public dataRetorno?: string;
  public motivoRetorno?: string;
  public equipamento: string;
  public marca?: string;
  public modelo?: string;
  public serie?: string;
  public defeito?: string;
  public estadoConsole?: string;
  public itens?: OrderItem[];
  public valor: number;
  public maoObra?: number;
  public pecas?: number;
  public desconto?: number;
  public obs?: string;
  public readonly createdAt: string;
  public retornoAt?: string;
  public historicoStatus?: StatusHistoryEntry[];
  public technicalReport?: TechnicalReport | null;

  constructor(data: {
    id?: string;
    numero: number;
    clienteId: string;
    situacao?: OrderStatus;
    canal?: SalesChannel;
    entrada?: string;
    prazo?: string;
    saida?: string;
    dataRetirada?: string;
    dataRetorno?: string;
    motivoRetorno?: string;
    equipamento: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    defeito?: string;
    estadoConsole?: string;
    itens?: OrderItem[];
    valor?: number;
    maoObra?: number;
    pecas?: number;
    desconto?: number;
    obs?: string;
    createdAt?: string;
    retornoAt?: string;
    historicoStatus?: StatusHistoryEntry[];
    technicalReport?: TechnicalReport | null;
  }) {
    if (!data.clienteId) {
      throw new Error('ServiceOrder requer clienteId válido para integridade referencial 1:N');
    }
    this.id = data.id || `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.numero = data.numero;
    this.clienteId = data.clienteId;
    this.situacao = data.situacao || 'Em aberto';
    this.canal = data.canal || 'Presencial';
    this.entrada = data.entrada || new Date().toISOString();
    this.prazo = data.prazo || undefined;
    this.saida = data.saida || undefined;
    this.dataRetirada = data.dataRetirada || undefined;
    this.dataRetorno = data.dataRetorno || undefined;
    this.motivoRetorno = data.motivoRetorno || undefined;
    this.equipamento = (data.equipamento || (data.itens?.[0]?.equipamento || '')).trim();
    this.marca = data.marca?.trim() || undefined;
    this.modelo = data.modelo?.trim() || undefined;
    this.serie = data.serie?.trim() || undefined;
    this.defeito = data.defeito?.trim() || undefined;
    this.estadoConsole = data.estadoConsole?.trim() || undefined;
    this.itens = Array.isArray(data.itens) && data.itens.length > 0 ? data.itens : undefined;
    this.valor = typeof data.valor === 'number' ? Math.max(0, data.valor) : 0;
    this.maoObra = typeof data.maoObra === 'number' ? Math.max(0, data.maoObra) : undefined;
    this.pecas = typeof data.pecas === 'number' ? Math.max(0, data.pecas) : undefined;
    this.desconto = typeof data.desconto === 'number' ? Math.max(0, data.desconto) : undefined;
    this.obs = data.obs?.trim() || undefined;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.retornoAt = data.retornoAt || undefined;
    this.historicoStatus = data.historicoStatus || [];
    this.technicalReport = data.technicalReport || null;
  }

  public isCompleted(): boolean {
    return this.situacao === 'Concluído';
  }

  public hasWarrantyActive(): boolean {
    if (!this.dataRetirada) return false;
    const retiradaDate = new Date(this.dataRetirada).getTime();
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    return now <= retiradaDate + ninetyDaysMs;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.clienteId) errors.push('Cliente é obrigatório');
    if (!this.equipamento && (!this.itens || this.itens.length === 0 || !this.itens[0]?.equipamento)) {
      errors.push('Pelo menos um equipamento é obrigatório');
    }
    if (this.valor < 0 || isNaN(this.valor)) {
      errors.push('Valor total deve ser um número maior ou igual a zero');
    }
    if (this.situacao === 'Retornou com defeito' && !this.dataRetorno) {
      errors.push('Data de retorno é obrigatória para status Retornou com defeito');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toJSON() {
    return {
      id: this.id,
      numero: this.numero,
      clienteId: this.clienteId,
      situacao: this.situacao,
      canal: this.canal,
      entrada: this.entrada,
      prazo: this.prazo,
      saida: this.saida,
      dataRetirada: this.dataRetirada,
      dataRetorno: this.dataRetorno,
      motivoRetorno: this.motivoRetorno,
      equipamento: this.equipamento,
      marca: this.marca,
      modelo: this.modelo,
      serie: this.serie,
      defeito: this.defeito,
      estadoConsole: this.estadoConsole,
      itens: this.itens,
      valor: this.valor,
      maoObra: this.maoObra,
      pecas: this.pecas,
      desconto: this.desconto,
      obs: this.obs,
      createdAt: this.createdAt,
      retornoAt: this.retornoAt,
      historicoStatus: this.historicoStatus,
      technicalReport: this.technicalReport,
    };
  }
}
