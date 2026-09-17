export function uid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function onlyDigits(str?: string): string {
  return (str || '').replace(/\D/g, '');
}

export function formatCPF(v?: string): string {
  const d = onlyDigits(v).slice(0, 11);
  let out = d;
  if (d.length > 9) out = d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (d.length > 6) out = d.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (d.length > 3) out = d.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return out;
}

export function formatCEP(v?: string): string {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length > 5) return d.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  return d;
}

export function isValidCEP(v?: string): boolean {
  const d = onlyDigits(v);
  return d.length === 8;
}

// Lista oficial de DDDs válidos no Brasil (ANATEL)
export const VALID_BRAZIL_DDDS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24,                         // RJ
  27, 28,                             // ES
  31, 32, 33, 34, 35, 37, 38,         // MG
  41, 42, 43, 44, 45, 46,             // PR
  47, 48, 49,                         // SC
  51, 53, 54, 55,                     // RS
  61,                                 // DF
  62, 64,                             // GO
  63,                                 // TO
  65, 66,                             // MT
  67,                                 // MS
  68,                                 // AC
  69,                                 // RO
  71, 73, 74, 75, 77,                 // BA
  79,                                 // SE
  81, 87,                             // PE
  82,                                 // AL
  83,                                 // PB
  84,                                 // RN
  85, 88,                             // CE
  86, 89,                             // PI
  91, 93, 94,                         // PA
  92, 97,                             // AM
  95,                                 // RR
  96,                                 // AP
  98, 99,                             // MA
];

export function validateCPF(cpfRaw?: string): { isValid: boolean; error?: string } {
  const cpf = onlyDigits(cpfRaw);
  if (!cpf) {
    return { isValid: false, error: 'Informe o CPF do cliente.' };
  }
  if (cpf.length < 11) {
    return { isValid: false, error: `CPF incompleto (${cpf.length}/11 dígitos digitados).` };
  }
  if (cpf.length > 11) {
    return { isValid: false, error: 'CPF não pode ultrapassar 11 dígitos.' };
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return { isValid: false, error: 'CPF inválido (todos os dígitos são iguais).' };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9], 10)) {
    return { isValid: false, error: 'CPF inválido. Verifique os números digitados.' };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[10], 10)) {
    return { isValid: false, error: 'CPF inválido. Verifique os números digitados.' };
  }

  return { isValid: true };
}

export function isValidCPF(cpfRaw?: string): boolean {
  return validateCPF(cpfRaw).isValid;
}

export function formatCNPJ(v?: string): string {
  const d = onlyDigits(v).slice(0, 14);
  let out = d;
  if (d.length > 12) out = d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
  else if (d.length > 8) out = d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
  else if (d.length > 5) out = d.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (d.length > 2) out = d.replace(/(\d{2})(\d{1,3})/, '$1.$2');
  return out;
}

export function validateCNPJ(cnpjRaw?: string): { isValid: boolean; error?: string } {
  const cnpj = onlyDigits(cnpjRaw);
  if (!cnpj) {
    return { isValid: false, error: 'Informe o CNPJ da empresa.' };
  }
  if (cnpj.length < 14) {
    return { isValid: false, error: `CNPJ incompleto (${cnpj.length}/14 dígitos digitados).` };
  }
  if (cnpj.length > 14) {
    return { isValid: false, error: 'CNPJ não pode ultrapassar 14 dígitos.' };
  }
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return { isValid: false, error: 'CNPJ inválido (todos os dígitos são iguais).' };
  }

  // Primeiro dígito verificador
  const b1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cnpj[i], 10) * b1[i];
  }
  let rest1 = sum1 % 11;
  const d1 = rest1 < 2 ? 0 : 11 - rest1;
  if (d1 !== parseInt(cnpj[12], 10)) {
    return { isValid: false, error: 'CNPJ inválido. Verifique os dígitos digitados.' };
  }

  // Segundo dígito verificador
  const b2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cnpj[i], 10) * b2[i];
  }
  let rest2 = sum2 % 11;
  const d2 = rest2 < 2 ? 0 : 11 - rest2;
  if (d2 !== parseInt(cnpj[13], 10)) {
    return { isValid: false, error: 'CNPJ inválido. Verifique os dígitos digitados.' };
  }

  return { isValid: true };
}

