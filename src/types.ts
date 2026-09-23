export type OrderStatus =
  | 'Em aberto'
  | 'Em andamento'
  | 'Concluído'
  | 'Cancelado'
  | 'Retornou com defeito';

export type SalesChannel = 'Presencial' | 'WhatsApp' | 'Telefone' | 'Site / E-commerce';

export interface Client {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  cep?: string;
  email?: string;
  nascimento?: string;
  endereco?: string;
  obs?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  equipamento: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  defeito?: string;
  estadoConsole?: string; // Estado do console / observações estéticas (riscos, marcas, lacre, conservação)
  valor?: number;
}

export interface StatusHistoryEntry {
  id: string;
  de: string; // Ex: 'Criada', 'Em aberto', 'Em andamento', etc.
  para: OrderStatus; // Ex: 'Em andamento', 'Concluído', etc.
  data: string; // ISO string da mudança de status
  usuario?: string;
  observacao?: string;
}

export interface ServiceOrder {
  id: string;
  numero: number;
  clienteId: string;
  situacao: OrderStatus;
  canal: SalesChannel;
  entrada: string; // ISO string
  prazo?: string;  // Previsão técnica / prazo limite gravado no servidor (ISO string)
  saida?: string;  // ISO string
  dataRetirada?: string; // Data e hora em que o equipamento foi retirado pelo cliente (ISO string)
  dataRetorno?: string;  // Data e hora do retorno com defeito / garantia (ISO string)
  motivoRetorno?: string; // Descrição do motivo ou defeito do retorno
  equipamento: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  defeito?: string;
  estadoConsole?: string; // Estado do console / observações estéticas
  solucao?: string; // Campo descontinuado a pedido do usuário
  itens?: OrderItem[]; // Suporte a múltiplos itens para manutenção na mesma O.S.
  valor: number;
  maoObra?: number;
  pecas?: number;
  desconto?: number;
  obs?: string;
  createdAt: string;
  retornoAt?: string;
  historicoStatus?: StatusHistoryEntry[]; // Log histórico das alterações de status da O.S.
}

export type ExpenseCategory =
  | 'Peças & Componentes'
  | 'Insumos & Ferramental'
  | 'Custo Geral de Manutenção'
  | 'Outros';

export interface MaintenanceExpense {
  id: string;
  mes: string; // "YYYY-MM", ex: "2026-09"
  descricao: string; // Ex: "Lote de HDMI PS5, pasta térmica Arctic, telas Switch"
  categoria: ExpenseCategory;
  valor: number;
  data: string; // YYYY-MM-DD
  createdAt: string;
}

export type ViewType =
  | 'dashboard'
  | 'ordens'
  | 'os-form'
  | 'clientes'
  | 'cliente-form'
  | 'relatorios';

export interface AuthUser {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  token?: string;
  loggedAt: string;
}

