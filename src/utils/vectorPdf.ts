import { jsPDF } from 'jspdf';
import { Client, ServiceOrder } from '../types';
import { formatCurrency, formatDateTime, getOrderValue } from './formatters';

/**
 * Constrói o documento de Ordem de Serviço em formato PDF vetorial puro
 * seguindo com 100% de fidelidade o PADRÃO ORIGINAL visual da N! Games Assistência:
 * - Cabeçalho oficial com marca monospace vermelha e título em destaque
 * - Número da O.S. no canto superior direito
 * - Barra com Data de Entrada
 * - Cartão "Dados do Cliente" com faixa escura #14171C
 * - Cartão "Dados do Equipamento & Diagnóstico" com defeito relatado e estado do console
 * - Cartão "Valor Total do Serviço" com valor em destaque vermelho
 * - Observações (quando houver)
 * - Termo de Garantia legal de 90 dias
 * - Duas assinaturas: Técnico Responsável e Cliente
 */
export function buildVectorOrderPdf(order: ServiceOrder, client: Client | null): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pw = 210;
  const ph = 297;
  const mx = 14;
  const cw = pw - mx * 2; // 182 mm de largura útil
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > ph - 16) {
      doc.addPage();
      y = 14;
    }
  };

  const drawSectionHeader = (title: string, topY: number) => {
    doc.setFillColor(20, 23, 28); // #14171C
    doc.rect(mx, topY, cw, 6.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), mx + 4, topY + 4.7);
    return topY + 6.8;
  };

  // ==========================================
  // 1. CABEÇALHO DO DOCUMENTO (PADRÃO ORIGINAL)
  // ==========================================
  // Marca / Header esquerdo
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(229, 29, 36); // #E51D24
  doc.text('N!GAMES · ASSISTÊNCIA TÉCNICA', mx, y + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text('Ordem de Serviço', mx, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99); // #4B5563
  doc.text('Manutenção especializada de consoles, controles e acessórios', mx, y + 14.5);

  // Canto direito: Número da O.S.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Número da O.S.', pw - mx, y + 3.5, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(229, 29, 36); // #E51D24
  doc.text(`#${order.numero}`, pw - mx, y + 13, { align: 'right' });

  y += 18;

  // Linha divisória vermelha (2.5px solid #E51D24)
  doc.setDrawColor(229, 29, 36);
  doc.setLineWidth(0.7);
  doc.line(mx, y, pw - mx, y);
  y += 4.5;

  // ==========================================
  // 2. METADATA BAR (SOMENTE DATA DE ENTRADA)
  // ==========================================
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.setDrawColor(229, 231, 235); // #E5E7EB
  doc.setLineWidth(0.25);
  doc.roundedRect(mx, y, cw, 9.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Data de Entrada:', mx + 4, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text(formatDateTime(order.entrada), mx + 32, y + 6);

  y += 13.5;

  // ==========================================
  // 3. CARTÃO: DADOS DO CLIENTE
  // ==========================================
  y = drawSectionHeader('Dados do Cliente', y);

  const colMid = mx + cw / 2;
  const clientName = client ? client.nome : '(Cliente não localizado)';
  const clientCpf = client?.cpf || '—';
  const clientPhone = client?.telefone || '—';
  const clientCep = client?.cep || '—';
  const hasAddress = Boolean(client?.endereco);

  const clientBoxH = hasAddress ? 24 : 17;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.rect(mx, y, cw, clientBoxH, 'FD');

  // Linha 1: Nome completo e CPF
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Nome completo:', mx + 4, y + 4.5);
  doc.text('CPF:', colMid, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(clientName.slice(0, 48), mx + 4, y + 8.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text(clientCpf, colMid, y + 8.5);

  // Linha 2: Telefone / WhatsApp e CEP
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Telefone / WhatsApp:', mx + 4, y + 13);
  doc.text('CEP:', colMid, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(clientPhone, mx + 4, y + 17);

  doc.setFont('courier', 'bold');
  doc.text(clientCep, colMid, y + 17);

  // Linha 3 (opcional): Endereço
  if (hasAddress && client?.endereco) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Endereço:', mx + 4, y + 21.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(String(client.endereco).slice(0, 85), mx + 20, y + 21.5);
  }

  y += clientBoxH + 4.5;

  // ==========================================
  // 4. CARTÃO: DADOS DO EQUIPAMENTO & DIAGNÓSTICO
  // ==========================================
  const hasMultipleItems = Array.isArray(order.itens) && order.itens.length > 0;
  const sectionTitle = hasMultipleItems
    ? `Itens para Manutenção (${order.itens!.length} itens cadastrados)`
    : 'Dados do Equipamento & Diagnóstico';

  y = drawSectionHeader(sectionTitle, y);

  if (hasMultipleItems) {
    // Tabela idêntica à do padrão original
    const hasItemValues = order.itens!.some((i) => Number(i.valor) > 0);

    doc.setFillColor(243, 244, 246); // #F3F4F6
    doc.rect(mx, y, cw, 6.5, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(mx, y, cw, 6.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(55, 65, 81); // #374151
    doc.text('#', mx + 3, y + 4.5, { align: 'center' });
    doc.text('EQUIPAMENTO / MODELO', mx + 9, y + 4.5);
    doc.text('Nº DE SÉRIE', mx + 60, y + 4.5);
    doc.text('DEFEITO RELATADO', mx + 95, y + 4.5);
    doc.text('ESTADO DO CONSOLE / OBSERVAÇÕES', mx + 135, y + 4.5);
    if (hasItemValues) {
      doc.text('VALOR', pw - mx - 3, y + 4.5, { align: 'right' });
    }
    y += 6.5;

    order.itens!.forEach((item, idx) => {
      checkPageBreak(12);
      const rowH = 11;
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
      doc.rect(mx, y, cw, rowH, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(mx, y, cw, rowH, 'D');

      // #
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(229, 29, 36);
      doc.text(String(idx + 1), mx + 3, y + 5, { align: 'center' });

      // Equipamento / Modelo
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(String(item.equipamento || '—').slice(0, 24), mx + 9, y + 4.5);
      if (item.marca || item.modelo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        doc.text([item.marca, item.modelo].filter(Boolean).join(' · ').slice(0, 30), mx + 9, y + 8.5);
      }

      // Série
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(55, 65, 81);
      doc.text(String(item.serie || '—').slice(0, 18), mx + 60, y + 5);

      // Defeito
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(17, 24, 39);
      doc.text(String(item.defeito || '—').slice(0, 22), mx + 95, y + 5);

      // Estado do console
      doc.setTextColor(55, 65, 81);
      doc.text(String(item.estadoConsole || '—').slice(0, 24), mx + 135, y + 5);

      // Valor
      if (hasItemValues) {
        doc.setFont('courier', 'bold');
        doc.setTextColor(17, 24, 39);
        const valText = item.valor ? formatCurrency(Number(item.valor)) : '—';
        doc.text(valText, pw - mx - 3, y + 5.5, { align: 'right' });
      }

      y += rowH;
    });

    y += 4.5;
  } else {
    // Equipamento único (Exatamente como o padrão original)
    const defeitoText = order.defeito || 'Nenhum defeito detalhado no cadastro.';
    const defeitoLines = doc.splitTextToSize(defeitoText, cw - 12);
    const defeitoBoxH = Math.max(9, defeitoLines.length * 4 + 4);

    const estadoText = order.estadoConsole || order.itens?.[0]?.estadoConsole;
    const estadoLines = estadoText ? doc.splitTextToSize(estadoText, cw - 12) : [];
    const estadoBoxH = estadoText ? Math.max(9, estadoLines.length * 4 + 4) : 0;

    let bodyH = 15 + 5 + defeitoBoxH + 4;
    if (estadoText) {
      bodyH += 5 + estadoBoxH + 4;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.rect(mx, y, cw, bodyH, 'FD');

    // Linha 1: 3 Colunas (Equipamento, Marca/Modelo, Nº de Série)
    const c1 = mx + 4;
    const c2 = mx + 65;
    const c3 = mx + 130;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Equipamento:', c1, y + 4.5);
    doc.text('Marca / Modelo:', c2, y + 4.5);
    doc.text('Nº de Série:', c3, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(String(order.equipamento || '—').slice(0, 32), c1, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.text(
      ([order.marca, order.modelo].filter(Boolean).join(' · ') || '—').slice(0, 32),
      c2,
      y + 8.5
    );

    doc.setFont('courier', 'bold');
    doc.text(String(order.serie || '—').slice(0, 24), c3, y + 8.5);

    // Divisória sutil
    doc.setDrawColor(234, 237, 230);
    doc.line(mx + 4, y + 12.5, pw - mx - 4, y + 12.5);

    // Linha 2: Defeito Relatado
    let curY = y + 16.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Defeito Relatado:', c1, curY);

    curY += 2;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(mx + 4, curY, cw - 8, defeitoBoxH, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(defeitoLines, mx + 6.5, curY + 4.5);

    curY += defeitoBoxH + 3.5;

    // Linha 3 (opcional): Estado do Console / Observações
    if (estadoText) {
      doc.setDrawColor(234, 237, 230);
      doc.line(mx + 4, curY, pw - mx - 4, curY);
      curY += 3.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(17, 24, 39);
      doc.text('Estado do Console / Observações:', c1, curY);

      curY += 2;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(mx + 4, curY, cw - 8, estadoBoxH, 1, 1, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(estadoLines, mx + 6.5, curY + 4.5);
    }

    y += bodyH + 4.5;
  }

  // ==========================================
  // 5. CARTÃO: VALOR TOTAL DO SERVIÇO
  // ==========================================
  checkPageBreak(20);
  const totalValue = getOrderValue(order);

  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.setDrawColor(229, 231, 235); // #E5E7EB
  doc.setLineWidth(0.25);
  doc.roundedRect(mx, y, cw, 17, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99); // #4B5563
  doc.text('VALOR TOTAL DO SERVIÇO', mx + 5, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Mão de obra e serviços inclusos no valor total', mx + 5, y + 11.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(229, 29, 36); // #E51D24
  doc.text(formatCurrency(totalValue), pw - mx - 5, y + 11.5, { align: 'right' });

  y += 21.5;

  // ==========================================
  // 6. OBSERVAÇÕES (SE HOUVER)
  // ==========================================
  if (order.obs) {
    checkPageBreak(18);
    y = drawSectionHeader('Observações', y);

    const obsLines = doc.splitTextToSize(order.obs, cw - 8);
    const obsBoxH = Math.max(10, obsLines.length * 4 + 5);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.rect(mx, y, cw, obsBoxH, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(obsLines, mx + 4, y + 5);

    y += obsBoxH + 4.5;
  }

  // ==========================================
  // 7. TERMO DE GARANTIA (PADRÃO ORIGINAL)
  // ==========================================
  checkPageBreak(36);
  y += 2;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.line(mx, y, pw - mx, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Termo de Garantia: ', mx, y + 3);

  const garantiaTexto =
    'Garantia legal de 90 (noventa) dias sobre os serviços executados e componentes substituídos, a contar da data de entrega, conforme Artigo 26 do Código de Defesa do Consumidor (Lei 8.078/90). Não cobre mau uso, lacre violado, quedas, umidade, líquidos ou danos por oscilação na rede elétrica.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  const garantiaLines = doc.splitTextToSize(garantiaTexto, cw - 28);
  doc.text(garantiaLines, mx + 27, y + 3);

  y += Math.max(10, garantiaLines.length * 3.6 + 4);

  // ==========================================
  // 8. ASSINATURAS (PADRÃO ORIGINAL)
  // ==========================================
  checkPageBreak(24);
  const sigWidth = 65;
  const col1CenterX = mx + cw * 0.25;
  const col2CenterX = mx + cw * 0.75;
  const sigLineY = y + 12;

  // Assinatura Técnica (Esquerda)
  doc.setDrawColor(17, 24, 39); // #111827
  doc.setLineWidth(0.3);
  doc.line(col1CenterX - sigWidth / 2, sigLineY, col1CenterX + sigWidth / 2, sigLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text('N!GAMES ASSISTÊNCIA', col1CenterX, sigLineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('Técnico Responsável', col1CenterX, sigLineY + 7.5, { align: 'center' });

  // Assinatura do Cliente (Direita)
  doc.setDrawColor(17, 24, 39);
  doc.line(col2CenterX - sigWidth / 2, sigLineY, col2CenterX + sigWidth / 2, sigLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(client ? client.nome : 'Cliente', col2CenterX, sigLineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  const dataRetiradaStr = order.dataRetirada
    ? `Retirado em ${formatDateTime(order.dataRetirada)}`
    : 'Data: ____/____/________';
  doc.text(`Assinatura de Retirada · ${dataRetiradaStr}`, col2CenterX, sigLineY + 7.5, {
    align: 'center',
  });

  return doc;
}
