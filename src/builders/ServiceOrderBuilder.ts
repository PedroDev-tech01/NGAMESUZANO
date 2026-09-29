/**
 * Construtor fluente da entidade ServiceOrder.
 * Centraliza validações de integridade, valores padrão e montagem consistente de dados técnicos.
 */
import { ServiceOrder, OrderStatus, SalesChannel, OrderItem, StatusHistoryEntry, TechnicalReport } from '../types';

export class ServiceOrderBuilder {
  private id?: string;
  private numero?: number;
  private clienteId?: string;
  private situacao: OrderStatus = 'Em aberto';
  private canal: SalesChannel = 'Presencial';
  private entrada: string = new Date().toISOString();
  private prazo?: string;
  private saida?: string;
  private dataRetirada?: string;
  private dataRetorno?: string;
  private motivoRetorno?: string;
  private equipamento: string = '';
  private marca?: string;
  private modelo?: string;
  private serie?: string;
  private defeito?: string;
  private estadoConsole?: string;
  private itens: OrderItem[] = [];
  private valor: number = 0;
  private maoObra?: number;
  private pecas?: number;
  private desconto?: number;
  private obs?: string;
  private createdAt: string = new Date().toISOString();
  private retornoAt?: string;
  private historicoStatus: StatusHistoryEntry[] = [];
  private technicalReport?: TechnicalReport | null;

  constructor() {}

  public static create(): ServiceOrderBuilder {
    return new ServiceOrderBuilder();
  }

  public static fromExisting(order: ServiceOrder): ServiceOrderBuilder {
    const builder = new ServiceOrderBuilder();
    builder.id = order.id;
    builder.numero = order.numero;
    builder.clienteId = order.clienteId;
    builder.situacao = order.situacao;
    builder.canal = order.canal;
    builder.entrada = order.entrada;
    builder.prazo = order.prazo;
    builder.saida = order.saida;
    builder.dataRetirada = order.dataRetirada;
    builder.dataRetorno = order.dataRetorno;
    builder.motivoRetorno = order.motivoRetorno;
    builder.equipamento = order.equipamento;
    builder.marca = order.marca;
    builder.modelo = order.modelo;
    builder.serie = order.serie;
    builder.defeito = order.defeito;
    builder.estadoConsole = order.estadoConsole;
    builder.itens = order.itens ? [...order.itens] : [];
    builder.valor = order.valor;
    builder.maoObra = order.maoObra;
    builder.pecas = order.pecas;
    builder.desconto = order.desconto;
    builder.obs = order.obs;
    builder.createdAt = order.createdAt;
    builder.retornoAt = order.retornoAt;
    builder.historicoStatus = order.historicoStatus ? [...order.historicoStatus] : [];
    builder.technicalReport = order.technicalReport;
    return builder;
  }

  public withId(id: string): this {
    this.id = id;
    return this;
  }

  public withNumber(numero: number): this {
    if (numero <= 0) {
      throw new Error('O número da Ordem de Serviço deve ser um inteiro positivo.');
    }
    this.numero = numero;
    return this;
  }

  public withClient(clientId: string): this {
    if (!clientId || !clientId.trim()) {
      throw new Error('O cliente é obrigatório para a emissão da O.S.');
    }
    this.clienteId = clientId.trim();
    return this;
  }

  public withStatus(status: OrderStatus): this {
    this.situacao = status;
    return this;
  }

  public withChannel(channel: SalesChannel): this {
    this.canal = channel;
    return this;
  }

  public withEquipment(equipment: string): this {
    this.equipamento = (equipment || '').trim();
    return this;
  }

  public withBrand(brand?: string): this {
    this.marca = brand?.trim() || undefined;
    return this;
  }

  public withModel(model?: string): this {
    this.modelo = model?.trim() || undefined;
    return this;
  }

  public withSerialNumber(serial?: string): this {
    this.serie = serial?.trim() || undefined;
    return this;
  }

  public withProblem(defect?: string): this {
    this.defeito = defect?.trim() || undefined;
    return this;
  }

  public withConsoleCondition(condition?: string): this {
    this.estadoConsole = condition?.trim() || undefined;
    return this;
  }

  public withItems(items?: OrderItem[]): this {
    if (Array.isArray(items)) {
      this.itens = items.filter((it) => it && it.equipamento && it.equipamento.trim());
      // Se equipamento principal não estiver definido, sincroniza com o primeiro item
      if (!this.equipamento && this.itens.length > 0) {
        this.equipamento = this.itens[0].equipamento;
      }
    }
    return this;
  }

