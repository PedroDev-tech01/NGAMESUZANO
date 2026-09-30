import { describe, it, expect, vi } from 'vitest';
import { ServiceOrderCommandFactory } from '../src/factories/ServiceOrderCommandFactory';
import { createServiceOrderCommandFactory } from '../src/factories/createServiceOrderCommandFactory';
import { CreateServiceOrderCommand } from '../src/commands/CreateServiceOrderCommand';
import { UpdateServiceOrderCommand } from '../src/commands/UpdateServiceOrderCommand';
import { DeleteServiceOrderCommand } from '../src/commands/DeleteServiceOrderCommand';
import { GetServiceOrderByIdCommand } from '../src/commands/GetServiceOrderByIdCommand';
import { ListServiceOrdersCommand } from '../src/commands/ListServiceOrdersCommand';
import { ChangeServiceOrderStatusCommand } from '../src/commands/ChangeServiceOrderStatusCommand';
import { ICommand } from '../src/interfaces/ICommand';
import { createMockOrderDAO, createMockHistoryDAO, createMockReportDAO } from './mocks';

describe('ServiceOrderCommandFactory (Registry & Factory Method Pattern)', () => {
  const mockOrderDAO = createMockOrderDAO();
  const mockHistoryDAO = createMockHistoryDAO();
  const mockReportDAO = createMockReportDAO();

  const factory = createServiceOrderCommandFactory({
    orderDAO: mockOrderDAO,
    statusHistoryDAO: mockHistoryDAO,
    technicalReportDAO: mockReportDAO,
  });

  describe('Resolução de comandos via Composition Root', () => {
    it('deve instanciar CreateServiceOrderCommand para o tipo CREATE', () => {
      const cmd = factory.createCommand('CREATE');
      expect(cmd).toBeInstanceOf(CreateServiceOrderCommand);
    });

    it('deve instanciar UpdateServiceOrderCommand para o tipo UPDATE', () => {
      const cmd = factory.createCommand('UPDATE');
      expect(cmd).toBeInstanceOf(UpdateServiceOrderCommand);
    });

    it('deve instanciar DeleteServiceOrderCommand para o tipo DELETE', () => {
      const cmd = factory.createCommand('DELETE');
      expect(cmd).toBeInstanceOf(DeleteServiceOrderCommand);
    });

    it('deve instanciar GetServiceOrderByIdCommand para o tipo GET_BY_ID', () => {
      const cmd = factory.createCommand('GET_BY_ID');
      expect(cmd).toBeInstanceOf(GetServiceOrderByIdCommand);
    });

    it('deve instanciar ListServiceOrdersCommand para o tipo LIST', () => {
      const cmd = factory.createCommand('LIST');
      expect(cmd).toBeInstanceOf(ListServiceOrdersCommand);
    });

    it('deve instanciar ChangeServiceOrderStatusCommand para o tipo CHANGE_STATUS', () => {
      const cmd = factory.createCommand('CHANGE_STATUS');
      expect(cmd).toBeInstanceOf(ChangeServiceOrderStatusCommand);
    });

    it('deve lançar erro previsível ao solicitar tipo de comando não registrado', () => {
      expect(() => {
        factory.createCommand('INVALID_TYPE' as any);
      }).toThrow(/não suportado ou não registrado/);
    });
  });

  describe('Extensibilidade e desacoplamento (Open/Closed Principle)', () => {
    it('deve permitir registrar novos comandos dinamicamente sem switch ou alteração interna', async () => {
      const isolatedFactory = new ServiceOrderCommandFactory();

      class MockCustomCommand implements ICommand<{ id: string }, string> {
        async execute(input: { id: string }): Promise<string> {
          return `Executado: ${input.id}`;
        }
      }

      expect(isolatedFactory.hasCommand('CUSTOM_ACTION')).toBe(false);

      isolatedFactory.register('CUSTOM_ACTION', () => new MockCustomCommand());

      expect(isolatedFactory.hasCommand('CUSTOM_ACTION')).toBe(true);
      expect(isolatedFactory.getRegisteredTypes()).toContain('CUSTOM_ACTION');

      const cmd = isolatedFactory.createCommand('CUSTOM_ACTION');
      expect(cmd).toBeInstanceOf(MockCustomCommand);

      const result = await cmd.execute({ id: 'os-999' });
      expect(result).toBe('Executado: os-999');
    });

    it('deve utilizar o creator registrado a cada chamada', () => {
      const isolatedFactory = new ServiceOrderCommandFactory();
      const mockCreator = vi.fn().mockReturnValue({ execute: vi.fn() });

      isolatedFactory.register('TEST_CMD', mockCreator);
      isolatedFactory.createCommand('TEST_CMD');
      isolatedFactory.createCommand('TEST_CMD');

      expect(mockCreator).toHaveBeenCalledTimes(2);
    });
  });
});

