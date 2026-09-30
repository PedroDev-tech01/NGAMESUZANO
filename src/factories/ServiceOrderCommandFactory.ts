/**
 * Factory para criação desacoplada dos comandos de Ordens de Serviço.
 * Utiliza o padrão Registry / Command Creators para desacoplar a fábrica
 * de implementações concretas e cumprir o Princípio Aberto/Fechado (OCP).
 */
import { ICommand } from '../interfaces/ICommand';

export type ServiceOrderCommandType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'GET_BY_ID'
  | 'LIST'
  | 'CHANGE_STATUS'
  | (string & {});

export type CommandCreator<TInput = any, TOutput = any> = () => ICommand<TInput, TOutput>;

export class ServiceOrderCommandFactory {
  private readonly creators = new Map<string, CommandCreator>();

  constructor(initialCreators?: Record<string, CommandCreator>) {
    if (initialCreators) {
      for (const [type, creator] of Object.entries(initialCreators)) {
        this.register(type, creator);
      }
    }
  }

  public register<TInput = any, TOutput = any>(
    type: ServiceOrderCommandType | string,
    creator: CommandCreator<TInput, TOutput>
  ): void {
    this.creators.set(type, creator as CommandCreator);
  }

  public createCommand<TInput = any, TOutput = any>(
    type: ServiceOrderCommandType | string
  ): ICommand<TInput, TOutput> {
    const creator = this.creators.get(type);

    if (!creator) {
      throw new Error(`Tipo de comando não suportado ou não registrado: ${type}`);
    }

    return creator() as ICommand<TInput, TOutput>;
  }

  public hasCommand(type: ServiceOrderCommandType | string): boolean {
    return this.creators.has(type);
  }

  public getRegisteredTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}

