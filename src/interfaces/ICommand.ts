/**
 * Interface base para comandos da camada de aplicação.
 * Encapsula requisições transacionais permitindo auditoria, desacoplamento e parametrização.
 */
export interface ICommand<TInput = any, TOutput = any> {
  execute(input: TInput): Promise<TOutput>;
}
