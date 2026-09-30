import { describe, it, expect } from 'vitest';
import { ServiceOrderBuilder } from '../src/builders/ServiceOrderBuilder';

describe('ServiceOrderBuilder (Builder Pattern)', () => {
  it('deve construir uma Ordem de Serviço válida com campos obrigatórios e defaults', () => {
    const order = ServiceOrderBuilder.create()
      .withNumber(150005)
      .withClient('cpf-12345678901')
      .withEquipment('PlayStation 5')
      .withProblem('Não liga / Luz azul pulsante')
      .withValue(350)
      .withChannel('Presencial')
      .withStatus('Em aberto')
      .build();

    expect(order).toBeDefined();
    expect(order.numero).toBe(150005);
    expect(order.clienteId).toBe('cpf-12345678901');
    expect(order.equipamento).toBe('PlayStation 5');
    expect(order.defeito).toBe('Não liga / Luz azul pulsante');
    expect(order.valor).toBe(350);
    expect(order.situacao).toBe('Em aberto');
    expect(order.canal).toBe('Presencial');
    expect(order.createdAt).toBeDefined();
    expect(order.id).toBeDefined();
  });

  it('deve lançar erro se o equipamento ou itens não forem informados', () => {
    expect(() => {
      ServiceOrderBuilder.create()
        .withNumber(150006)
        .withClient('cpf-12345678901')
        .withEquipment('') // Vazio
        .build();
    }).toThrow(/equipamento/i);
  });

  it('deve lançar erro se o clienteId não for informado', () => {
    expect(() => {
      ServiceOrderBuilder.create()
        .withNumber(150007)
        .withEquipment('Xbox Series X')
        .build();
    }).toThrow(/cliente/i);
  });

  it('deve calcular corretamente valor, mão de obra, peças e desconto', () => {
    const order = ServiceOrderBuilder.create()
      .withNumber(150008)
      .withClient('cpf-99988877766')
      .withEquipment('Nintendo Switch OLED')
      .withLabor(200)
      .withParts(150)
      .withDiscount(30)
      .withValue(320)
      .build();

    expect(order.maoObra).toBe(200);
    expect(order.pecas).toBe(150);
    expect(order.desconto).toBe(30);
    expect(order.valor).toBe(320);
  });

  it('deve permitir encadeamento fluente com mais de 10 atributos de domínio', () => {
    const order = ServiceOrderBuilder.create()
      .withNumber(150009)
      .withClient('cpf-11122233344')
      .withEquipment('DualSense PS5')
      .withBrand('Sony')
      .withModel('CFI-ZCT1W')
      .withSerialNumber('AK78912345')
      .withProblem('Drift analógico esquerdo')
      .withConsoleCondition('Lacre intacto, riscos leves na carcaça')
      .withObservations('Cliente necessita entrega com urgência')
      .withChannel('WhatsApp')
      .withStatus('Em andamento')
      .withLabor(120)
      .withParts(60)
      .withValue(180)
      .build();

    expect(order.marca).toBe('Sony');
    expect(order.modelo).toBe('CFI-ZCT1W');
    expect(order.serie).toBe('AK78912345');
    expect(order.estadoConsole).toContain('Lacre intacto');
    expect(order.obs).toContain('urgência');
  });
});
