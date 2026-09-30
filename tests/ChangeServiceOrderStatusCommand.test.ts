import { describe, it, expect, vi } from 'vitest';
import { ChangeServiceOrderStatusCommand } from '../src/commands/ChangeServiceOrderStatusCommand';
import { ServiceOrder } from '../src/types';
import { createMockOrderDAO, createMockHistoryDAO } from './mocks';

describe('ChangeServiceOrderStatusCommand (Automação de regras & Histórico)', () => {
  it('deve automatizar a data de conclusão (saida) ao mudar para "Concluído" e registrar histórico 1:N', async () => {
    const existingOrder: ServiceOrder = {
      id: 'ord-status-1',
      numero: 150040,
      clienteId: 'cpf-22222222222',
      situacao: 'Em andamento',
      canal: 'Presencial',
      entrada: '2026-09-01T10:00:00.000Z',
      equipamento: 'PlayStation 5',
      valor: 450,
      createdAt: '2026-09-01T10:00:00.000Z',
    };

    const mockOrderDAO = createMockOrderDAO({
      findById: vi.fn().mockResolvedValue(existingOrder),
      update: vi.fn().mockImplementation(async (id: string, patch: Partial<ServiceOrder>) => ({
        ...existingOrder,
        ...patch,
      })),
    });

    const mockHistoryDAO = createMockHistoryDAO({
      create: vi.fn().mockResolvedValue({
        id: 'hist-concluido',
        serviceOrderId: 'ord-status-1',
        statusAnterior: 'Em andamento',
        statusNovo: 'Concluído',
        createdAt: new Date().toISOString(),
      }),
    });

    const command = new ChangeServiceOrderStatusCommand(mockOrderDAO, mockHistoryDAO);

    const result = await command.execute({
      orderId: 'ord-status-1',
      newStatus: 'Concluído',
      observacao: 'Troca de pasta térmica e limpeza completa realizada',
      usuario: 'Técnico Especialista',
    });

    expect(result.situacao).toBe('Concluído');
    expect(result.saida).toBeDefined();
    expect(result.historicoStatus).toBeDefined();
    expect(result.historicoStatus?.length).toBeGreaterThan(0);
    expect(mockHistoryDAO.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusAnterior: 'Em andamento',
        statusNovo: 'Concluído',
      })
    );
  });

  it('deve registrar dataRetorno e motivo ao mudar status para "Retornou com defeito"', async () => {
    const existingOrder: ServiceOrder = {
      id: 'ord-status-2',
      numero: 150041,
      clienteId: 'cpf-33333333333',
      situacao: 'Concluído',
      canal: 'Presencial',
      entrada: '2026-09-01T10:00:00.000Z',
      saida: '2026-09-05T15:00:00.000Z',
      equipamento: 'Nintendo Switch',
      valor: 200,
      createdAt: '2026-09-01T10:00:00.000Z',
    };

    const mockOrderDAO = createMockOrderDAO({
      findById: vi.fn().mockResolvedValue(existingOrder),
      update: vi.fn().mockImplementation(async (id: string, patch: Partial<ServiceOrder>) => ({
        ...existingOrder,
        ...patch,
      })),
    });

    const mockHistoryDAO = createMockHistoryDAO({
      create: vi.fn().mockResolvedValue({} as any),
    });

    const command = new ChangeServiceOrderStatusCommand(mockOrderDAO, mockHistoryDAO);

    const result = await command.execute({
      orderId: 'ord-status-2',
      newStatus: 'Retornou com defeito',
      motivoRetorno: 'Joy-con voltou a falhar na sincronização bluetooth',
    });

    expect(result.situacao).toBe('Retornou com defeito');
    expect(result.dataRetorno).toBeDefined();
    expect(result.motivoRetorno).toBe('Joy-con voltou a falhar na sincronização bluetooth');
  });
});