  public addItem(item: OrderItem): this {
    if (item && item.equipamento) {
      this.itens.push(item);
      if (!this.equipamento) {
        this.equipamento = item.equipamento;
      }
    }
    return this;
  }

  public withValue(total: number): this {
    const val = Number(total);
    if (isNaN(val) || val < 0) {
      throw new Error('O valor total do serviço não pode ser negativo.');
    }
    this.valor = val;
    return this;
  }

  public withLabor(labor?: number): this {
    this.maoObra = labor !== undefined ? Math.max(0, Number(labor)) : undefined;
    return this;
  }

  public withParts(parts?: number): this {
    this.pecas = parts !== undefined ? Math.max(0, Number(parts)) : undefined;
    return this;
  }

  public withDiscount(discount?: number): this {
    this.desconto = discount !== undefined ? Math.max(0, Number(discount)) : undefined;
    return this;
  }

  public withObservations(obs?: string): this {
    this.obs = obs?.trim() || undefined;
    return this;
  }

  public withEntryDate(entryDate?: string): this {
    this.entrada = entryDate || new Date().toISOString();
    return this;
  }

  public withDeadline(deadline?: string): this {
    this.prazo = deadline?.trim() || undefined;
    return this;
  }

  public withExitDate(exitDate?: string): this {
    this.saida = exitDate?.trim() || undefined;
    return this;
  }

  public withPickupDate(pickupDate?: string): this {
    this.dataRetirada = pickupDate?.trim() || undefined;
    return this;
  }

  public withReturnDefect(dataRetorno?: string, motivoRetorno?: string): this {
    this.situacao = 'Retornou com defeito';
    this.dataRetorno = dataRetorno?.trim() || new Date().toISOString();
    this.retornoAt = this.dataRetorno;
    this.motivoRetorno = motivoRetorno?.trim() || undefined;
    return this;
  }

  public withStatusHistory(history?: StatusHistoryEntry[]): this {
    this.historicoStatus = Array.isArray(history) ? [...history] : [];
    return this;
  }

  public addStatusHistoryEntry(entry: StatusHistoryEntry): this {
    this.historicoStatus.push(entry);
    return this;
  }

  public withTechnicalReport(report?: TechnicalReport | null): this {
    this.technicalReport = report;
    return this;
  }

  /**
   * Constrói e valida a entidade ServiceOrder.
   * Lança erro caso campos mandatórios estejam ausentes.
   */
  public build(): ServiceOrder {
    if (!this.clienteId) {
      throw new Error('Validação do Builder falhou: clienteId é campo obrigatório.');
    }

    const primaryEquipment = this.equipamento.trim() || (this.itens.length > 0 ? this.itens[0].equipamento.trim() : '');
    if (!primaryEquipment) {
      throw new Error('Validação do Builder falhou: informe ao menos um equipamento para a Ordem de Serviço.');
    }

    const generatedId = this.id || `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const effectiveNumber = this.numero || 150001;

    // Se a lista de itens não possuir itens explícitos, cria o item primário
    const effectiveItems: OrderItem[] = this.itens.length > 0
      ? this.itens
      : [
          {
            id: 'item-1',
            equipamento: primaryEquipment,
            marca: this.marca,
            modelo: this.modelo,
            serie: this.serie,
            defeito: this.defeito,
            estadoConsole: this.estadoConsole,
            valor: this.valor > 0 ? this.valor : undefined,
          },
        ];

    // Se o histórico de status estiver vazio, inicializa com o evento de abertura
    const effectiveHistory: StatusHistoryEntry[] = this.historicoStatus.length > 0
      ? this.historicoStatus
      : [
          {
            id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            de: 'Criada',
            para: this.situacao,
            data: this.entrada,
            observacao: 'Abertura da Ordem de Serviço',
          },
        ];

    return {
      id: generatedId,
      numero: effectiveNumber,
      clienteId: this.clienteId,
      situacao: this.situacao,
      canal: this.canal,
      entrada: this.entrada,
      prazo: this.prazo,
      saida: this.saida,
      dataRetirada: this.dataRetirada,
      dataRetorno: this.dataRetorno,
      motivoRetorno: this.motivoRetorno,
      equipamento: primaryEquipment,
      marca: this.marca,
      modelo: this.modelo,
      serie: this.serie,
      defeito: this.defeito,
      estadoConsole: this.estadoConsole,
      itens: effectiveItems,
      valor: this.valor,
      maoObra: this.maoObra ?? this.valor,
      pecas: this.pecas,
      desconto: this.desconto,
      obs: this.obs,
      createdAt: this.createdAt,
      retornoAt: this.retornoAt,
      historicoStatus: effectiveHistory,
      technicalReport: this.technicalReport || null,
    };
  }
}
