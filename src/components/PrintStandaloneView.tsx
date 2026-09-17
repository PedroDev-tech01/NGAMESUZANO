import React, { useEffect } from 'react';
import { Client, ServiceOrder } from '../types';
import { formatCurrency, formatDateTime, getOrderValue } from '../utils/formatters';
import { downloadOrderHtml } from '../utils/printDocument';
import { Printer, ArrowLeft, Download, ShieldCheck, Calendar, User, Phone, MapPin, Wrench } from 'lucide-react';

interface PrintStandaloneViewProps {
  order: ServiceOrder;
  client: Client | null;
  onBack: () => void;
}

export const PrintStandaloneView: React.FC<PrintStandaloneViewProps> = ({
  order,
  client,
  onBack,
}) => {
  const totalValue = getOrderValue(order);
  const hasMultipleItems = Array.isArray(order.itens) && order.itens.length > 0;

  useEffect(() => {
    // Automatically trigger print dialog when rendered
    const timer = setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Auto print failed or blocked:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      alert('Para imprimir, utilize o atalho Ctrl + P (ou Cmd + P no Mac).');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] p-4 sm:p-8 print:p-0 print:bg-white text-white">
      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 bg-[#14171C] text-white p-3.5 sm:p-4 rounded-xl shadow-2xl border border-[#22262E] flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition-colors cursor-pointer border border-[#374151]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Sistema</span>
          </button>

          <div className="hidden sm:block border-l border-[#22262E] pl-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#9CA3AF]">
              Ordem de Serviço
            </span>
            <span className="font-mono font-bold text-sm bg-white/10 px-2 py-0.5 rounded ml-2 text-white">
              #{order.numero}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadOrderHtml(order, client)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition-colors cursor-pointer border border-[#374151]"
            title="Baixar folha avulsa em HTML"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Baixar Documento</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E51D24] hover:bg-[#C81018] text-white rounded text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Folha (Ctrl + P)</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE SHEET */}
      <div
        id="printable-order-sheet"
        className="max-w-3xl mx-auto bg-white text-[#111827] rounded-xl shadow-2xl p-6 sm:p-10 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full"
      >
        {/* Header */}
        <div className="border-b-2 border-[#E51D24] pb-4 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#E51D24] flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>N!GAMES · ASSISTÊNCIA TÉCNICA</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111827] mt-1">
              Ordem de Serviço
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Manutenção especializada de consoles, controles e acessórios
            </p>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-[#6B7280]">Número da O.S.</div>
            <div className="font-mono text-3xl font-extrabold text-[#E51D24]">
              #{order.numero}
            </div>
          </div>
        </div>

        {/* Metadata Bar - Somente Data de Entrada */}
        <div className="p-3.5 bg-gray-50 rounded border border-gray-200 text-xs mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#E51D24]" />
            <span className="text-[#6B7280] font-medium">Data de Entrada:</span>
            <span className="font-mono font-bold text-[#111827] text-sm">
              {formatDateTime(order.entrada)}
            </span>
          </div>
        </div>

        {/* Client Details Section */}
        <div className="mb-5 border border-gray-200 rounded overflow-hidden">
          <div className="bg-[#14171C] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-[#22262E]">
            <User className="w-3.5 h-3.5 text-[#E51D24]" />
            <span>Dados do Cliente</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <span className="text-[#6B7280] block">Nome completo:</span>
              <span className="font-bold text-sm text-[#111827]">
                {client ? client.nome : '(Cliente não localizado)'}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block">CPF:</span>
              <span className="font-mono font-semibold text-sm text-[#111827]">
                {client ? client.cpf : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Telefone / WhatsApp:
              </span>
              <span className="font-semibold text-sm text-[#111827]">
                {client ? client.telefone : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> CEP:
              </span>
              <span className="font-mono font-semibold text-sm text-[#111827]">
                {client?.cep || '—'}
              </span>
            </div>
            {client?.endereco && (
              <div className="sm:col-span-2">
                <span className="text-[#6B7280] block">Endereço:</span>
                <span className="text-sm text-[#111827]">{client.endereco}</span>
              </div>
            )}
          </div>
        </div>

        {/* Equipment & Maintenance Items Section */}
        <div className="mb-5 border border-gray-200 rounded overflow-hidden">
          <div className="bg-[#14171C] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-[#22262E]">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#E51D24]" />
              <span>
                {hasMultipleItems
                  ? `Itens para Manutenção (${order.itens!.length} itens cadastrados)`
                  : 'Dados do Equipamento & Diagnóstico'}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3.5 text-xs">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#6B7280] block">Equipamento:</span>
                    <span className="font-bold text-sm text-[#111827]">
                      {order.equipamento}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">Marca / Modelo:</span>
                    <span className="font-medium text-sm text-[#111827]">
                      {[order.marca, order.modelo].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">Nº de Série:</span>
                    <span className="font-mono text-sm text-[#111827]">
                      {order.serie || '—'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <span className="text-[#111827] font-bold block mb-1">
                    Defeito Relatado:
                  </span>
                  <p className="bg-gray-50 p-3 rounded border border-gray-200 text-[#111827] text-xs leading-relaxed">
                    {order.defeito || 'Nenhum defeito detalhado no cadastro.'}
                  </p>
                </div>

                {(order.estadoConsole || (order.itens && order.itens[0]?.estadoConsole)) && (
                  <div className="border-t border-gray-200 pt-3">
                    <span className="text-[#111827] font-bold block mb-1">
                      Estado do Console / Observações:
                    </span>
                    <p className="bg-gray-50 p-3 rounded border border-gray-200 text-[#111827] text-xs leading-relaxed">
                      {order.estadoConsole || order.itens?.[0]?.estadoConsole}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Value Section */}
        <div className="mb-5 bg-gray-50 border border-gray-200 rounded p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#6B7280] block">
                Valor Total do Serviço
              </span>
              <span className="text-xs text-[#6B7280]">
                Mão de obra e serviços inclusos no valor total
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-[#E51D24]">
              {formatCurrency(totalValue)}
            </div>
          </div>
        </div>

        {/* Observations */}
        {order.obs && (
          <div className="mb-5 border border-gray-200 rounded p-3.5 text-xs">
            <span className="text-[#6B7280] font-bold block mb-0.5">Observações:</span>
            <p className="text-[#111827] leading-relaxed">{order.obs}</p>
          </div>
        )}

        {/* Terms and Signatures for Print */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-[11px] text-[#6B7280]">
          <div className="flex items-start gap-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#E51D24] mt-0.5" />
            <p className="leading-normal">
              <strong>Termo de Garantia:</strong> Garantia legal de 90 (noventa) dias sobre os serviços executados e componentes substituídos, a contar da data de entrega, conforme Artigo 26 do Código de Defesa do Consumidor (Lei 8.078/90). Não cobre mau uso, lacre violado, quedas, líquidos ou danos por oscilação elétrica.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 mt-4">
            <div className="text-center">
              <div className="border-t border-[#111827] w-4/5 mx-auto mb-1.5"></div>
              <div className="font-bold text-xs text-[#111827]">N!GAMES ASSISTÊNCIA</div>
              <div className="text-[10px] text-[#6B7280]">Assinatura do Técnico Responsável</div>
            </div>

            <div className="text-center">
              <div className="border-t border-[#111827] w-4/5 mx-auto mb-1.5"></div>
              <div className="font-bold text-xs text-[#111827]">
                {client ? client.nome : 'Cliente'}
              </div>
              <div className="text-[10px] text-[#6B7280]">
                Assinatura do Cliente · {order.dataRetirada ? `Retirado em ${formatDateTime(order.dataRetirada)}` : 'Data: ____/____/________'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
