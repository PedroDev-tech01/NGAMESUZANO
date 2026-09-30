import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken, requireAuth, AuthRequest } from '../src/middleware/auth';

describe('Autenticação & Segurança (Bcrypt, JWT e Middleware)', () => {
  it('deve gerar hash bcrypt seguro e comparar senhas corretamente', async () => {
    const rawPassword = 'MinhaSenhaSegura#2026';
    const hash = await bcrypt.hash(rawPassword, 10);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('SenhaErrada', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('deve assinar e verificar tokens JWT com expiração e payload mínimo', () => {
    const payload = {
      cnpj: '34.467.363/0001-53',
      nomeFantasia: 'N! GAMES',
      role: 'admin',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Formato JWT standard header.payload.signature

    const decoded = verifyToken(token);
    expect(decoded.cnpj).toBe('34.467.363/0001-53');
    expect(decoded.nomeFantasia).toBe('N! GAMES');
    expect(decoded.exp).toBeDefined();
  });

  it('deve rejeitar tokens JWT inválidos ou corrompidos', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsig';
    expect(() => verifyToken(invalidToken)).toThrow();
  });

  it('middleware requireAuth deve bloquear requisições sem token (401)', () => {
    const req: Partial<AuthRequest> = {
      headers: {},
    };
    let statusCode = 0;
    let jsonResult: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResult = data;
          },
        };
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    requireAuth(req as AuthRequest, res, next);
    expect(statusCode).toBe(401);
    expect(jsonResult.error).toContain('ausente');
    expect(nextCalled).toBe(false);
  });

  it('middleware requireAuth deve autorizar requisições com token válido no header Bearer', () => {
    const token = signToken({
      cnpj: '34.467.363/0001-53',
      nomeFantasia: 'N! GAMES',
    });

    const req: Partial<AuthRequest> = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    let nextCalled = false;
    const res: any = {
      status: () => ({ json: () => {} }),
    };
    const next = () => {
      nextCalled = true;
    };

    requireAuth(req as AuthRequest, res, next);
    expect(nextCalled).toBe(true);
    expect(req.user?.cnpj).toBe('34.467.363/0001-53');
  });
});
