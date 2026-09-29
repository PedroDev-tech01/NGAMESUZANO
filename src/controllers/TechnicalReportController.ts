/**
 * Controlador de fluxo para emissão e consulta de Laudos Técnicos Periciais (1:1).
 * Gerencia regras de unicidade e validações de integridade técnica.
 */
import { ITechnicalReportDAO } from '../interfaces/ITechnicalReportDAO';
import { TechnicalReport } from '../types';
import { TechnicalReportModel } from '../models/TechnicalReport';

export class TechnicalReportController {
  constructor(private reportDAO: ITechnicalReportDAO) {}

  /**
   * Obtém o Laudo Técnico vinculado a uma Ordem de Serviço (1:1)
   */
  public async getReportByOrderId(serviceOrderId: string): Promise<TechnicalReport | null> {
    if (!serviceOrderId || !serviceOrderId.trim()) {
      throw new Error('serviceOrderId é obrigatório para consulta do laudo pericial.');
    }
    return await this.reportDAO.findByOrderId(serviceOrderId.trim());
  }

  /**
   * Obtém um laudo pelo seu ID único
   */
  public async getReportById(id: string): Promise<TechnicalReport | null> {
    if (!id || !id.trim()) {
      throw new Error('ID do laudo técnico é obrigatório.');
    }
    return await this.reportDAO.findById(id.trim());
  }

  /**
   * Emissão de novo Laudo Técnico com validação de unicidade 1:1
   */
  public async createReport(input: {
    serviceOrderId: string;
    diagnostico: string;
    servicoRealizado: string;
    pecasUtilizadas?: string;
    observacaoTecnica?: string;
    tecnicoResponsavel: string;
    dataAnalise?: string;
  }): Promise<TechnicalReport> {
    if (!input.serviceOrderId || !input.serviceOrderId.trim()) {
      throw new Error('serviceOrderId é obrigatório para emissão do Laudo Técnico (1:1).');
    }

    // Regra de unicidade 1:1
    const existing = await this.reportDAO.findByOrderId(input.serviceOrderId.trim());
    if (existing) {
      throw new Error(
        `Regra 1:1 violada: A Ordem de Serviço ${input.serviceOrderId} já possui um Laudo Técnico cadastrado (#${existing.id}). Atualize o laudo existente em vez de criar um novo.`
      );
    }

    const reportModel = new TechnicalReportModel({
      serviceOrderId: input.serviceOrderId.trim(),
      diagnostico: input.diagnostico,
      servicoRealizado: input.servicoRealizado,
      pecasUtilizadas: input.pecasUtilizadas,
      observacaoTecnica: input.observacaoTecnica,
      tecnicoResponsavel: input.tecnicoResponsavel,
      dataAnalise: input.dataAnalise,
    });

    const validation = reportModel.validate();
    if (!validation.isValid) {
      throw new Error(`Dados inválidos para Laudo Técnico: ${validation.errors.join('; ')}`);
    }

    return await this.reportDAO.create(reportModel.toJSON());
  }

  /**
   * Atualização de Laudo Técnico existente
   */
  public async updateReport(
    serviceOrderId: string,
    input: Partial<TechnicalReport>
  ): Promise<TechnicalReport> {
    if (!serviceOrderId || !serviceOrderId.trim()) {
      throw new Error('serviceOrderId é obrigatório para atualização do Laudo Técnico.');
    }

    const existing = await this.reportDAO.findByOrderId(serviceOrderId.trim());
    if (!existing) {
      throw new Error(`Nenhum Laudo Técnico encontrado para a O.S. ${serviceOrderId}.`);
    }

    return await this.reportDAO.update(serviceOrderId.trim(), input);
  }

  /**
   * Exclusão do Laudo Técnico
   */
  public async deleteReport(serviceOrderId: string): Promise<boolean> {
    if (!serviceOrderId || !serviceOrderId.trim()) {
      throw new Error('serviceOrderId é obrigatório para exclusão.');
    }
    return await this.reportDAO.delete(serviceOrderId.trim());
  }
}