export function isValidCNPJ(cnpjRaw?: string): boolean {
  return validateCNPJ(cnpjRaw).isValid;
}

export function validatePhone(phoneRaw?: string): { isValid: boolean; error?: string } {
  const digits = onlyDigits(phoneRaw);
  if (!digits) {
    return { isValid: false, error: 'Informe o telefone / WhatsApp.' };
  }
  if (digits.length < 10) {
    return { isValid: false, error: `Número incompleto (${digits.length} de 10 ou 11 dígitos).` };
  }
  if (digits.length > 11) {
    return { isValid: false, error: 'Número inválido (máximo 11 dígitos).' };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, error: 'Número inválido (dígitos repetidos).' };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_BRAZIL_DDDS.includes(ddd)) {
    return { isValid: false, error: `DDD (${digits.slice(0, 2)}) inválido no Brasil.` };
  }

  if (digits.length === 11) {
    if (digits[2] !== '9') {
      return { isValid: false, error: 'Celular de 11 dígitos deve iniciar com 9 após o DDD (ex: (11) 9XXXX-XXXX).' };
    }
  } else if (digits.length === 10) {
    if (!['2', '3', '4', '5'].includes(digits[2])) {
      return { isValid: false, error: 'Telefone fixo deve iniciar com 2, 3, 4 ou 5 (ex: (11) 3456-7890).' };
    }
  }

  return { isValid: true };
}

export function isValidPhone(phoneRaw?: string): boolean {
  return validatePhone(phoneRaw).isValid;
}

export function formatPhone(v?: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  if (d.length > 2) return d.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return d;
}

export function formatCurrency(n: number | string): string {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getOrderValue(order?: { valor?: number; maoObra?: number; pecas?: number }): number {
  if (!order) return 0;
  if (order.valor !== undefined && order.valor !== null && !isNaN(Number(order.valor))) {
    return Number(order.valor);
  }
  return (Number(order.maoObra) || 0) + (Number(order.pecas) || 0);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

export function isoToDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return toDatetimeLocal(d);
}

export function datetimeLocalToIso(localStr?: string): string | undefined {
  if (!localStr || !localStr.trim()) return undefined;
  // localStr is "YYYY-MM-DDTHH:mm"
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function getStatusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Em aberto':
      return { bg: 'bg-[#2A0D0F]', text: 'text-[#FF4D52]', border: 'border-[#E51D24]/50' };
    case 'Em andamento':
      return { bg: 'bg-[#1C2028]', text: 'text-[#FFFFFF]', border: 'border-[#4B5563]' };
    case 'Concluído':
      return { bg: 'bg-[#073322]', text: 'text-[#10B981]', border: 'border-[#059669]' };
    case 'Cancelado':
      return { bg: 'bg-[#221012]', text: 'text-[#EF4444]', border: 'border-[#7F1D1D]' };
    case 'Retornou com defeito':
      return { bg: 'bg-[#38101E]', text: 'text-[#FB7185]', border: 'border-[#F43F5E]/60' };
    default:
      return { bg: 'bg-[#17191E]', text: 'text-[#D1D5DB]', border: 'border-[#2D323C]' };
  }
}

