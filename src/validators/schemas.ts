import { z } from 'zod';

export const LoginSchema = z.object({
  cnpj: z.string().min(11, 'CNPJ deve conter no mínimo 11 dígitos'),
  senha: z.string().min(6, 'Senha deve conter no mínimo 6 caracteres'),
});

export const CreateClientSchema = z.object({
  id: z.string().optional(),
  nome: z.string().optional(),
  cpf: z.string().min(11, 'CPF obrigatório'),
  telefone: z.string().min(8, 'Telefone obrigatório'),
  cep: z.string().optional(),
  email: z.string().optional(),
  nascimento: z.string().optional(),
  endereco: z.string().optional(),
  obs: z.string().optional(),
});

export const UpdateClientSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  cep: z.string().optional(),
  email: z.string().optional(),
  nascimento: z.string().optional(),
  endereco: z.string().optional(),
  obs: z.string().optional(),
});

export const OrderItemSchema = z.object({
  id: z.string().optional(),
  descricao: z.string().optional(),
  tipo: z.string().optional(),
  valor: z.number().optional(),
  defeito: z.string().optional(),
});

export const CreateServiceOrderSchema = z.object({
  clienteId: z.string().min(1, 'clienteId é obrigatório'),
  equipamento: z.string().min(1, 'equipamento é obrigatório'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  defeito: z.string().optional(),
  estadoConsole: z.string().optional(),
  itens: z.array(OrderItemSchema).optional(),
  valor: z.number().min(0).optional(),
  maoObra: z.number().min(0).optional(),
  pecas: z.number().min(0).optional(),
  desconto: z.number().min(0).optional(),
  obs: z.string().optional(),
  canal: z.enum(['Presencial', 'WhatsApp', 'Instagram', 'Telefone', 'Outro']).optional(),
  situacao: z.enum(['Em aberto', 'Em andamento', 'Concluído', 'Entregue', 'Cancelado', 'Retornou com defeito']).optional(),
  prazo: z.string().optional(),
  entrada: z.string().optional(),
});

export const UpdateServiceOrderSchema = z.object({
  clienteId: z.string().optional(),
  equipamento: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  defeito: z.string().optional(),
  estadoConsole: z.string().optional(),
  itens: z.array(OrderItemSchema).optional(),
  valor: z.number().min(0).optional(),
  maoObra: z.number().min(0).optional(),
  pecas: z.number().min(0).optional(),
  desconto: z.number().min(0).optional(),
  obs: z.string().optional(),
  canal: z.enum(['Presencial', 'WhatsApp', 'Instagram', 'Telefone', 'Outro']).optional(),
  situacao: z.enum(['Em aberto', 'Em andamento', 'Concluído', 'Entregue', 'Cancelado', 'Retornou com defeito']).optional(),
  prazo: z.string().optional().nullable(),
  saida: z.string().optional().nullable(),
  dataRetirada: z.string().optional().nullable(),
  dataRetorno: z.string().optional().nullable(),
  motivoRetorno: z.string().optional().nullable(),
  retornoAt: z.string().optional().nullable(),
});

export const ChangeStatusSchema = z.object({
  situacao: z.enum(['Em aberto', 'Em andamento', 'Concluído', 'Entregue', 'Cancelado', 'Retornou com defeito']).optional(),
  newStatus: z.enum(['Em aberto', 'Em andamento', 'Concluído', 'Entregue', 'Cancelado', 'Retornou com defeito']).optional(),
  observacao: z.string().optional(),
  usuario: z.string().optional(),
  saida: z.string().optional(),
  dataRetirada: z.string().optional(),
  dataRetorno: z.string().optional(),
  motivoRetorno: z.string().optional(),
}).refine((data) => data.situacao || data.newStatus, {
  message: 'É necessário informar situacao ou newStatus',
});

export const TechnicalReportSchema = z.object({
  diagnostico: z.string().min(3, 'Diagnóstico deve ter no mínimo 3 caracteres'),
  servicoRealizado: z.string().min(3, 'Serviço realizado deve ter no mínimo 3 caracteres'),
  pecasUtilizadas: z.string().optional(),
  observacaoTecnica: z.string().optional(),
  tecnicoResponsavel: z.string().min(2, 'Técnico responsável é obrigatório'),
  dataAnalise: z.string().optional(),
});
