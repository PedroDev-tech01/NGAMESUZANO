import { Client, ServiceOrder } from '../types';
import { formatCurrency, getOrderValue, createWhatsAppLink, formatDateTime } from './formatters';
import { buildVectorOrderPdf } from './vectorPdf';

/**
 * Normaliza o nome do arquivo PDF para a O.S.
 * Exemplo: OS-150011-CARLOS-HENRIQUE.pdf ou OS-150011.pdf
 */
export function getOrderPdfFilename(order: ServiceOrder, client: Client | null): string {
  const safeClient = client?.nome
    ? client.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toUpperCase()
        .slice(0, 25)
    : '';
  return safeClient ? `OS-${order.numero}-${safeClient}.pdf` : `OS-${order.numero}.pdf`;
}

/**
 * Obtém a URL pública direta da O.S. (quando necessário acesso direto ao arquivo PDF puro)
 */
export function getOrderPdfPublicUrl(order: ServiceOrder): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return `${origin}/os/${order.numero}.pdf`;
}

/**
 * Cria a mensagem personalizada de WhatsApp para o envio da Ordem de Serviço
 * com todos os dados técnicos, situação, valores e garantia detalhados diretamente no WhatsApp
 * sem redirecionar o cliente para bases ou links externos.
 */
export function buildOrderPdfWhatsAppMessage(order: ServiceOrder, client: Client | null): string {
  const clientName = client?.nome ? client.nome.trim() : 'Cliente';
  const total = getOrderValue(order);
  const formattedVal = formatCurrency(total);
  const equipFull = `${order.equipamento || 'Equipamento'}${order.modelo ? ` (${order.modelo})` : ''}`;

  const lines: string[] = [
    `Olá, *${clientName}*! Tudo bem? Aqui é da *N! GAMES Assistência Técnica* 🎮\n`,
    `📄 *ORDEM DE SERVIÇO Nº ${order.numero}*`,
    `• *Equipamento:* ${equipFull}`,
    `• *Situação:* ${order.situacao}`,
  ];

  if (order.entrada) {
    lines.push(`• *Data de Entrada:* ${formatDateTime(order.entrada)}`);
  }
  if (order.prazo) {
    lines.push(`• *Previsão/Prazo:* ${formatDateTime(order.prazo)}`);
  }

  if (order.defeito && order.defeito.trim()) {
    lines.push(`• *Defeito:* ${order.defeito.trim()}`);
  }

  if (order.solucao && order.solucao.trim()) {
    lines.push(`• *Serviço Realizado:* ${order.solucao.trim()}`);
  }

  const hasMaoObra = order.maoObra !== undefined && order.maoObra !== null && Number(order.maoObra) > 0;
  const hasPecas = order.pecas !== undefined && order.pecas !== null && Number(order.pecas) > 0;

  if (hasMaoObra || hasPecas) {
    if (hasMaoObra) lines.push(`• *Mão de Obra:* ${formatCurrency(order.maoObra || 0)}`);
    if (hasPecas) lines.push(`• *Peças:* ${formatCurrency(order.pecas || 0)}`);
  }

  lines.push(`• *Valor Total:* ${formattedVal}`);
  lines.push(`\n📎 *Segue em anexo o documento PDF oficial da sua Ordem de Serviço.*`);
  lines.push(`🛡️ *Garantia:* 90 dias nos serviços prestados (Art. 26 do CDC).`);
  lines.push(`\nEstamos à disposição para qualquer dúvida ou suporte! 🚀`);

  return lines.join('\n');
}

/**
 * Gera o arquivo PDF da O.S. como Blob de forma instantânea (< 15ms)
 * usando o gerador vetorial de alta definição sem depender de rasterização de DOM
 */
export async function generateOrderPdfBlob(
  order: ServiceOrder,
  client: Client | null,
  _sourceElement?: HTMLElement | null
): Promise<Blob> {
  const doc = buildVectorOrderPdf(order, client);
  return doc.output('blob');
}

/**
 * Faz o download do arquivo PDF apenas quando o usuário clicar explicitamente em "Baixar PDF"
 */
export async function downloadOrderPdf(
  order: ServiceOrder,
  client: Client | null,
  sourceElement?: HTMLElement | null
): Promise<string> {
  const filename = getOrderPdfFilename(order, client);
  const blob = await generateOrderPdfBlob(order, client, sourceElement);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return filename;
}

export interface SendWhatsAppResult {
  sharedDirectly: boolean;
  downloaded: boolean;
  filename: string;
  whatsappUrl: string;
  phone?: string;
  message: string;
}

/**
 * Envia a Ordem de Serviço via WhatsApp:
 * 1. Gera o PDF original vetorial de alta definição com 100% de precisão (< 15ms)
 * 2. Em celulares/tablets: aciona a Web Share API com o arquivo físico da O.S. (OS-150012.pdf)
 *    para envio direto do arquivo no WhatsApp.
 * 3. No desktop ou fallback: baixa o arquivo físico original para o computador e abre a conversa
 *    do WhatsApp com todas as informações e o link direto para o PDF oficial.
 */
export async function sendOrderPdfToWhatsApp(
  order: ServiceOrder,
  client: Client | null,
  sourceElement?: HTMLElement | null
): Promise<SendWhatsAppResult> {
  const filename = getOrderPdfFilename(order, client);
  const message = buildOrderPdfWhatsAppMessage(order, client);
  const phone = client?.telefone || '';
  const whatsappUrl = phone ? createWhatsAppLink(phone, message) : '';

  let sharedDirectly = false;
  let downloaded = false;

  try {
    const blob = await generateOrderPdfBlob(order, client, sourceElement);
    const pdfFile = new File([blob], filename, { type: 'application/pdf' });

    // Testa se o navegador suporta Web Share nativo com envio de arquivos (smartphones Android, iPhones, etc.)
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [pdfFile] });

    if (canShareFiles && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Ordem de Serviço #${order.numero} - N! GAMES`,
          text: `Ordem de Serviço Nº ${order.numero} · N! GAMES Assistência Técnica\nCliente: ${client?.nome || 'Cliente'}\nValor: ${formatCurrency(getOrderValue(order))}`,
        });
        sharedDirectly = true;
      } catch (shareErr: any) {
        // Se o usuário cancelou o menu nativo, não abre erro
        if (shareErr?.name === 'AbortError') {
          return {
            sharedDirectly: false,
            downloaded: false,
            filename,
            whatsappUrl,
            phone,
            message,
          };
        }
        console.warn('Web Share direto não concluído, abrindo WhatsApp com arquivo e link:', shareErr);
      }
    }

    // Se não compartilhou diretamente via Share Sheet nativo (Desktop / PC / WhatsApp Web):
    // 1. Baixa o arquivo PDF original para a máquina do técnico para facilitar envio/anexo
    // 2. Abre a conversa no WhatsApp Web com o texto completo e link direto do PDF
    if (!sharedDirectly) {
      try {
        await downloadOrderPdf(order, client, sourceElement);
        downloaded = true;
      } catch (dlErr) {
        console.warn('Download auxiliar não completado:', dlErr);
      }

      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    }
  } catch (err) {
    console.error('Erro no fluxo do WhatsApp:', err);
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return {
    sharedDirectly,
    downloaded,
    filename,
    whatsappUrl,
    phone,
    message,
  };
}
