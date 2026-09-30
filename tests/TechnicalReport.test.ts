import { describe, it, expect, vi } from 'vitest';
import { TechnicalReportController } from '../src/controllers/TechnicalReportController';
import { ITechnicalReportDAO } from '../src/interfaces/ITechnicalReportDAO';
import { TechnicalReport } from '../src/types';

describe('TechnicalReport (Relacionamento 1:1 e Validação)', () => {
  it('deve criar um laudo técnico com dados consistentes', async () => {
    let savedReport: TechnicalReport | null = null;
    const mockDAO: ITechnicalReportDAO = {
      findByOrderId: vi.fn().mockResolvedValue(null), // Não possui laudo ainda
      findById: vi.fn(),
      create: vi.fn().mockImplementation(async (data: TechnicalReport) => {
        savedReport = data;
        return data;
      }),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = new TechnicalReportController(mockDAO);

    const report = await controller.createReport({
      serviceOrderId: 'ord-100',
      diagnostico: 'Curto circuito na linha de 12V da fonte secundária',
      servicoRealizado: 'Substituição de regulador de tensão e capacitores cerâmicos',
      pecasUtilizadas: '1x CI Regulador, 2x Capacitores 10uF',
      tecnicoResponsavel: 'Técnico Especialista N! Games',
    });

    expect(report).toBeDefined();
    expect(report.serviceOrderId).toBe('ord-100');
    expect(report.diagnostico).toContain('Curto circuito');
    expect(mockDAO.create).toHaveBeenCalledTimes(1);
  });

  it('deve impedir a criação de um segundo laudo para a mesma ordem (Regra 1:1 Estrita)', async () => {
    const existingReport: TechnicalReport = {
      id: 'rep-existing-1',
      serviceOrderId: 'ord-100',
      diagnostico: 'Diagnóstico prévio existente',
      servicoRealizado: 'Serviço anterior',
      tecnicoResponsavel: 'Técnico 1',
      dataAnalise: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockDAO: ITechnicalReportDAO = {
      findByOrderId: vi.fn().mockResolvedValue(existingReport), // Já possui laudo
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = new TechnicalReportController(mockDAO);

    await expect(
      controller.createReport({
        serviceOrderId: 'ord-100',
        diagnostico: 'Tentativa de segundo laudo',
        servicoRealizado: 'Novo reparo',
        tecnicoResponsavel: 'Técnico 2',
      })
    ).rejects.toThrow(/Regra 1:1 violada/);

    expect(mockDAO.create).not.toHaveBeenCalled();
  });
});
