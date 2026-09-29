import React, { useState, useEffect } from 'react';
import { ServiceOrder, Client, TechnicalReport } from '../types';
import { api } from '../services/api';
import {
  FileCheck2,
  X,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Printer,
  Calendar,
  UserCheck,
  Cpu,
  FileText,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TechnicalReportModalProps {
  isOpen: boolean;
  order: ServiceOrder | null;
  client?: Client | null;
  onClose: () => void;
  onSaved?: (report: TechnicalReport) => void;
}

export const TechnicalReportModal: React.FC<TechnicalReportModalProps> = ({
  isOpen,
  order,
  client,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [diagnostico, setDiagnostico] = useState('');
  const [servicoRealizado, setServicoRealizado] = useState('');
  const [pecasUtilizadas, setPecasUtilizadas] = useState('');
  const [observacaoTecnica, setObservacaoTecnica] = useState('');
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState('Técnico Especialista N! GAMES');
  const [dataAnalise, setDataAnalise] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setError(null);
      setSuccessMsg(null);
      setLoading(true);
      api
        .getTechnicalReport(order.id)
        .then((existing) => {
          if (existing) {
            setReport(existing);
            setDiagnostico(existing.diagnostico);
            setServicoRealizado(existing.servicoRealizado);
            setPecasUtilizadas(existing.pecasUtilizadas || '');
            setObservacaoTecnica(existing.observacaoTecnica || '');
            setTecnicoResponsavel(existing.tecnicoResponsavel);
            setDataAnalise(existing.dataAnalise ? existing.dataAnalise.slice(0, 10) : new Date().toISOString().slice(0, 10));
          } else {
            setReport(null);
            setDiagnostico(order.defeito ? `Análise pericial de defeito reclamado: ${order.defeito}` : '');
            setServicoRealizado(order.solucao || '');
            setPecasUtilizadas('');
            setObservacaoTecnica('');
            setTecnicoResponsavel('Técnico Especialista N! GAMES');
            setDataAnalise(new Date().toISOString().slice(0, 10));
          }
        })
        .catch((err) => {
          console.warn('[TechnicalReportModal] Erro ao carregar laudo:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnostico.trim() || !servicoRealizado.trim() || !tecnicoResponsavel.trim()) {
      setError('Diagnóstico pericial, serviço realizado e técnico responsável são campos obrigatórios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let saved: TechnicalReport;
      if (report) {
        saved = await api.updateTechnicalReport(order.id, {
          diagnostico: diagnostico.trim(),
          servicoRealizado: servicoRealizado.trim(),
          pecasUtilizadas: pecasUtilizadas.trim() || undefined,
          observacaoTecnica: observacaoTecnica.trim() || undefined,
          tecnicoResponsavel: tecnicoResponsavel.trim(),
          dataAnalise: dataAnalise || new Date().toISOString(),
        });
        setSuccessMsg('Laudo Técnico (1:1) atualizado com sucesso!');
      } else {
        saved = await api.createTechnicalReport(order.id, {
          diagnostico: diagnostico.trim(),
          servicoRealizado: servicoRealizado.trim(),
          pecasUtilizadas: pecasUtilizadas.trim() || undefined,
          observacaoTecnica: observacaoTecnica.trim() || undefined,
          tecnicoResponsavel: tecnicoResponsavel.trim(),
          dataAnalise: dataAnalise || new Date().toISOString(),
        });
        setSuccessMsg('Laudo Técnico (1:1) emitido e registrado!');
      }
      setReport(saved);
      if (onSaved) onSaved(saved);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao gravar Laudo Técnico.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir o Laudo Técnico desta Ordem de Serviço?')) return;
    setDeleting(true);
    try {
      await api.deleteTechnicalReport(order.id);
      setReport(null);
      setDiagnostico('');
      setServicoRealizado('');
      setPecasUtilizadas('');
      setObservacaoTecnica('');
      setSuccessMsg('Laudo Técnico excluído.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir laudo.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Laudo Técnico - O.S. #${order.numero} - N! GAMES</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #111; line-height: 1.5; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E51D24; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 900; color: #E51D24; letter-spacing: -0.5px; }
          .badge { background: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb; }
          .box-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
          .section { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
          .section-title { font-size: 12px; font-weight: bold; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px dashed #d1d5db; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
          .sign-line { border-top: 1px solid #374151; padding-top: 5px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">N! GAMES</div>
            <div style="font-size: 11px; color: #4b5563;">ASSISTÊNCIA TÉCNICA ESPECIALIZADA EM CONSOLES E CONTROLES</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">Relatório Pericial 1:1</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">LAUDO TÉCNICO PERICIAL</div>
            <div style="font-size: 12px; font-family: monospace; color: #4b5563;">O.S. #${order.numero} · Ref: ${order.id}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="box-title">Dados do Cliente</div>
            <div style="font-weight: bold;">${client ? client.nome : 'Cliente não informado'}</div>
            ${client?.cpf ? `<div>CPF: ${client.cpf}</div>` : ''}
            ${client?.telefone ? `<div>WhatsApp / Tel: ${client.telefone}</div>` : ''}
          </div>
          <div class="box">
            <div class="box-title">Equipamento Avaliado</div>
            <div style="font-weight: bold;">${order.equipamento}</div>
            ${order.marca || order.modelo ? `<div>Marca / Modelo: ${[order.marca, order.modelo].filter(Boolean).join(' · ')}</div>` : ''}
            ${order.serie ? `<div>Nº Série: ${order.serie}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Diagnóstico Pericial de Entrada</div>
          <p>${diagnostico.replace(/\n/g, '<br>')}</p>
        </div>

        <div class="section">
          <div class="section-title">2. Procedimentos e Serviços Executados</div>
          <p>${servicoRealizado.replace(/\n/g, '<br>')}</p>
        </div>

        ${pecasUtilizadas ? `
          <div class="section">
            <div class="section-title">3. Componentes, Peças e Insumos Substituídos</div>
            <p>${pecasUtilizadas.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${observacaoTecnica ? `
          <div class="section">
            <div class="section-title">4. Observações Técnicas e Testes de Estresse</div>
            <p>${observacaoTecnica.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">5. Responsabilidade Técnica</div>
          <div><strong>Técnico Responsável:</strong> ${tecnicoResponsavel}</div>
          <div><strong>Data da Perícia / Conclusão:</strong> ${dataAnalise || new Date().toISOString().slice(0, 10)}</div>
        </div>

        <div class="signatures">
          <div class="sign-line">
            <strong>${tecnicoResponsavel}</strong><br>
            N! Games Assistência Especializada
          </div>
          <div class="sign-line">
            <strong>${client ? client.nome : 'Cliente Responsável'}</strong><br>
            Ciente dos procedimentos executados
          </div>
        </div>

        <div class="footer">
          <div>Documento auditado do sistema N! Games · Relacionamento 1:1 estrito</div>
          <div>Gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#14171C] border border-[#22262E] rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#E51D24]/10 rounded-lg text-[#E51D24]">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Laudo Técnico Pericial</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E51D24]/20 text-[#F87171] border border-[#E51D24]/30">
                    Relacionamento 1:1 Estrito
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  O.S. #{order.numero} · {order.equipamento} {client ? `· Cliente: ${client.nome}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-white p-1 rounded hover:bg-[#1F242D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-lg text-xs font-semibold text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-lg text-xs font-semibold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#9CA3AF]">
              <Loader2 className="w-6 h-6 animate-spin text-[#E51D24]" />
              <span className="text-xs">Consultando Laudo Técnico pericial...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="p-3 bg-[#101216] border border-[#22262E] rounded-lg text-xs text-[#9CA3AF] space-y-1">
                <div className="flex items-center justify-between text-white font-semibold">
                  <span>Auditoria & Relacionamento 1:1</span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {report ? `✓ Laudo ID: ${report.id}` : 'Sem laudo emitido ainda'}
                  </span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  Cada Ordem de Serviço pode ter <strong>no máximo 1 Laudo Técnico pericial</strong> vinculado. O laudo consolida a análise técnica detalhada para auditoria, garantia e documentação oficial da N! Games.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  1. Diagnóstico Pericial de Entrada <span className="text-[#E51D24]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  placeholder="Ex: Análise em bancada constatou curto-circuito na linha de 12V da fonte, com presença de oxidação nos capacitores..."
                  className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  2. Procedimentos e Serviços Executados <span className="text-[#E51D24]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={servicoRealizado}
                  onChange={(e) => setServicoRealizado(e.target.value)}
                  placeholder="Ex: Realizada desoxidação química via ultrassom, substituição do mosfet canal N e troca de pasta térmica por composto de prata..."
                  className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                    3. Peças / Componentes Trocados
                  </label>
                  <input
                    type="text"
                    value={pecasUtilizadas}
                    onChange={(e) => setPecasUtilizadas(e.target.value)}
                    placeholder="Ex: 1x Mosfet canal N, 2x Capacitores SMD"
                    className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                    4. Data da Perícia / Análise
                  </label>
                  <input
                    type="date"
                    value={dataAnalise}
                    onChange={(e) => setDataAnalise(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded font-mono text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  5. Observações Técnicas & Testes de Estresse
                </label>
                <textarea
                  rows={2}
                  value={observacaoTecnica}
                  onChange={(e) => setObservacaoTecnica(e.target.value)}
                  placeholder="Ex: Equipamento submetido a teste de estresse contínuo durante 4 horas. Temperatura máxima estabilizada em 64ºC. Todos os módulos validados."
                  className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  6. Técnico Responsável <span className="text-[#E51D24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tecnicoResponsavel}
                  onChange={(e) => setTecnicoResponsavel(e.target.value)}
                  placeholder="Nome do técnico responsável pela perícia"
                  className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-[#22262E]">
                <div className="flex items-center gap-2">
                  {report && (
                    <button
                      type="button"
                      disabled={deleting || saving}
                      onClick={handleDelete}
                      className="px-3 py-2 rounded text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-800/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deleting ? 'Excluindo...' : 'Excluir Laudo'}</span>
                    </button>
                  )}
                  {report && (
                    <button
                      type="button"
                      onClick={handlePrintReport}
                      className="px-3 py-2 rounded text-xs font-semibold text-[#D1D5DB] hover:text-white hover:bg-[#1F242D] border border-[#374151] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#E51D24]" />
                      <span>Imprimir Laudo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#E51D24] hover:bg-[#C81018] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gravando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{report ? 'Atualizar Laudo' : 'Salvar Laudo 1:1'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