export function createWhatsAppLink(phone: string, message: string): string {
  const digits = onlyDigits(phone);
  if (!digits) return '';
  const fullNumber = digits.length <= 11 ? '55' + digits : digits;
  return `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage(order: { numero: number; equipamento: string; modelo?: string; situacao: string; valor?: number; maoObra?: number; pecas?: number }, clientName?: string): string {
  const total = getOrderValue(order);
  const formattedVal = formatCurrency(total);
  return `Olá${clientName ? ` ${clientName}` : ''}! Aqui é da *N! GAMES* 🎮\n\nAtualização sobre sua Ordem de Serviço *#${order.numero}*:\n🕹️ *Equipamento:* ${order.equipamento}${order.modelo ? ` (${order.modelo})` : ''}\n📌 *Status:* ${order.situacao}\n💰 *Valor Total:* ${formattedVal}\n\nQualquer dúvida, estamos à disposição! 🚀`;
}

export interface PrazoInfo {
  status: 'sem_prazo' | 'atrasado' | 'hoje' | 'amanha' | 'em_dia' | 'finalizado';
  label: string;
  badgeStyle: { bg: string; text: string; border: string };
  formattedDate: string;
  isUrgent: boolean;
}

export function getPrazoInfo(prazo?: string, situacao?: string): PrazoInfo {
  if (situacao === 'Concluído' || situacao === 'Cancelado') {
    return {
      status: 'finalizado',
      label: 'Finalizada',
      badgeStyle: { bg: 'bg-[#17191E]', text: 'text-[#9CA3AF]', border: 'border-[#2D323C]' },
      formattedDate: prazo ? formatDateTime(prazo) : '—',
      isUrgent: false,
    };
  }

  if (!prazo) {
    return {
      status: 'sem_prazo',
      label: 'Sem prazo',
      badgeStyle: { bg: 'bg-[#14171C]', text: 'text-[#6B7280]', border: 'border-[#2A303C]' },
      formattedDate: 'Não definido',
      isUrgent: false,
    };
  }

  const deadline = new Date(prazo);
  if (isNaN(deadline.getTime())) {
    return {
      status: 'sem_prazo',
      label: 'Data inválida',
      badgeStyle: { bg: 'bg-[#14171C]', text: 'text-[#6B7280]', border: 'border-[#2A303C]' },
      formattedDate: '—',
      isUrgent: false,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const deadlineDayStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
  const diffDays = Math.round((deadlineDayStart - todayStart) / (1000 * 60 * 60 * 24));

  const formattedDate = formatDateTime(prazo);

  if (deadline.getTime() < now.getTime() && diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      status: 'atrasado',
      label: daysLate === 1 ? 'Atrasado 1 dia' : `Atrasado ${daysLate} dias`,
      badgeStyle: { bg: 'bg-[#2A0D0F]', text: 'text-[#EF4444]', border: 'border-[#EF4444]/60' },
      formattedDate,
      isUrgent: true,
    };
  }

  if (diffDays === 0) {
    if (deadline.getTime() < now.getTime()) {
      return {
        status: 'atrasado',
        label: 'Venceu hoje!',
        badgeStyle: { bg: 'bg-[#2A0D0F]', text: 'text-[#EF4444]', border: 'border-[#EF4444]/60' },
        formattedDate,
        isUrgent: true,
      };
    }
    return {
      status: 'hoje',
      label: 'Vence hoje!',
      badgeStyle: { bg: 'bg-[#3B2506]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/60' },
      formattedDate,
      isUrgent: true,
    };
  }

  if (diffDays === 1) {
    return {
      status: 'amanha',
      label: 'Vence amanhã',
      badgeStyle: { bg: 'bg-[#1E293B]', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]/50' },
      formattedDate,
      isUrgent: false,
    };
  }

  if (diffDays > 1) {
    return {
      status: 'em_dia',
      label: `Vence em ${diffDays} dias`,
      badgeStyle: { bg: 'bg-[#0E2A1E]', text: 'text-[#10B981]', border: 'border-[#10B981]/50' },
      formattedDate,
      isUrgent: false,
    };
  }

  return {
    status: 'atrasado',
    label: 'Prazo vencido',
    badgeStyle: { bg: 'bg-[#2A0D0F]', text: 'text-[#EF4444]', border: 'border-[#EF4444]/60' },
    formattedDate,
    isUrgent: true,
  };
}
