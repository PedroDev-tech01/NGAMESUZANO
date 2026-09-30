import { vi } from 'vitest';
import { IServiceOrderDAO } from '../src/interfaces/IServiceOrderDAO';
import { IStatusHistoryDAO } from '../src/interfaces/IStatusHistoryDAO';
import { ITechnicalReportDAO } from '../src/interfaces/ITechnicalReportDAO';

export function createMockOrderDAO(overrides: Partial<IServiceOrderDAO> = {}): IServiceOrderDAO {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByNumber: vi.fn().mockResolvedValue(null),
    findByClientId: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (order) => order),
    update: vi.fn().mockImplementation(async (_id, data) => data as any),
    delete: vi.fn().mockResolvedValue(true),
    getNextSequence: vi.fn().mockResolvedValue(150001),
    incrementSequence: vi.fn().mockResolvedValue(150002),
    ...overrides,
  };
}

export function createMockHistoryDAO(overrides: Partial<IStatusHistoryDAO> = {}): IStatusHistoryDAO {
  return {
    findByOrderId: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (history) => history),
    deleteByOrderId: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function createMockReportDAO(overrides: Partial<ITechnicalReportDAO> = {}): ITechnicalReportDAO {
  return {
    findByOrderId: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (report) => report),
    update: vi.fn().mockImplementation(async (_id, data) => data as any),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}
