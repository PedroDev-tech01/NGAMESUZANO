import { describe, it, expect, vi } from 'vitest';
import { CreateServiceOrderCommand } from '../src/commands/CreateServiceOrderCommand';
import { ServiceOrder } from '../src/types';
import { createMockOrderDAO, createMockHistoryDAO } from './mocks';

describe('CreateServiceOrderCommand (Command Pattern)', () => {
  it('deve executar a criação da O.S., chamar incrementSequence() e registrar histórico inicial', async () => {
    let createdOrderRef: ServiceOrder | null = null;
    const mockOrderDAO = createMockOrderDAO({
      incrementSequence: vi.fn().mockResolvedValue(150020),
      create: vi.fn().mockImplementation(async (order: ServiceOrder) => {
        createdOrderRef = order;
        return order;
      }),
    });

    const mockHistoryDAO = createMockHistoryDAO({
      create: vi.fn().mockResolvedValue({
        id: 'hist-1',
        serviceOrderId: 'ord-123',
        statusAnterior: 'Criada',
        statusNovo: 'Em aberto',
        createdAt: new Date().toISOString(),
      }),
    });

    const command = new CreateServiceOrderCommand(mockOrderDAO, mockHistoryDAO);

    const result = await command.execute({
      clienteId: 'cpf-12345678901',
      equipamento: 'PlayStation 4 Pro',
      defeito: 'Superaquecimento / Desliga sozinho',
      valor: 250,
      canal: 'Presencial',
      situacao: 'Em aberto',
    });

    expect(mockOrderDAO.incrementSequence).toHaveBeenCalledTimes(1);
    expect(mockOrderDAO.create).toHaveBeenCalledTimes(1);
    expect(mockHistoryDAO.create).toHaveBeenCalledTimes(1);
    expect(result.numero).toBe(150020);
    expect(result.equipamento).toBe('PlayStation 4 Pro');
    expect(result.situacao).toBe('Em aberto');
  });
});
