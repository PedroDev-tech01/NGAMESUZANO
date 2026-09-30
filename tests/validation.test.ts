import { describe, it, expect } from 'vitest';
import {
  CreateServiceOrderSchema,
  UpdateServiceOrderSchema,
  ChangeStatusSchema,
  CreateClientSchema,
  LoginSchema,
  TechnicalReportSchema,
} from '../src/validators/schemas';

describe('Validações de Entrada (Zod Schemas)', () => {
  it('LoginSchema deve validar CNPJ e senha com restrições mínimas', () => {
    const valid = LoginSchema.safeParse({
      cnpj: '34467363000153',
      senha: 'SenhaForte123',
    });
    expect(valid.success).toBe(true);

    const invalid = LoginSchema.safeParse({
      cnpj: '123',
      senha: '12',
    });
    expect(invalid.success).toBe(false);
  });

  it('CreateClientSchema deve exigir CPF e telefone', () => {
    const valid = CreateClientSchema.safeParse({
      nome: 'CARLA SILVA',
      cpf: '123.456.789-00',
      telefone: '(11) 98765-4321',
      cep: '01310-100',
    });
    expect(valid.success).toBe(true);

    const missingCpf = CreateClientSchema.safeParse({
      nome: 'CARLA SILVA',
      telefone: '(11) 98765-4321',
    });
    expect(missingCpf.success).toBe(false);
  });

  it('CreateServiceOrderSchema deve exigir clienteId e equipamento', () => {
    const valid = CreateServiceOrderSchema.safeParse({
      clienteId: 'cpf-12345678900',
      equipamento: 'PlayStation 5 Digital',
      valor: 350,
      canal: 'Presencial',
      situacao: 'Em aberto',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateServiceOrderSchema.safeParse({
      valor: 350,
    });
    expect(invalid.success).toBe(false);
  });

  it('ChangeStatusSchema deve exigir situacao ou newStatus válidos', () => {
    const valid = ChangeStatusSchema.safeParse({
      situacao: 'Concluído',
      observacao: 'Reparo finalizado com testes',
    });
    expect(valid.success).toBe(true);

    const invalidStatus = ChangeStatusSchema.safeParse({
      situacao: 'STATUS_INVALIDO_INEXISTENTE' as any,
    });
    expect(invalidStatus.success).toBe(false);
  });

  it('TechnicalReportSchema deve exigir diagnóstico, serviço realizado e técnico responsável', () => {
    const valid = TechnicalReportSchema.safeParse({
      diagnostico: 'Oxidação na placa controladora do HDMI',
      servicoRealizado: 'Desoxidação ultrassônica e ressolda',
      tecnicoResponsavel: 'Técnico Especialista',
    });
    expect(valid.success).toBe(true);

    const missingTech = TechnicalReportSchema.safeParse({
      diagnostico: 'Oxidação',
      servicoRealizado: 'Limpeza',
      tecnicoResponsavel: '', // Vazio
    });
    expect(missingTech.success).toBe(false);
  });
});
