import React, { useState, useMemo, useRef } from 'react';
import { Client, ServiceOrder, ViewType } from '../types';
import { onlyDigits, createWhatsAppLink } from '../utils/formatters';
import { Plus, Search, Users, Trash2, Edit, X, MessageCircle, FileText, Phone } from 'lucide-react';

interface ClientsListViewProps {
  clients: Client[];
  orders: ServiceOrder[];
  onNavigate: (view: ViewType) => void;
  onEditClient: (clientId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onFilterOrdersByClient?: (clientName: string) => void;
}

export const ClientsListView: React.FC<ClientsListViewProps> = ({
  clients,
  orders,
  onNavigate,
  onEditClient,
  onDeleteClient,
  onFilterOrdersByClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const qDigits = onlyDigits(q);

    let list = [...clients];
    if (q) {
      list = list.filter((c) => {
        const inNome = c.nome.toLowerCase().includes(q);
        const inCpf = qDigits.length >= 2 && onlyDigits(c.cpf).includes(qDigits);
        const inEmail = (c.email || '').toLowerCase().includes(q);
        const inTel = qDigits.length >= 2 && onlyDigits(c.telefone).includes(qDigits);
        return inNome || inCpf || inEmail || inTel;
      });
    }

    list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return list;
  }, [clients, searchTerm]);

  return (
    <div id="view-clientes" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
            <h2 className="text-[22px] font-bold text-white tracking-tight">Cadastro de Clientes</h2>
            <span className="text-xs font-mono font-bold bg-[#1C2028] text-[#9CA3AF] px-2.5 py-0.5 rounded-full border border-[#2A303C]">
              {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Busque por nome, CPF ou telefone, converse no WhatsApp e acesse as O.S. de cada cliente.
          </p>
        </div>

        <button
          onClick={() => onNavigate('cliente-form')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E51D24] hover:bg-[#C81018] text-white text-[13px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_14px_rgba(229,29,36,0.35)] cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente (C)</span>
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            ref={searchInputRef}
            id="cliente-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente por nome, CPF, telefone ou e-mail..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#14171C] border border-[#22262E] rounded-xl text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-white rounded-full transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Clients Table Panel */}
      <div className="bg-[#14171C] border border-[#22262E] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center text-[#9CA3AF]">
              <Users className="w-10 h-10 mx-auto mb-2.5 text-[#4B5563]" />
              <p className="text-sm font-bold text-white">Nenhum cliente encontrado.</p>
              <p className="text-xs mt-1 text-[#9CA3AF]">
                {searchTerm
                  ? 'Nenhum cliente corresponde ao termo pesquisado.'
                  : 'Cadastre o primeiro cliente para vinculá-lo às ordens de serviço.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-[#1C2028] hover:bg-[#252B36] border border-[#374151] rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Busca</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on mobile/tablet portrait < md) */}
              <div className="md:hidden divide-y divide-[#22262E]">
                {filteredClients.map((client) => {
                  const linkedOsCount = orders.filter((o) => o.clienteId === client.id).length;
                  const zapLink = client.telefone
                    ? createWhatsAppLink(
                        client.telefone,
                        `Olá, ${client.nome}! Tudo bem? Aqui é da assistência técnica N! GAMES 🎮`
                      )
                    : null;

                  return (
                    <div
                      key={client.id}
                      onClick={() => onEditClient(client.id)}
                      className="p-3.5 sm:p-4 hover:bg-[#181C23] active:bg-[#1C2028] transition-colors cursor-pointer space-y-2.5"
                    >
                      {/* Name & O.S. Count badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[14px] text-white hover:text-[#E51D24] transition-colors truncate">
                          {client.nome}
                        </span>

                        <div onClick={(e) => e.stopPropagation()}>
                          {linkedOsCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onFilterOrdersByClient) {
                                  onFilterOrdersByClient(client.nome);
                                } else {
                                  onNavigate('ordens');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1C2028] hover:bg-[#E51D24]/20 text-[#D1D5DB] hover:text-[#E51D24] border border-[#2D323C] text-[11px] font-mono font-bold transition-all cursor-pointer"
                              title="Ver ordens deste cliente"
                            >
                              <FileText className="w-3 h-3 text-[#E51D24]" />
                              <span>{linkedOsCount} O.S.</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6B7280] font-mono">0 O.S.</span>
                          )}
                        </div>
                      </div>

                      {/* CPF & Address */}
                      <div className="text-xs text-[#9CA3AF] space-y-0.5">
                        <div className="font-mono text-[#D1D5DB]">
                          CPF: {client.cpf}
                        </div>
                        {client.endereco && (
                          <div className="text-[#9CA3AF] truncate text-[11.5px]">
                            {client.endereco}
                          </div>
                        )}
                        {client.email && (
                          <div className="text-[#9CA3AF] truncate text-[11.5px]">
                            {client.email}
                          </div>
                        )}
                      </div>

                      {/* Phone & Actions row */}
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C2028]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-white">
                            {client.telefone}
                          </span>
                          {zapLink && (
                            <a
                              href={zapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-1 rounded bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 cursor-pointer"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Zap</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditClient(client.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#374151] text-[#D1D5DB] hover:text-white cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteClient(client.id)}
                            className="p-1.5 rounded-md border border-[#374151] text-[#EF4444] hover:bg-[#EF4444]/15 cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (Hidden on mobile < md) */}
              <table className="hidden md:table w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#101216] border-b border-[#22262E] text-[11px] uppercase tracking-wider text-[#9CA3AF] font-bold">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">CPF</th>
                  <th className="py-3 px-4">Telefone / WhatsApp</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4 text-center">O.S. Vinculadas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262E]">
                {filteredClients.map((client) => {
                  const linkedOsCount = orders.filter((o) => o.clienteId === client.id).length;
                  const zapLink = client.telefone
                    ? createWhatsAppLink(
                        client.telefone,
                        `Olá, ${client.nome}! Tudo bem? Aqui é da assistência técnica N! GAMES 🎮`
                      )
                    : null;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-[#181C23] transition-colors group cursor-pointer"
                      onClick={() => onEditClient(client.id)}
                      title="Clique para editar cadastro do cliente"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[13.5px] text-white">
                        <div className="group-hover:text-[#E51D24] transition-colors">{client.nome}</div>
                        {client.endereco && (
                          <div className="text-xs text-[#6B7280] truncate max-w-xs">{client.endereco}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[13px] text-[#D1D5DB]">
                        {client.cpf}
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#D1D5DB]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{client.telefone}</span>
                          {zapLink && (
                            <a
                              href={zapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] transition-colors cursor-pointer"
                              title="Abrir WhatsApp direto com o cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#9CA3AF]">
                        {client.email || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {linkedOsCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onFilterOrdersByClient) {
                                onFilterOrdersByClient(client.nome);
                              } else {
                                onNavigate('ordens');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C2028] hover:bg-[#E51D24]/20 text-white hover:text-[#E51D24] border border-[#2D323C] hover:border-[#E51D24]/50 text-xs font-mono font-bold transition-all cursor-pointer"
                            title="Ver ordens deste cliente"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{linkedOsCount} {linkedOsCount === 1 ? 'O.S.' : 'O.S.'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[#6B7280] font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => onEditClient(client.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#374151] text-[#D1D5DB] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => onDeleteClient(client.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold p-1.5 rounded-md border border-[#374151] text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
    </div>
  );
};
