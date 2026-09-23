import React, { useState } from 'react';
import { Client, ServiceOrder } from '../types';
import {
  formatCurrency,
  formatDateTime,
  getOrderValue,
  onlyDigits,
} from '../utils/formatters';
import {
  Printer,
  X,
  User,
  Phone,
  MapPin,
  Wrench,
  Calendar,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  FileText,
  Share2,
  Check,
  History,
} from 'lucide-react';
import { OrderStatusTimeline } from './OrderStatusTimeline';
import { printOrderDocument, downloadOrderHtml } from '../utils/printDocument';
import {
  sendOrderPdfToWhatsApp,
  downloadOrderPdf,
  buildOrderPdfWhatsAppMessage,
  SendWhatsAppResult,
} from '../utils/pdfGenerator';

interface OrderPrintModalProps {
  isOpen?: boolean;
  order: ServiceOrder | null;
  client?: Client | null;
  clients?: Client[];
  autoWhatsApp?: boolean;
  onClose: () => void;
  onEdit?: (orderId: string) => void;
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  isOpen = true,
  order,
  client: clientProp,
  clients,
  autoWhatsApp = false,
  onClose,
  onEdit,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState(false);
  const [externalTabBlocked, setExternalTabBlocked] = useState(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<SendWhatsAppResult | null>(null);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sheet' | 'timeline'>('sheet');
  const autoWhatsAppTriggeredRef = React.useRef(false);

  // Reset to sheet view when opening a different order
  React.useEffect(() => {
    setActiveTab('sheet');
  }, [order?.id]);

  const client =
    clientProp ||
    (order && Array.isArray(clients) ? clients.find((c) => c.id === order.clienteId) || null : null);

  React.useEffect(() => {
    if (isOpen && order && autoWhatsApp && !autoWhatsAppTriggeredRef.current) {
      autoWhatsAppTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleSendWhatsAppPdf();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, order?.id, autoWhatsApp]);

  if (!isOpen || !order) return null;
  const totalValue = getOrderValue(order);
  const hasMultipleItems = Array.isArray(order.itens) && order.itens.length > 0;

  const handlePrintInCurrentWindow = () => {
    setPrintSuccessNotice(true);
    setTimeout(() => setPrintSuccessNotice(false), 4000);
    printOrderDocument(order, client);
  };

  const handleOpenStandaloneTab = () => {
    setExternalTabBlocked(false);
    const url = `${window.location.origin}${window.location.pathname}?print=${encodeURIComponent(order.id)}&autoprint=1`;
    const newTab = window.open(url, '_blank');
    if (!newTab) {
      setExternalTabBlocked(true);
    }
  };

  const handleDownload = () => {
    downloadOrderHtml(order, client);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleDownloadPdfFile = async () => {
    try {
      setPdfError(null);
      setIsGeneratingPdf(true);
      const sheetEl = document.getElementById('printable-order-sheet');
      await downloadOrderPdf(order, client, sheetEl);
      setPdfDownloadSuccess(true);
      setTimeout(() => setPdfDownloadSuccess(false), 3500);
    } catch (err: any) {
      console.error('Falha ao baixar PDF:', err);
      setPdfError(err?.message || 'Falha ao baixar arquivo PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsAppPdf = async (targetPhone?: string) => {
    const activeClient = targetPhone
      ? { ...(client || ({} as Client)), telefone: targetPhone }
      : client;

    // Se o cliente não tiver telefone cadastrado e nenhum informado, pede o número
    if (!activeClient?.telefone) {
      setShowPhonePrompt(true);
      return;
    }

    try {
      setPdfError(null);
      setIsGeneratingPdf(true);
      const sheetEl = document.getElementById('printable-order-sheet');
      const result = await sendOrderPdfToWhatsApp(order, activeClient as Client, sheetEl);
      setWhatsAppResult(result);
      setShowPhonePrompt(false);
    } catch (err: any) {
      console.error('Erro ao enviar O.S. via WhatsApp:', err);
      setPdfError(err?.message || 'Não foi possível gerar/enviar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyWhatsAppMessage = () => {
    if (!order) return;
    const msg = buildOrderPdfWhatsAppMessage(order, client);
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto print:static print:bg-white print:p-0 print:m-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="print-modal-dialog"
        className="bg-white text-[#111827] rounded-lg max-w-3xl w-full my-auto overflow-hidden shadow-2xl border border-gray-300 max-h-[95vh] flex flex-col print:max-h-none print:shadow-none print:border-0 print:m-0 print:p-0 print:w-full"
      >
        {/* Top Control Bar (Hidden on actual print) */}
        <div className="bg-[#14171C] text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#22262E] no-print print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
            <span className="font-bold text-sm tracking-tight text-white">
              Imprimir Ordem de Serviço #{order.numero}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Enviar WhatsApp (PDF Original) */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppPdf()}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Gerar e enviar a Ordem de Serviço original em formato PDF direto para o WhatsApp do cliente"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Enviar WhatsApp (PDF)'}</span>
            </button>

            {/* Botão de Imprimir */}
            <button
              type="button"
              onClick={handlePrintInCurrentWindow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E51D24] hover:bg-[#C81018] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer active:scale-95"
              title="Abrir impressão direta em folha A4 (Ctrl + P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir O.S.</span>
            </button>

            {/* Botão Baixar PDF */}
            <button
              type="button"
              onClick={handleDownloadPdfFile}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#22262E] hover:bg-[#2D333D] text-[#D1D5DB] hover:text-white text-xs font-semibold rounded transition-colors cursor-pointer"
              title="Baixar arquivo da O.S. em formato PDF (.pdf)"
            >
              {pdfDownloadSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#E51D24]" />
              )}
              <span className="hidden sm:inline">
                {pdfDownloadSuccess ? 'PDF Baixado!' : 'Baixar PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenStandaloneTab}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#22262E] hover:bg-[#2D333D] text-[#D1D5DB] hover:text-white text-xs font-semibold rounded transition-colors cursor-pointer"
              title="Abrir folha em tela cheia / nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Aba</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(order.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#22262E] hover:bg-[#2D333D] text-[#D1D5DB] hover:text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                title="Editar dados desta O.S."
              >
                <span>Editar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-white p-1 rounded hover:bg-[#22262E] transition-colors cursor-pointer ml-1"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Document vs Timeline) */}
        <div className="bg-[#181C23] border-b border-[#22262E] px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2 no-print print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-[#E51D24] text-white shadow-xs'
                  : 'bg-[#14171C] text-[#9CA3AF] hover:text-white border border-[#22262E]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Folha da O.S. (A4)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-[#E51D24] text-white shadow-xs'
                  : 'bg-[#14171C] text-[#9CA3AF] hover:text-white border border-[#22262E]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Linha do Tempo ({order.historicoStatus?.length || 1})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-[#9CA3AF]">Status Atual:</span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#101216] text-[#D1D5DB] border border-[#22262E]">
              {order.situacao}
            </span>
          </div>
        </div>

        {/* Notificação de WhatsApp / PDF Feedback */}
        {whatsAppResult && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 p-3 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print print:hidden">
            <div className="flex items-start sm:items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-white block sm:inline mr-1.5">
                  {whatsAppResult.sharedDirectly
                    ? 'PDF Original da O.S. compartilhado diretamente via WhatsApp!'
                    : 'WhatsApp aberto com o PDF original da Ordem de Serviço!'}
                </span>
                <span className="text-emerald-300">
                  {whatsAppResult.sharedDirectly
                    ? `Arquivo anexado: ${whatsAppResult.filename}`
                    : `O arquivo ${whatsAppResult.filename} foi salvo. No WhatsApp Web, basta arrastar o PDF para a conversa ou clicar no clipe 📎 para enviar o documento oficial.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {whatsAppResult.whatsappUrl && !whatsAppResult.sharedDirectly && (
                <a
                  href={whatsAppResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-bold rounded flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Reabrir WhatsApp</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyWhatsAppMessage}
                className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/30 text-emerald-200 text-[11px] rounded flex items-center gap-1 cursor-pointer"
                title="Copiar mensagem para a área de transferência"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-white" /> : <Share2 className="w-3 h-3" />}
                <span>{copiedMessage ? 'Copiada!' : 'Copiar Texto'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWhatsAppResult(null)}
                className="text-emerald-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Notificação de Erro ao Gerar/Enviar PDF */}
        {pdfError && (
          <div className="bg-red-950/90 border-b border-red-500/60 p-3 text-xs text-red-200 flex items-center justify-between gap-2.5 no-print print:hidden">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-white mr-1.5">Aviso de PDF:</span>
                <span className="text-red-300">{pdfError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="text-red-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal de Telefone caso o cliente não tenha número cadastrado */}
        {showPhonePrompt && (
          <div className="bg-amber-950/80 border-b border-amber-500/50 p-3.5 text-xs text-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print print:hidden">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Cliente sem telefone/WhatsApp cadastrado</span>
                <span className="text-amber-300">
                  Informe o número de WhatsApp com DDD para enviar o PDF da O.S.:
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="px-2.5 py-1.5 bg-[#14171C] border border-amber-500/60 rounded text-xs text-white placeholder-amber-400/50 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handleSendWhatsAppPdf(customPhone)}
                disabled={!onlyDigits(customPhone) || isGeneratingPdf}
                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 text-white font-bold rounded text-xs cursor-pointer flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Enviar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPhonePrompt(false)}
                className="text-amber-400 hover:text-white text-xs px-2 py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Feedback notices if popup or print blocked */}
        {printSuccessNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between no-print print:hidden">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Diálogo de impressão acionado com folha A4 formatada. Caso seu navegador tenha bloqueado, use o botão "Nova Aba" ou "Baixar".
            </span>
            <button
              type="button"
              onClick={() => setPrintSuccessNotice(false)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {externalTabBlocked && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between no-print print:hidden">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Pop-up bloqueado pelo navegador. Por favor, permita pop-ups para abrir em nova aba ou use "Imprimir O.S." diretamente.
            </span>
            <button
              type="button"
              onClick={() => setExternalTabBlocked(false)}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* TIMELINE TAB VIEW */}
        {activeTab === 'timeline' && (
          <div className="p-4 sm:p-6 bg-[#0E1015] overflow-y-auto max-h-[75vh] flex-1 no-print print:hidden">
            <OrderStatusTimeline order={order} />
          </div>
        )}

        {/* PRINTABLE ORDER DOCUMENT (Folha A4 original mantida 100% íntegra) */}
        <div
          id="printable-order-sheet"
          className={`p-6 sm:p-8 text-[#111827] font-sans bg-white overflow-y-auto ${
            activeTab === 'sheet' ? 'block' : 'hidden print:block'
          }`}
        >
          {/* Document Header */}
          <div className="border-b-2 border-[#E51D24] pb-4 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#E51D24] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>N!GAMES · ASSISTÊNCIA TÉCNICA</span>
              </div>
              <h2 className="text-xl font-bold text-[#111827] mt-0.5">
                Ordem de Serviço
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Manutenção especializada de consoles, controles e acessórios
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
              <div className="text-xs text-[#6B7280]">Número da O.S.</div>
              <div className="font-mono text-2xl font-bold text-[#E51D24]">
                #{order.numero}
              </div>
            </div>
          </div>

          {/* Metadata Bar - Somente Data de Entrada */}
          <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#E51D24]" />
              <span className="text-[#6B7280] font-medium">Data de Entrada:</span>
              <span className="font-mono font-bold text-[#111827]">
                {formatDateTime(order.entrada)}
              </span>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="mb-5 border border-gray-200 rounded overflow-hidden">
            <div className="bg-[#14171C] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-[#22262E]">
              <User className="w-3.5 h-3.5 text-[#E51D24]" />
              <span>Dados do Cliente</span>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#6B7280] block">Nome completo:</span>
                <span className="font-semibold text-sm text-[#111827]">
                  {client ? client.nome : '(Cliente não localizado)'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block">CPF:</span>
                <span className="font-mono font-semibold text-[#111827]">
                  {client ? client.cpf : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Telefone / WhatsApp:
                </span>
                <span className="font-semibold text-[#111827]">
                  {client ? client.telefone : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> CEP:
                </span>
                <span className="font-mono font-semibold text-[#111827]">
                  {client?.cep || '—'}
                </span>
              </div>
              {client?.endereco && (
                <div className="sm:col-span-2">
                  <span className="text-[#6B7280] block">Endereço:</span>
                  <span className="text-[#111827]">{client.endereco}</span>
                </div>
              )}
            </div>
          </div>

          {/* Equipment & Maintenance Items Details */}
          <div className="mb-5 border border-gray-200 rounded overflow-hidden">
            <div className="bg-[#14171C] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-[#22262E]">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#E51D24]" />
                <span>
                  {hasMultipleItems
                    ? `Itens para Manutenção (${order.itens!.length} itens cadastrados)`
                    : 'Dados do Equipamento & Diagnóstico'}
                </span>
              </div>
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              {hasMultipleItems ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-100 text-[#4B5563]">
                        <th className="py-1.5 px-2 w-8 text-center font-bold">#</th>
                        <th className="py-1.5 px-2 font-bold">Equipamento / Modelo</th>
                        <th className="py-1.5 px-2 font-bold w-28">Nº Série</th>
                        <th className="py-1.5 px-2 font-bold">Defeito Relatado</th>
                        <th className="py-1.5 px-2 font-bold">Estado do Console / Observações</th>
                        {order.itens!.some((i) => Number(i.valor) > 0) && (
                          <th className="py-1.5 px-2 font-bold text-right w-24">Valor</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.itens!.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2 px-2 text-center font-bold text-[#E51D24]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <div className="font-bold text-[#111827]">{item.equipamento}</div>
                            {(item.marca || item.modelo) && (
                              <div className="text-[11px] text-[#6B7280]">
                                {[item.marca, item.modelo].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px] text-[#374151]">
                            {item.serie || '—'}
                          </td>
                          <td className="py-2 px-2 text-[#111827]">
                            {item.defeito || '—'}
                          </td>
                          <td className="py-2 px-2 text-[#374151]">
                            {item.estadoConsole ? (
                              <span className="text-[11px] text-[#374151]">{item.estadoConsole}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          {order.itens!.some((i) => Number(i.valor) > 0) && (
                            <td className="py-2 px-2 font-mono font-bold text-right text-[#111827]">
                              {item.valor ? formatCurrency(Number(item.valor)) : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[#6B7280] block">Equipamento:</span>
                      <span className="font-semibold text-[13px] text-[#111827]">
                        {order.equipamento}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Marca / Modelo:</span>
                      <span className="font-medium text-[#111827]">
                        {[order.marca, order.modelo].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Nº de Série:</span>
                      <span className="font-mono text-[#111827]">
                        {order.serie || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-2.5">
                    <span className="text-[#6B7280] font-semibold block mb-1">
                      Defeito Relatado:
                    </span>
                    <p className="bg-gray-50 p-2.5 rounded border border-gray-200 text-[#111827] text-xs leading-relaxed">
                      {order.defeito || 'Nenhum defeito detalhado no cadastro.'}
                    </p>
                  </div>

                  {(order.estadoConsole || (order.itens && order.itens[0]?.estadoConsole)) && (
                    <div className="border-t border-gray-200 pt-2.5">
                      <span className="text-[#6B7280] font-semibold block mb-1">
                        Estado do Console / Observações:
                      </span>
                      <p className="bg-gray-50 p-2.5 rounded border border-gray-200 text-[#111827] text-xs leading-relaxed">
                        {order.estadoConsole || order.itens?.[0]?.estadoConsole}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Value Section */}
          <div className="mb-5 bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#6B7280] block">
                  Valor Total do Serviço
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  Mão de obra e serviços inclusos no valor total
                </span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#E51D24]">
                {formatCurrency(totalValue)}
              </div>
            </div>
          </div>

          {/* Observations */}
          {order.obs && (
            <div className="mb-5 border border-gray-200 rounded p-3 text-xs">
              <span className="text-[#6B7280] font-semibold block mb-0.5">Observações:</span>
              <p className="text-[#111827] leading-relaxed">{order.obs}</p>
            </div>
          )}

          {/* Terms and Signatures for Print */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-[11px] text-[#6B7280]">
            <div className="flex items-start gap-1.5 mb-6">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#E51D24] mt-0.5" />
              <p className="leading-normal">
                <strong>Termo de Garantia:</strong> Garantia legal de 90 (noventa) dias sobre os serviços executados e componentes substituídos, a contar da data de entrega, conforme Artigo 26 do Código de Defesa do Consumidor (Lei 8.078/90). Não cobre mau uso, lacre violado, quedas, umidade ou danos por oscilação elétrica.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 mt-4">
              <div className="text-center">
                <div className="border-t border-[#111827] w-4/5 mx-auto mb-1"></div>
                <div className="font-semibold text-xs text-[#111827]">N!GAMES ASSISTÊNCIA</div>
                <div className="text-[10px] text-[#6B7280]">Assinatura do Técnico Responsável</div>
              </div>

              <div className="text-center">
                <div className="border-t border-[#111827] w-4/5 mx-auto mb-1"></div>
                <div className="font-semibold text-xs text-[#111827]">
                  {client ? client.nome : 'Cliente'}
                </div>
                <div className="text-[10px] text-[#6B7280]">
                  Assinatura de Retirada · {order.dataRetirada ? `Retirado em ${formatDateTime(order.dataRetirada)}` : 'Data: ____/____/________'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
