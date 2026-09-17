import { Client, ServiceOrder } from '../types';
import { formatCurrency, formatDateTime, getOrderValue, getStatusBadgeStyle } from './formatters';

export function generateOrderPrintHtml(order: ServiceOrder, client: Client | null): string {
  const totalValue = getOrderValue(order);
  const badge = getStatusBadgeStyle(order.situacao);
  const hasMultipleItems = Array.isArray(order.itens) && order.itens.length > 0;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordem de Serviço #${order.numero} - N!Games Assistência</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background-color: #ffffff;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .print-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #E51D24;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .doc-title-brand {
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #E51D24;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .doc-title-main {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      margin: 0;
    }
    .doc-subtitle {
      font-size: 12px;
      color: #4B5563;
      margin-top: 2px;
    }
    .doc-number-box {
      text-align: right;
    }
    .doc-number-label {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      font-weight: 600;
    }
    .doc-number-val {
      font-family: monospace;
      font-size: 26px;
      font-weight: 800;
      color: #E51D24;
    }
    .badge {
      display: inline-block;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid ${order.situacao === 'Concluído' ? '#059669' : '#D1D5DB'};
      background: ${order.situacao === 'Concluído' ? '#ECFDF5' : '#F3F4F6'};
      color: ${order.situacao === 'Concluído' ? '#065F46' : '#111827'};
      margin-top: 4px;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 18px;
    }
    .meta-item-label {
      font-size: 11px;
      color: #6B7280;
      font-weight: 600;
    }
    .meta-item-val {
      font-family: monospace;
      font-size: 12.5px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }
    .return-alert-box {
      background: #FEF2F2;
      border: 1.5px solid #F87171;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 18px;
      color: #991B1B;
    }
    .return-alert-title {
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-card {
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      margin-bottom: 18px;
      overflow: hidden;
    }
    .section-title {
      background: #14171C;
      border-bottom: 1px solid #22262E;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #ffffff;
    }
    .section-body {
      padding: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .field-label {
      font-size: 11px;
      color: #6B7280;
      display: block;
      margin-bottom: 2px;
    }
    .field-val {
      font-size: 13px;
      color: #111827;
      font-weight: 600;
    }
    .field-val-mono {
      font-family: monospace;
      font-size: 13px;
      color: #111827;
      font-weight: 600;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 6px;
    }
    .items-table th {
      background: #F3F4F6;
      color: #374151;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #E5E7EB;
      font-size: 11px;
      text-transform: uppercase;
    }
    .items-table td {
      padding: 8px 10px;
      border: 1px solid #E5E7EB;
      vertical-align: top;
    }
    .text-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.5;
      margin-top: 4px;
    }
    .value-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 18px;
    }
    .value-row-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .value-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4B5563;
    }
    .value-sub {
      font-size: 11px;
      color: #6B7280;
    }
    .value-amount {
      font-family: monospace;
      font-size: 26px;
      font-weight: 800;
      color: #E51D24;
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-top: 1px dashed #E5E7EB;
      font-size: 12px;
      color: #4B5563;
    }
    .warranty-box {
      font-size: 11px;
      color: #4B5563;
      border-top: 1px solid #E5E7EB;
      padding-top: 14px;
      margin-top: 20px;
      line-height: 1.5;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 36px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #111827;
      margin-bottom: 6px;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }
    .sig-role {
      font-size: 10px;
      color: #6B7280;
    }
    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #14171C;
      border: 1px solid #22262E;
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .btn-print {
      background: #E51D24;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #C81018;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .no-print-bar {
        display: none !important;
      }
      .print-container {
        max-width: 100%;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="no-print-bar">
      <div>
        <strong>Ordem de Serviço #${order.numero}</strong>
        <span style="opacity: 0.8; font-size: 12px; margin-left: 8px;">N!Games Assistência</span>
      </div>
      <div>
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir Documento (Ctrl+P)</button>
      </div>
    </div>

    <!-- Header -->
    <div class="doc-header">
      <div>
        <div class="doc-title-brand">N!GAMES · ASSISTÊNCIA TÉCNICA</div>
        <h1 class="doc-title-main">Ordem de Serviço</h1>
        <div class="doc-subtitle">Manutenção especializada de consoles, controles e acessórios</div>
      </div>
      <div class="doc-number-box">
        <div class="doc-number-label">Número da O.S.</div>
        <div class="doc-number-val">#${order.numero}</div>
      </div>
    </div>

    <!-- Metadata Bar - Somente Data de Entrada -->
    <div class="grid-meta" style="grid-template-columns: 1fr;">
      <div>
        <div class="meta-item-label">Data de Entrada:</div>
        <div class="meta-item-val">${formatDateTime(order.entrada)}</div>
      </div>
    </div>

    <!-- Client Card -->
    <div class="section-card">
      <div class="section-title">Dados do Cliente</div>
      <div class="section-body">
        <div class="grid-2">
          <div>
            <span class="field-label">Nome completo:</span>
            <span class="field-val">${client ? client.nome : '(Cliente não localizado)'}</span>
          </div>
          <div>
            <span class="field-label">CPF:</span>
            <span class="field-val-mono">${client?.cpf || '—'}</span>
          </div>
          <div>
            <span class="field-label">Telefone / WhatsApp:</span>
            <span class="field-val">${client?.telefone || '—'}</span>
          </div>
          <div>
            <span class="field-label">CEP:</span>
            <span class="field-val-mono">${client?.cep || '—'}</span>
          </div>
          ${client?.endereco ? `
          <div style="grid-column: span 2;">
            <span class="field-label">Endereço:</span>
            <span class="field-val" style="font-weight: normal;">${client.endereco}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Equipment & Maintenance Items Card -->
    <div class="section-card">
      <div class="section-title">
        ${hasMultipleItems ? `Itens para Manutenção (${order.itens!.length} itens cadastrados)` : 'Dados do Equipamento & Diagnóstico'}
      </div>
      <div class="section-body">
        ${hasMultipleItems ? `
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th>Equipamento / Modelo</th>
              <th style="width: 120px;">Nº de Série</th>
              <th>Defeito Relatado</th>
              <th>Estado do Console / Observações</th>
              ${order.itens!.some(i => (Number(i.valor) > 0)) ? '<th style="width: 90px; text-align: right;">Valor</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${order.itens!.map((item, idx) => `
            <tr>
              <td style="font-weight: 700; text-align: center; color: #E51D24;">${idx + 1}</td>
              <td>
                <div style="font-weight: 700; color: #111827;">${item.equipamento || '—'}</div>
                ${(item.marca || item.modelo) ? `<div style="font-size: 11px; color: #6B7280;">${[item.marca, item.modelo].filter(Boolean).join(' · ')}</div>` : ''}
              </td>
              <td style="font-family: monospace; font-size: 11px;">${item.serie || '—'}</td>
              <td>${item.defeito || '—'}</td>
              <td>${item.estadoConsole ? `<span style="font-size: 11px; color: #374151;">${item.estadoConsole}</span>` : '<span style="color: #9CA3AF;">—</span>'}</td>
              ${order.itens!.some(i => (Number(i.valor) > 0)) ? `
              <td style="font-family: monospace; font-weight: 700; text-align: right; color: #111827;">
                ${item.valor ? formatCurrency(Number(item.valor)) : '—'}
              </td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table>
        ` : `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <span class="field-label">Equipamento:</span>
            <span class="field-val">${order.equipamento}</span>
          </div>
          <div>
            <span class="field-label">Marca / Modelo:</span>
            <span class="field-val" style="font-weight: normal;">${[order.marca, order.modelo].filter(Boolean).join(' · ') || '—'}</span>
          </div>
          <div>
            <span class="field-label">Nº de Série:</span>
            <span class="field-val-mono">${order.serie || '—'}</span>
          </div>
        </div>
        <div style="border-top: 1px solid #EAEDE6; padding-top: 10px; margin-bottom: 8px;">
          <span class="field-label" style="font-weight: 700; color: #111827;">Defeito Relatado:</span>
          <div class="text-box">${order.defeito || 'Nenhum defeito detalhado no cadastro.'}</div>
        </div>
        ${(order.estadoConsole || (order.itens && order.itens[0]?.estadoConsole)) ? `
        <div style="border-top: 1px solid #EAEDE6; padding-top: 8px;">
          <span class="field-label" style="font-weight: 700; color: #111827;">Estado do Console / Observações:</span>
          <div class="text-box">${order.estadoConsole || order.itens?.[0]?.estadoConsole}</div>
        </div>` : ''}
        `}
      </div>
    </div>

    <!-- Total Value Section -->
    <div class="value-card">
      <div class="value-row-main">
        <div>
          <div class="value-title">Valor Total do Serviço</div>
          <div class="value-sub">Mão de obra e serviços inclusos no valor total</div>
        </div>
        <div class="value-amount">${formatCurrency(totalValue)}</div>
      </div>
    </div>

    <!-- Observations -->
    ${order.obs ? `
    <div class="section-card">
      <div class="section-title">Observações</div>
      <div class="section-body" style="font-size: 12px;">${order.obs}</div>
    </div>` : ''}

    <!-- Warranty Terms -->
    <div class="warranty-box">
      <strong>Termo de Garantia:</strong> Garantia legal de 90 (noventa) dias sobre os serviços executados e componentes substituídos, a contar da data de entrega, conforme Artigo 26 do Código de Defesa do Consumidor (Lei 8.078/90). Não cobre mau uso, lacre violado, quedas, umidade, líquidos ou danos por oscilação na rede elétrica.
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div>
        <div class="sig-line"></div>
        <div class="sig-name">N!GAMES ASSISTÊNCIA</div>
        <div class="sig-role">Técnico Responsável</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-name">${client ? client.nome : 'Cliente'}</div>
        <div class="sig-role">
          Assinatura de Retirada · ${order.dataRetirada ? `Retirado em ${formatDateTime(order.dataRetirada)}` : 'Data: ____/____/________'}
        </div>
      </div>
    </div>
  </div>

  <script>
    // Auto-trigger print if requested via query param
    window.addEventListener('load', function() {
      if (window.location.search.indexOf('autoprint=1') !== -1) {
        setTimeout(function() {
          try {
            window.print();
          } catch(e) {}
        }, 400);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Robust print execution:
 * 1. Creates an isolated hidden iframe
 * 2. Injects the clean, high-fidelity A4 document
 * 3. Triggers iframe.print()
 * 4. Gracefully falls back to window.print() if iframe printing is restricted
 */
export function printOrderDocument(order: ServiceOrder, client: Client | null): boolean {
  try {
    const html = generateOrderPrintHtml(order, client);

    // Remove any previously created print iframe
    const oldFrame = document.getElementById('ngames-print-isolation-frame');
    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'ngames-print-isolation-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print blocked, falling back to window.print():', iframeErr);
          window.print();
        }
      }, 350);

      return true;
    }
  } catch (err) {
    console.warn('Error during isolated iframe print:', err);
  }

  // Fallback to window.print()
  try {
    window.print();
    return true;
  } catch (fallbackErr) {
    console.error('window.print also failed:', fallbackErr);
    return false;
  }
}

export function printOrderInNewWindow(order: ServiceOrder, client: Client | null): boolean {
  try {
    const url = `${window.location.origin}${window.location.pathname}?print=${encodeURIComponent(order.id)}&autoprint=1`;
    const newTab = window.open(url, '_blank');
    if (newTab) {
      newTab.focus();
      return true;
    }
  } catch (err) {
    console.error('Falha ao abrir nova aba de impressão:', err);
  }
  return false;
}

export function downloadOrderHtml(order: ServiceOrder, client: Client | null) {
  const html = generateOrderPrintHtml(order, client);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OS-${order.numero}-NGames.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
