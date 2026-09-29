/**
 * Model: TechnicalReport
 * Entidade de domínio para Laudo Técnico Pericial Especializado.
 * Relacionamento 1:1 ESTRITO com ServiceOrder (uma O.S. possui no máximo um laudo técnico único).
 */
export class TechnicalReportModel {
  public readonly id: string;
  public readonly serviceOrderId: string; // Chave estrangeira 1:1 UNIQUE
  public diagnostico: string;
  public servicoRealizado: string;
  public pecasUtilizadas?: string;
  public observacaoTecnica?: string;
  public tecnicoResponsavel: string;
  public dataAnalise: string; // ISO string
  public readonly createdAt: string;
  public updatedAt: string;

  constructor(data: {
    id?: string;
    serviceOrderId: string;
    diagnostico: string;
    servicoRealizado: string;
    pecasUtilizadas?: string;
    observacaoTecnica?: string;
    tecnicoResponsavel: string;
    dataAnalise?: string;
    createdAt?: string;
    updatedAt?: string;
  }) {
    if (!data.serviceOrderId) {
      throw new Error('TechnicalReport requer a vinculação obrigatória a uma ServiceOrder (1:1).');
    }
    this.id = data.id || `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.serviceOrderId = data.serviceOrderId;
    this.diagnostico = (data.diagnostico || '').trim();
    this.servicoRealizado = (data.servicoRealizado || '').trim();
    this.pecasUtilizadas = data.pecasUtilizadas?.trim() || undefined;
    this.observacaoTecnica = data.observacaoTecnica?.trim() || undefined;
    this.tecnicoResponsavel = (data.tecnicoResponsavel || 'Técnico Responsável N! GAMES').trim();
    this.dataAnalise = data.dataAnalise || new Date().toISOString();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.serviceOrderId) errors.push('serviceOrderId é obrigatório para vínculo 1:1');
    if (!this.diagnostico) errors.push('Diagnóstico técnico pericial é obrigatório');
    if (!this.servicoRealizado) errors.push('Serviço realizado é obrigatório');
    if (!this.tecnicoResponsavel) errors.push('Nome do técnico responsável é obrigatório');
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toJSON() {
    return {
      id: this.id,
      serviceOrderId: this.serviceOrderId,
      diagnostico: this.diagnostico,
      servicoRealizado: this.servicoRealizado,
      pecasUtilizadas: this.pecasUtilizadas,
      observacaoTecnica: this.observacaoTecnica,
      tecnicoResponsavel: this.tecnicoResponsavel,
      dataAnalise: this.dataAnalise,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
