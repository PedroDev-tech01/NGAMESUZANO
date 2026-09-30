import { describe, it, expect, vi } from 'vitest';
import { UpdateServiceOrderCommand } from '../src/commands/UpdateServiceOrderCommand';
import { ServiceOrder } from '../src/types';
import { createMockOrderDAO } from './mocks';

describe('UpdateServiceOrderCommand (Command Pattern)', () => {
  it('deve atualizar os dados técnicos da Ordem de Serviço preservando o registro', async () => {
    const existingOrder: ServiceOrder = {
      id: 'ord-test-1',
      numero: 150030,
      clienteId: 'cpf-11111111111',
      situacao: 'Em aberto',
      canal: 'Presencial',
      entrada: new Date().toISOString(),
      equipamento: 'Xbox One S',
      defeito: 'Sem imagem na HDMI',
      valor: 200,
      createdAt: new Date().toISOString(),
    };

    const mockOrderDAO = createMockOrderDAO({
      findById: vi.fn().mockResolvedValue(existingOrder),
      update: vi.fn().mockImplementation(async (id: string, patch: Partial<ServiceOrder>) => {
        return { ...existingOrder, ...patch };
      }),
    });

    const command = new UpdateServiceOrderCommand(mockOrderDAO);

    const result = await command.execute({
      id: 'ord-test-1',
      equipamento: 'Xbox One S 1TB',
      valor: 280,
      pecas: 80,
      maoObra: 200,
      obs: 'Conector HDMI substituído com sucesso',
    });

    expect(mockOrderDAO.findById).toHaveBeenCalledWith('ord-test-1');
    expect(mockOrderDAO.update).toHaveBeenCalledWith('ord-test-1', expect.objectContaining({
      equipamento: 'Xbox One S 1TB',
      valor: 280,
    }));
    expect(result.valor).toBe(280);
    expect(result.equipamento).toBe('Xbox One S 1TB');
  });

  it('deve lançar erro se a ordem de serviço não for localizada', async () => {
    const mockOrderDAO = createMockOrderDAO({
      findById: vi.fn().mockResolvedValue(null),
    });

    const command = new UpdateServiceOrderCommand(mockOrderDAO);

    await expect(
      command.execute({
        id: 'ord-inexistente',
        equipamento: 'Console',
      })
    ).rejects.toThrow(/não encontrada/);
  });
});
