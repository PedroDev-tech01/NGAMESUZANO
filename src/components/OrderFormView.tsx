import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, OrderItem, OrderStatus, SalesChannel, ServiceOrder, ViewType } from '../types';
import {
  getOrderValue,
  onlyDigits,
  isoToDatetimeLocal,
  datetimeLocalToIso,
  getPrazoInfo,
  formatCPF,
  formatPhone,
  formatCEP,
  formatCurrency,
  formatDateTime,
  getStatusBadgeStyle,
} from '../utils/formatters';
import { fetchAddressByCEP } from '../utils/cepService';
import {
  Search,
  UserCheck,
  Plus,
  Trash2,
  CalendarClock,
  Clock,
  X,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Package,
  Wrench,
  DollarSign,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
  MapPin,
  Loader2,
  Phone,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface OrderFormViewProps {
  editingOrder: ServiceOrder | null;
  clients: Client[];
  nextOrderSeq: number;
  initialClientId?: string | null;
  onSave: (orderData: Partial<ServiceOrder>) => void;
  onNavigate: (view: ViewType) => void;
  onGoToNewClient?: () => void;
  onCreateClient?: (clientData: Partial<Client>) => Promise<Client> | Client;
}

const COMMON_EQUIPMENTS = [
  'PlayStation 5',
  'PlayStation 4 Slim',
  'PlayStation 4 Pro',
  'Xbox Series X',
  'Xbox Series S',
  'Xbox One S',
  'Nintendo Switch OLED',
  'Nintendo Switch V2',
  'Controle DualSense PS5',
  'Controle Xbox Series',
];

const COMMON_DEFECTS = [
  'Sem sinal HDMI / Porta danificada',
  'Drift no analógico (alavanca puxando)',
  'Não liga / Sem sinal de energia',
  'Superaquecimento / Limpeza e pasta térmica',
  'Leitor não lê disco / Mecanismo travado',
  'Conector USB-C danificado ou folgado',
  'Gatilho R2/L2 ou LB/RB sem clique',
  'Desliga sozinho durante jogos',
  'Erro de sistema / Atualização travada',
];

const COMMON_CONSOLE_CONDITIONS = [
  'Lacre original intacto',
  'Lacre violado',
  'Riscos na carcaça',
  'Excelente estado / Sem riscos',
  'Marcas de queda / Avarias',
  'Falta parafusos',
  'Apenas o console',
  'Acompanha cabos originais',
];

export const OrderFormView: React.FC<OrderFormViewProps> = ({
  editingOrder,
  clients,
  nextOrderSeq,
  initialClientId,
  onSave,
  onNavigate,
  onGoToNewClient,
  onCreateClient,
}) => {
  // Selected client
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Maintenance Items (Array of items for service)
  const [itens, setItens] = useState<OrderItem[]>([
    {
      id: 'item-1',
      equipamento: '',
      marca: '',
      modelo: '',
      serie: '',
      defeito: '',
      valor: undefined,
    },
  ]);

  // General & Legacy Order fields
  const [situacao, setSituacao] = useState<OrderStatus>('Em aberto');
  const [canalVenda, setCanalVenda] = useState<SalesChannel>('Presencial');
  const [obs, setObs] = useState('');

  // Dates (Using normalized local ISO datetime strings)
  const currentYear = new Date().getFullYear();
  const [entrada, setEntrada] = useState<string>(isoToDatetimeLocal(new Date().toISOString()));
  const [prazo, setPrazo] = useState<string>('');
  const [saida, setSaida] = useState<string>('');
  const [dataRetirada, setDataRetirada] = useState<string>('');
  const [dataRetorno, setDataRetorno] = useState<string>('');
  const [motivoRetorno, setMotivoRetorno] = useState<string>('');

  // Lock prazo year strictly to the current year (2026, 2027...)
  const handlePrazoChange = (val: string) => {
    if (!val) {
      setPrazo('');
      return;
    }
    const parts = val.split('-');
    if (parts.length >= 3) {
      const forced = `${currentYear}-${parts[1]}-${parts.slice(2).join('-')}`;
      setPrazo(forced);
    } else {
      setPrazo(val);
    }
  };

  const applyPrazoPreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    d.setFullYear(currentYear);
    setPrazo(isoToDatetimeLocal(d.toISOString()));
  };

  // Financial system - valor total unificado
  const [valorTotal, setValorTotal] = useState<string>('0');

  // Inline Quick Client Registration Modal
  const [isInlineClientModalOpen, setIsInlineClientModalOpen] = useState(false);
  const [quickCep, setQuickCep] = useState('');
  const [quickNome, setQuickNome] = useState('');
  const [quickCpf, setQuickCpf] = useState('');
  const [quickTelefone, setQuickTelefone] = useState('');
  const [quickEndereco, setQuickEndereco] = useState('');
  const [quickNumero, setQuickNumero] = useState('');
  const [quickCepLoading, setQuickCepLoading] = useState(false);
  const [quickCepMsg, setQuickCepMsg] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Feedback & errors
  const [formError, setFormError] = useState<string | null>(null);

  // Live ticking clock for real-time automatic entrada timestamp display
  const [liveNow, setLiveNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clientSearchInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownContainerRef = useRef<HTMLDivElement>(null);
  const firstEquipmentRef = useRef<HTMLInputElement>(null);

  // Close client dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        clientDropdownContainerRef.current &&
        !clientDropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsClientDropdownOpen(false);
      }
    };

    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClientDropdownOpen]);

  // Initialize or reset form values
  useEffect(() => {
    if (editingOrder) {
      setSelectedClientId(editingOrder.clienteId);
      setSituacao(editingOrder.situacao || 'Em aberto');
      setCanalVenda(editingOrder.canal || 'Presencial');
      setObs(editingOrder.obs || '');

      setEntrada(isoToDatetimeLocal(editingOrder.entrada));
      setPrazo(isoToDatetimeLocal(editingOrder.prazo));
      setSaida(isoToDatetimeLocal(editingOrder.saida));
      setDataRetirada(isoToDatetimeLocal(editingOrder.dataRetirada));
      setDataRetorno(isoToDatetimeLocal(editingOrder.dataRetorno || editingOrder.retornoAt));
      setMotivoRetorno(editingOrder.motivoRetorno || '');

      // Load items
      if (Array.isArray(editingOrder.itens) && editingOrder.itens.length > 0) {
        setItens(
          editingOrder.itens.map((item, idx) => ({
            id: item.id || `item-${idx + 1}`,
            equipamento: item.equipamento || '',
            marca: item.marca || '',
            modelo: item.modelo || '',
            serie: item.serie || '',
            defeito: item.defeito || '',
            estadoConsole: item.estadoConsole || (idx === 0 ? editingOrder.estadoConsole : '') || '',
            valor: item.valor !== undefined ? item.valor : undefined,
          }))
        );
      } else {
        setItens([
          {
            id: 'item-1',
            equipamento: editingOrder.equipamento || '',
            marca: editingOrder.marca || '',
            modelo: editingOrder.modelo || '',
            serie: editingOrder.serie || '',
            defeito: editingOrder.defeito || '',
            estadoConsole: editingOrder.estadoConsole || '',
            valor: undefined,
          },
        ]);
      }

      // Financials - valor unificado
      const currentVal = getOrderValue(editingOrder);
      setValorTotal(currentVal.toString());
    } else {
      if (initialClientId) {
        setSelectedClientId(initialClientId);
      }
      setEntrada(isoToDatetimeLocal(new Date().toISOString()));
      setPrazo('');
      setSaida('');
      setDataRetirada('');
      setDataRetorno('');
      setMotivoRetorno('');
      setSituacao('Em aberto');
      setValorTotal('0');
      setItens([
        {
          id: 'item-1',
          equipamento: '',
          marca: '',
          modelo: '',
          serie: '',
          defeito: '',
          estadoConsole: '',
          valor: undefined,
        },
      ]);
    }
  }, [editingOrder, initialClientId]);

  // Selected client object
  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  // Filter clients for dropdown search
  const filteredClients = clients.filter((c) => {
    if (!clientSearchTerm.trim()) return true;
    const term = clientSearchTerm.toLowerCase();
    const termDigits = onlyDigits(clientSearchTerm);
    const matchName = c.nome.toLowerCase().includes(term);
    const matchCpf = onlyDigits(c.cpf).includes(termDigits);
    const matchPhone = onlyDigits(c.telefone).includes(termDigits);
    const matchCep = c.cep ? onlyDigits(c.cep).includes(termDigits) : false;
    return matchName || (termDigits.length > 0 && (matchCpf || matchPhone || matchCep));
  });

  // Action: Select client and auto-focus equipment ("jogar ja o cadastro do cliente na tela e ir pra ordem de servico")
  const handleSelectClient = (c: Client) => {
    setSelectedClientId(c.id);
    setIsClientDropdownOpen(false);
    setClientSearchTerm('');
    setFormError(null);

    // Smoothly scroll to and focus the first equipment field
    setTimeout(() => {
      const equipInput = document.getElementById('os-item-0-equipamento') as HTMLInputElement | null;
      if (equipInput) {
        equipInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        equipInput.focus();
      }
    }, 150);
  };

  // Multiple Items Handlers
  const handleAddItem = () => {
    const nextIdx = itens.length + 1;
    setItens((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${nextIdx}`,
        equipamento: '',
        marca: '',
        modelo: '',
        serie: '',
        defeito: '',
        estadoConsole: '',
        valor: undefined,
      },
    ]);
    setTimeout(() => {
      const newElem = document.getElementById(`os-item-${itens.length}-equipamento`) as HTMLInputElement | null;
      if (newElem) {
        newElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        newElem.focus();
      }
    }, 100);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const sum = updated.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
      if (sum > 0) {
        setValorTotal(sum.toString());
      } else if (sum === 0) {
        setValorTotal('');
      }
      return updated;
    });
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItens((prev) => {
      const updated = prev.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      if (field === 'valor') {
        const sum = updated.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
        if (sum > 0) {
          setValorTotal(sum.toString());
        } else if (value === undefined || value === 0 || value === '') {
          if (sum === 0) {
            setValorTotal('');
          }
        }
      }
      return updated;
    });
  };

  // Quick Preset Additions to Valor Total
  const handleQuickAddValue = (amount: number) => {
    const current = parseFloat(valorTotal) || 0;
    const nextVal = Math.max(0, current + amount);
    setValorTotal(nextVal.toString());
  };

  const handleSetPresetValue = (amount: number) => {
    setValorTotal(amount.toString());
  };

  // Sum of individual item values if filled
  const sumOfItemValues = itens.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);

  // Quick Cep search in quick client modal
  const handleQuickCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCEP(e.target.value);
    setQuickCep(val);
    const digits = onlyDigits(val);
    if (digits.length === 8) {
      setQuickCepLoading(true);
      setQuickCepMsg('Buscando endereço...');
      const res = await fetchAddressByCEP(digits);
      setQuickCepLoading(false);
      if (res.success && res.address) {
        setQuickEndereco(res.address);
        setQuickCepMsg(`✓ ${res.neighborhood || res.city || 'Endereço encontrado'}`);
      } else {
        setQuickCepMsg(res.error || 'CEP não localizado');
      }
    } else {
      setQuickCepMsg(null);
    }
  };

  // Submit quick inline client
  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);

    const cpfDigits = onlyDigits(quickCpf);
    const phoneDigits = onlyDigits(quickTelefone);

    if (cpfDigits.length !== 11) {
      setQuickError('O CPF precisa ter 11 dígitos.');
      return;
    }

    // Check if client with this CPF already exists (CPF is unique ID)
    const existingClient = clients.find((c) => onlyDigits(c.cpf) === cpfDigits);
    if (existingClient) {
      setIsInlineClientModalOpen(false);
      handleSelectClient(existingClient);
      return;
    }

    if (phoneDigits.length < 10) {
      setQuickError('Informe um telefone válido com DDD.');
      return;
    }

    // Se o técnico não informou nome, o sistema cria o nome automático
    const cleanNome = quickNome.trim()
      ? quickNome.trim().toUpperCase()
      : `CLIENTE ${quickCep ? `(CEP ${quickCep})` : `(${formatCPF(quickCpf)})`}`;

    // Endereço montado a partir do CEP e número da residência
    let finalEndereco: string | undefined = undefined;
    if (quickEndereco) {
      finalEndereco = quickNumero.trim() ? `${quickEndereco}, Nº ${quickNumero.trim()}` : quickEndereco;
    } else if (quickNumero.trim()) {
      finalEndereco = `Nº ${quickNumero.trim()}`;
    }

    try {
      let created: Client;
      if (onCreateClient) {
        created = await onCreateClient({
          nome: cleanNome,
          cpf: formatCPF(quickCpf),
          telefone: formatPhone(quickTelefone),
          cep: quickCep ? formatCEP(quickCep) : undefined,
          endereco: finalEndereco,
        });
      } else {
        // Fallback
        created = {
          id: `cpf-${cpfDigits}`,
          nome: cleanNome,
          cpf: formatCPF(quickCpf),
          telefone: formatPhone(quickTelefone),
          cep: quickCep ? formatCEP(quickCep) : undefined,
          endereco: finalEndereco,
          createdAt: new Date().toISOString(),
        };
      }

      setIsInlineClientModalOpen(false);
      // Jogar já o cliente na tela e ir para a ordem de serviço
      handleSelectClient(created);
    } catch (err: any) {
      setQuickError(err.message || 'Erro ao cadastrar cliente.');
    }
  };

  // Status Change auto-handling
  const handleSituacaoChange = (newStatus: OrderStatus) => {
    setSituacao(newStatus);
    const nowLocal = isoToDatetimeLocal(new Date().toISOString());

    if (newStatus === 'Concluído' && !saida) {
      setSaida(nowLocal);
      if (!dataRetirada) setDataRetirada(nowLocal);
    } else if (newStatus === 'Retornou com defeito') {
      if (!dataRetorno) setDataRetorno(nowLocal);
    }
  };

  // Submit Order Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedClientId) {
      setFormError('Selecione ou cadastre o cliente para esta Ordem de Serviço.');
      clientSearchInputRef.current?.focus();
      return;
    }

    // Primary item validation
    const primaryItem = itens[0];
    if (!primaryItem || !primaryItem.equipamento.trim()) {
      setFormError('Informe o equipamento principal a ser atendido.');
      firstEquipmentRef.current?.focus();
      return;
    }

    const finalVal = parseFloat(valorTotal) || 0;

    const orderPayload: Partial<ServiceOrder> = {
      clienteId: selectedClientId,
      equipamento: primaryItem.equipamento.trim(),
      marca: primaryItem.marca.trim() || undefined,
      modelo: primaryItem.modelo.trim() || undefined,
      serie: primaryItem.serie.trim() || undefined,
      defeito: primaryItem.defeito.trim() || undefined,
      estadoConsole: primaryItem.estadoConsole?.trim() || undefined,
      // Multiple items array
      itens: itens.map((it) => ({
        id: it.id,
        equipamento: it.equipamento.trim(),
        marca: it.marca.trim() || undefined,
        modelo: it.modelo.trim() || undefined,
        serie: it.serie.trim() || undefined,
        defeito: it.defeito.trim() || undefined,
        estadoConsole: it.estadoConsole?.trim() || undefined,
        valor: it.valor !== undefined ? Number(it.valor) : undefined,
      })),
      situacao,
      canal: canalVenda,
      obs: obs.trim() || undefined,
      // Entrada automática gravada exatamente no momento da criação
      entrada: isEditing
        ? (editingOrder?.entrada || datetimeLocalToIso(entrada) || new Date().toISOString())
        : new Date().toISOString(),
      prazo: datetimeLocalToIso(prazo),
      saida: datetimeLocalToIso(saida),
      dataRetirada: datetimeLocalToIso(dataRetirada),
      dataRetorno: situacao === 'Retornou com defeito' ? (datetimeLocalToIso(dataRetorno) || new Date().toISOString()) : undefined,
      motivoRetorno: situacao === 'Retornou com defeito' ? motivoRetorno.trim() || undefined : undefined,
      // Financials - valor único unificado (mão de obra e peças inclusas)
      valor: finalVal,
      maoObra: finalVal,
      pecas: undefined,
      desconto: undefined,
    };

    onSave(orderPayload);
  };

  const isEditing = !!editingOrder;
  const statusBadge = getStatusBadgeStyle(situacao);

  return (
    <div id="view-os-form" className="space-y-6 max-w-4xl pb-16">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
            <h2 id="os-form-title" className="text-[22px] font-bold text-white tracking-tight">
              {isEditing ? `Editar Ordem de Serviço #${editingOrder.numero}` : 'Nova Ordem de Serviço'}
            </h2>
          </div>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5">
            {isEditing
              ? 'Atualize os dados técnicos, múltiplos itens e datas de atendimento.'
              : `Sequência automática O.S. #${nextOrderSeq} · Manutenção especializada de consoles e controles.`}
          </p>
        </div>

        {/* Status da O.S. (com destaque verde quando Concluído) */}
        <div className="flex items-center gap-2 bg-[#14171C] border border-[#22262E] px-3 py-1.5 rounded-lg shrink-0">
          <span className="text-xs text-[#9CA3AF] font-medium">Situação:</span>
          <select
            id="os-situacao-top-select"
            value={situacao}
            onChange={(e) => handleSituacaoChange(e.target.value as OrderStatus)}
            className={`text-xs font-bold px-2.5 py-1 rounded font-mono border cursor-pointer transition-all ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text} focus:outline-none`}
            title="Situação atual da Ordem de Serviço"
          >
            <option value="Em aberto" className="bg-[#14171C] text-[#FF4D52]">Em aberto</option>
            <option value="Em andamento" className="bg-[#14171C] text-white">Em andamento</option>
            <option value="Concluído" className="bg-[#14171C] text-[#10B981] font-bold">✓ Concluído</option>
            <option value="Cancelado" className="bg-[#14171C] text-[#EF4444]">Cancelado</option>
            <option value="Retornou com defeito" className="bg-[#14171C] text-rose-400">⚠️ Retornou com defeito</option>
          </select>
        </div>
      </div>

      {formError && (
        <div className="p-3.5 bg-red-900/30 border border-red-700/60 rounded-lg text-xs font-semibold text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form id="os-form" onSubmit={handleSubmit} noValidate className="space-y-6">
        
        {/* SECTION 1: SELEÇÃO / CADASTRO DE CLIENTE */}
        <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Users className="w-4 h-4 text-[#E51D24]" />
              <span>Cliente da Ordem de Serviço</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuickCep('');
                setQuickNome('');
                setQuickCpf('');
                setQuickTelefone('');
                setQuickEndereco('');
                setQuickNumero('');
                setQuickError(null);
                setQuickCepMsg(null);
                setIsInlineClientModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F242D] hover:bg-[#2A313E] text-white rounded text-xs font-semibold border border-[#374151] transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#E51D24]" />
              <span>+ Cadastrar Cliente Rápido</span>
            </button>
          </div>

          {/* JOGAR JÁ O CADASTRO DO CLIENTE NA TELA */}
          {selectedClient ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#181C23] border-2 border-[#10B981]/50 rounded-lg p-4 relative"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 rounded text-[10.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Cliente Selecionado
                    </span>
                    <span className="text-[11px] text-[#9CA3AF]">
                      Código: #{selectedClient.id.slice(-6)}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white mt-1">
                    {selectedClient.nome}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs text-[#D1D5DB]">
                    <div>
                      <span className="text-[#9CA3AF]">CPF:</span>{' '}
                      <span className="font-mono font-semibold text-white">{selectedClient.cpf}</span>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF]">WhatsApp:</span>{' '}
                      <a
                        href={`https://wa.me/55${onlyDigits(selectedClient.telefone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-[#10B981] hover:underline inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedClient.telefone}
                      </a>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF]">CEP:</span>{' '}
                      <span className="font-mono text-white">{selectedClient.cep || '—'}</span>
                    </div>
                  </div>

                  {selectedClient.endereco && (
                    <div className="text-[11.5px] text-[#9CA3AF] mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#E51D24] shrink-0" />
                      <span>{selectedClient.endereco}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId('');
                      setIsClientDropdownOpen(true);
                      setTimeout(() => clientSearchInputRef.current?.focus(), 100);
                    }}
                    className="px-3 py-1.5 bg-[#22262E] hover:bg-[#2D333D] text-[#D1D5DB] hover:text-white rounded text-xs font-semibold transition-colors cursor-pointer border border-[#374151]"
                  >
                    Trocar Cliente
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div ref={clientDropdownContainerRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#D1D5DB]">
                  Buscar cliente existente (por Nome, CPF, Telefone ou CEP)
                </label>
                {isClientDropdownOpen && (
                  <button
                    type="button"
                    onClick={() => setIsClientDropdownOpen(false)}
                    className="text-[11px] text-[#9CA3AF] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Fechar lista (Esc)</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={clientSearchInputRef}
                  type="text"
                  value={clientSearchTerm}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsClientDropdownOpen(false);
                    }
                  }}
                  placeholder="Comece a digitar o nome, CPF, telefone ou CEP do cliente..."
                  className="w-full pl-9 pr-10 py-2.5 bg-[#101216] border border-[#374151] rounded text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                />
                {clientSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchTerm('');
                      setIsClientDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white p-1 cursor-pointer"
                    title="Limpar busca e fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {isClientDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#14171C] border border-[#374151] rounded-lg shadow-2xl max-h-64 overflow-y-auto z-40 divide-y divide-[#22262E]">
                  <div className="p-2 bg-[#181C23] flex items-center justify-between text-xs text-[#9CA3AF] border-b border-[#22262E]">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                      {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-white px-2 py-0.5 rounded bg-[#22262E] hover:bg-[#2D333D] cursor-pointer"
                      title="Fechar lista"
                    >
                      <X className="w-3 h-3" />
                      <span>Fechar (Esc)</span>
                    </button>
                  </div>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className="w-full text-left p-3 hover:bg-[#1F242D] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">{c.nome}</div>
                          <div className="text-xs text-[#9CA3AF] flex items-center gap-3 mt-0.5">
                            <span className="font-mono">CPF: {c.cpf}</span>
                            <span>Tel: {c.telefone}</span>
                            {c.cep && <span className="font-mono text-emerald-400">CEP: {c.cep}</span>}
                          </div>
                        </div>
                        <div className="text-xs text-[#E51D24] font-bold flex items-center gap-1">
                          <span>Selecionar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-[#9CA3AF]">Nenhum cliente localizado para "{clientSearchTerm}".</p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickNome(clientSearchTerm);
                          setQuickCep('');
                          setQuickCpf('');
                          setQuickTelefone('');
                          setQuickEndereco('');
                          setQuickNumero('');
                          setQuickError(null);
                          setQuickCepMsg(null);
                          setIsInlineClientModalOpen(true);
                          setIsClientDropdownOpen(false);
                        }}
                        className="mt-2 text-xs font-bold text-[#E51D24] hover:underline"
                      >
                        + Cadastrar agora com estes dados
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: ITENS PARA MANUTENÇÃO (SUPORTE A MÚLTIPLOS ITENS) */}
        <div id="os-itens-section" className="bg-[#14171C] border border-[#22262E] rounded-lg p-5 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22262E] pb-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Wrench className="w-4 h-4 text-[#E51D24]" />
                <span>Itens para Manutenção</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1F242D] text-[#9CA3AF] border border-[#374151]">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Adicione consoles, controles, fontes ou jogos para a mesma ordem de serviço.
              </p>
            </div>

            {/* BOTÃO DE ADICIONAR MAIS UM ITEM PRA MANUTENÇÃO JUNTO AO OUTRO */}
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E51D24] hover:bg-[#C81018] text-white rounded text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(229,29,36,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Mais Um Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {itens.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-[#101216] border border-[#22262E] rounded-lg p-4 space-y-3.5 relative"
              >
                <div className="flex items-center justify-between border-b border-[#1F242D] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E51D24] text-white font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      Item #{idx + 1}
                    </span>
                  </div>

                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer p-1 rounded hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover este item</span>
                    </button>
                  )}
                </div>

                {/* Quick equipment suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-[#9CA3AF] self-center mr-1">Sugestões:</span>
                  {COMMON_EQUIPMENTS.map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => handleUpdateItem(idx, 'equipamento', eq)}
                      className="text-[11px] px-2 py-0.5 rounded bg-[#181C23] hover:bg-[#252C38] text-[#D1D5DB] border border-[#2A303C] transition-colors cursor-pointer"
                    >
                      {eq}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Equipamento <span className="text-[#E51D24]">*</span>
                    </label>
                    <input
                      id={`os-item-${idx}-equipamento`}
                      ref={idx === 0 ? firstEquipmentRef : undefined}
                      type="text"
                      value={item.equipamento}
                      onChange={(e) => handleUpdateItem(idx, 'equipamento', e.target.value)}
                      placeholder="Ex: PlayStation 5 ou Controle DualSense"
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#374151] rounded text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Marca / Fabricante
                    </label>
                    <input
                      type="text"
                      value={item.marca || ''}
                      onChange={(e) => handleUpdateItem(idx, 'marca', e.target.value)}
                      placeholder="Ex: Sony, Microsoft, Nintendo"
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Modelo / Versão
                    </label>
                    <input
                      type="text"
                      value={item.modelo || ''}
                      onChange={(e) => handleUpdateItem(idx, 'modelo', e.target.value)}
                      placeholder="Ex: CFI-1214A, Slim, Fat"
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Número de Série
                    </label>
                    <input
                      type="text"
                      value={item.serie || ''}
                      onChange={(e) => handleUpdateItem(idx, 'serie', e.target.value)}
                      placeholder="Nº de série da carcaça"
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded font-mono text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                    />
                  </div>
                </div>

                {/* Defeitos frequentes para clique rápido */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#9CA3AF] mr-1">Defeito rápido:</span>
                  {COMMON_DEFECTS.map((def) => (
                    <button
                      key={def}
                      type="button"
                      onClick={() => {
                        const current = item.defeito ? `${item.defeito.trim()} + ${def}` : def;
                        handleUpdateItem(idx, 'defeito', current);
                      }}
                      className="text-[10.5px] px-2 py-0.5 rounded bg-[#181C23] hover:bg-[#2A313E] text-[#D1D5DB] hover:text-white border border-[#2A303C] transition-colors cursor-pointer"
                      title="Clique para adicionar este defeito"
                    >
                      + {def}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div className="sm:col-span-3">
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Defeito Relatado pelo Cliente
                    </label>
                    <textarea
                      rows={2}
                      value={item.defeito || ''}
                      onChange={(e) => handleUpdateItem(idx, 'defeito', e.target.value)}
                      placeholder="Ex: Não liga após raio, analógico puxando para a esquerda (drift), sem sinal HDMI..."
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium text-[#D1D5DB] mb-1">
                      Valor deste item (R$) <span className="text-[10.5px] text-emerald-400 font-semibold">(soma no total)</span>
                    </label>
                    <input
                      id={`os-item-${idx}-valor`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.valor !== undefined ? item.valor : ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? undefined : parseFloat(raw);
                        handleUpdateItem(idx, 'valor', val);
                      }}
                      placeholder="0,00"
                      className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded font-mono text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                    />
                  </div>
                </div>

                {/* NOVO: Estado do console / Observações estéticas */}
                <div className="pt-2.5 border-t border-[#22262E]/70 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="block text-[11.5px] font-semibold text-[#D1D5DB]">
                      Estado do Console / Observações <span className="text-[10.5px] text-[#9CA3AF] font-normal">(marcas de uso, riscos, lacre, conservação, acessórios entregues)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-[#9CA3AF]">Rápido:</span>
                      {COMMON_CONSOLE_CONDITIONS.map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => {
                            const current = item.estadoConsole ? `${item.estadoConsole.trim()} · ${cond}` : cond;
                            handleUpdateItem(idx, 'estadoConsole', current);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#101216] hover:bg-[#252B36] text-[#D1D5DB] hover:text-white border border-[#2A303C] transition-colors cursor-pointer"
                          title="Adicionar ao estado do console"
                        >
                          + {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={item.estadoConsole || ''}
                    onChange={(e) => handleUpdateItem(idx, 'estadoConsole', e.target.value)}
                    placeholder="Ex: Lacre de fábrica intacto; riscos na carcaça superior; acompanha apenas o aparelho sem cabos..."
                    className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* SOMA DOS ITENS INDIVIDUAIS SE INFORMADOS */}
          {itens.some((it) => (Number(it.valor) || 0) > 0) && (
            <div className="p-3 bg-[#101216] border border-emerald-900/40 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-[#D1D5DB] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>
                  Soma dos itens:{' '}
                  <span className="font-mono font-bold text-white text-sm">
                    {formatCurrency(itens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0))}
                  </span>
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  ✓ Preenchido automaticamente no Valor Total do Serviço
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const totalItens = itens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
                  setValorTotal(totalItens.toString());
                }}
                className="px-2.5 py-1 bg-[#181C23] hover:bg-[#222834] text-[#D1D5DB] hover:text-white rounded text-xs font-medium border border-[#2D3340] cursor-pointer"
              >
                Reaplicar
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: DATAS, PRAZOS E CONCLUSÃO */}
        <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22262E] pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <CalendarClock className="w-4 h-4 text-[#E51D24]" />
              <span>Datas, Prazos e Conclusão</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#9CA3AF] font-medium">Status da O.S.:</span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
                {situacao}
              </span>
            </div>
          </div>

          {/* Seletor Rápido de Situação / Status */}
          <div className="bg-[#101216] border border-[#22262E] rounded-lg p-3 space-y-2">
            <div className="text-[11.5px] font-semibold text-[#D1D5DB]">
              Alterar Situação:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(['Em aberto', 'Em andamento', 'Concluído', 'Cancelado', 'Retornou com defeito'] as OrderStatus[]).map((st) => {
                const isSelected = situacao === st;
                let activeStyle = 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-white';
                if (st === 'Concluído') {
                  activeStyle = isSelected
                    ? 'bg-[#073322] text-[#10B981] border-[#059669] ring-2 ring-[#10B981]/50 font-bold shadow-md shadow-emerald-950/60'
                    : 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-[#10B981] hover:border-[#059669]/50';
                } else if (st === 'Em aberto') {
                  activeStyle = isSelected
                    ? 'bg-[#2A0D0F] text-[#FF4D52] border-[#E51D24] ring-2 ring-[#E51D24]/30 font-bold'
                    : 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-white';
                } else if (st === 'Em andamento') {
                  activeStyle = isSelected
                    ? 'bg-[#1C2028] text-white border-[#6B7280] ring-2 ring-gray-400/30 font-bold'
                    : 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-white';
                } else if (st === 'Cancelado') {
                  activeStyle = isSelected
                    ? 'bg-[#221012] text-[#EF4444] border-[#7F1D1D] ring-2 ring-red-700/30 font-bold'
                    : 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-white';
                } else if (st === 'Retornou com defeito') {
                  activeStyle = isSelected
                    ? 'bg-[#38101E] text-[#FB7185] border-[#F43F5E] ring-2 ring-rose-500/30 font-bold'
                    : 'bg-[#101216] text-[#9CA3AF] border-[#22262E] hover:text-white';
                }

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleSituacaoChange(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border text-center flex items-center justify-center gap-1 ${activeStyle}`}
                  >
                    {st === 'Concluído' && <CheckCircle2 className="w-3 h-3 text-[#10B981]" />}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Entrada Automática - Hora exata de criação */}
            <div className="bg-[#101216] border border-[#22262E] rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-semibold text-[#D1D5DB] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Data e Hora de Entrada</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 rounded font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Automático
                  </span>
                </div>
                <div className="font-mono text-sm font-extrabold text-white mt-2 flex items-center gap-2">
                  {isEditing && editingOrder?.entrada ? (
                    <span>{formatDateTime(editingOrder.entrada)}</span>
                  ) : (
                    <span className="tabular-nums">
                      {liveNow.toLocaleDateString('pt-BR')} às {liveNow.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Previsão / Prazo com Ano Fixo no Ano Corrente */}
            <div className="bg-[#101216] border border-[#22262E] rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-semibold text-[#D1D5DB] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Previsão / Prazo de Entrega</span>
                  </label>
                  <div className="flex gap-1 items-center">
                    <button
                      type="button"
                      onClick={() => applyPrazoPreset(1)}
                      className="text-[10px] px-1.5 py-0.5 bg-[#1F242D] text-[#D1D5DB] rounded hover:bg-[#2A313E] hover:text-white cursor-pointer font-medium"
                      title={`Adicionar 24h (Ano ${currentYear})`}
                    >
                      +24h
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPrazoPreset(2)}
                      className="text-[10px] px-1.5 py-0.5 bg-[#1F242D] text-[#D1D5DB] rounded hover:bg-[#2A313E] hover:text-white cursor-pointer font-medium"
                      title={`Adicionar 48h (Ano ${currentYear})`}
                    >
                      +48h
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPrazoPreset(7)}
                      className="text-[10px] px-1.5 py-0.5 bg-[#1F242D] text-[#D1D5DB] rounded hover:bg-[#2A313E] hover:text-white cursor-pointer font-medium"
                      title={`Adicionar 7 dias (Ano ${currentYear})`}
                    >
                      +7d
                    </button>
                    {prazo && (
                      <button
                        type="button"
                        onClick={() => setPrazo('')}
                        className="text-[10px] px-1.5 py-0.5 bg-rose-950/40 text-rose-300 rounded hover:bg-rose-900/60 cursor-pointer font-medium"
                        title="Limpar prazo"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    id="os-prazo"
                    type="datetime-local"
                    min={`${currentYear}-01-01T00:00`}
                    max={`${currentYear}-12-31T23:59`}
                    value={prazo}
                    onChange={(e) => handlePrazoChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#181C23] border border-[#22262E] rounded font-mono text-xs text-white focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                  />
                  <div
                    className="px-2.5 py-2 bg-[#181C23] border border-[#22262E] rounded text-xs font-mono font-bold text-white flex items-center gap-1 shrink-0 select-none"
                    title={`Ano fixado automaticamente em ${currentYear}`}
                  >
                    <span className="text-[#9CA3AF] text-[10px]">ANO:</span>
                    <span className="text-[#E51D24] font-extrabold">{currentYear}</span>
                  </div>
                </div>

                {prazo && (
                  <div className="text-[11px] font-mono text-emerald-400 mt-1.5 flex items-center gap-1">
                    <span>✓ Previsão: {formatDateTime(prazo)}</span>
                    <span className="text-[#9CA3AF] text-[10px]">({currentYear})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETALHES QUANDO CONCLUÍDO (SAÍDA E RETIRADA) */}
          {situacao === 'Concluído' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Dados de Conclusão &amp; Entrega ao Cliente</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11.5px] font-semibold text-emerald-200">
                      Data da Conclusão do Reparo
                    </label>
                    <button
                      type="button"
                      onClick={() => setSaida(isoToDatetimeLocal(new Date().toISOString()))}
                      className="text-[10px] text-emerald-300 hover:underline cursor-pointer"
                    >
                      Agora
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={saida}
                    onChange={(e) => setSaida(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101216] border border-emerald-800/60 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11.5px] font-semibold text-emerald-200">
                      Data de Retirada pelo Cliente
                    </label>
                    <button
                      type="button"
                      onClick={() => setDataRetirada(isoToDatetimeLocal(new Date().toISOString()))}
                      className="text-[10px] text-emerald-300 hover:underline cursor-pointer"
                    >
                      Agora
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={dataRetirada}
                    onChange={(e) => setDataRetirada(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101216] border border-emerald-800/60 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* DETALHES SE A SITUAÇÃO FOR 'Retornou com defeito' (Sem marcação separada) */}
          {situacao === 'Retornou com defeito' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-950/20 border border-rose-800/40 rounded-lg space-y-3"
            >
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Equipamento Retornou com Defeito</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-rose-300 mb-1">
                    Data do Retorno
                  </label>
                  <input
                    type="datetime-local"
                    value={dataRetorno}
                    onChange={(e) => setDataRetorno(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101216] border border-rose-800/60 rounded font-mono text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11.5px] font-bold text-rose-300 mb-1">
                    Motivo do Retorno / Defeito Reincidente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={motivoRetorno}
                    onChange={(e) => setMotivoRetorno(e.target.value)}
                    placeholder="Ex: Voltou a apresentar falha após uso"
                    className="w-full px-3 py-2 bg-[#101216] border border-rose-800/60 rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* SECTION 4: SISTEMA DE VALOR DE SERVIÇO UNIFICADO */}
        <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#22262E] pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <DollarSign className="w-4 h-4 text-[#E51D24]" />
              <span>Valor Total da Ordem de Serviço</span>
            </div>
            <span className="text-xs text-[#9CA3AF]">
              Mão de obra e serviços inclusos no valor total
            </span>
          </div>

          {/* VALOR TOTAL EM DESTAQUE */}
          <div className="bg-[#101216] p-5 rounded-lg border-2 border-[#E51D24]/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="block text-xs uppercase font-bold tracking-wider text-[#D1D5DB]">
                  Valor Total do Serviço (R$) <span className="text-[#E51D24]">*</span>
                </label>
                {sumOfItemValues > 0 && (
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 font-semibold">
                    ✓ Sincronizado com os itens
                  </span>
                )}
              </div>
              {/* Botões rápidos de acréscimo / valores comuns */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#9CA3AF] mr-1">Rápido:</span>
                {[50, 100, 150, 200].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => handleQuickAddValue(add)}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#1F242D] hover:bg-[#2A313E] text-white font-mono font-bold border border-[#374151] cursor-pointer"
                  >
                    +{add}
                  </button>
                ))}
                <span className="text-[#374151] mx-1">|</span>
                {[80, 150, 250, 350].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSetPresetValue(preset)}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#181C23] hover:bg-[#222834] text-[#D1D5DB] font-mono border border-[#2A303C] cursor-pointer"
                  >
                    R${preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setValorTotal('0')}
                  className="text-[11px] px-2 py-0.5 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 cursor-pointer ml-auto"
                >
                  Zerar
                </button>
              </div>
            </div>

            <div className="relative max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-mono font-extrabold text-[#E51D24]">
                R$
              </span>
              <input
                id="os-valor-total"
                type="number"
                step="0.01"
                min="0"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 bg-[#181C23] border border-[#374151] rounded font-mono text-2xl font-extrabold text-white focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: OBSERVAÇÕES GERAIS */}
        <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-5 shadow-md">
          <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
            Observações Gerais da Ordem de Serviço
          </label>
          <textarea
            rows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Acessórios que acompanham o console (cabos, controles extras), estado físico geral..."
            className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#22262E]">
          <button
            type="submit"
            className="px-6 py-3 bg-[#E51D24] hover:bg-[#C81018] text-white font-bold text-sm uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(229,29,36,0.35)] cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Salvar Alterações da O.S.' : 'Criar Ordem de Serviço'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ordens')}
            className="px-4 py-3 bg-transparent hover:bg-white/5 border border-transparent text-[#9CA3AF] hover:text-white rounded text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* MODAL DE CADASTRO RÁPIDO DE CLIENTE (COM CEP E NOME OPCIONAL) */}
      <AnimatePresence>
        {isInlineClientModalOpen && (
          <div
            id="quick-client-backdrop"
            className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsInlineClientModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#14171C] border border-[#22262E] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#E51D24]" />
                  <h3 className="font-bold text-white text-base">Cadastro Rápido de Cliente</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInlineClientModalOpen(false)}
                  className="text-[#9CA3AF] hover:text-white p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#9CA3AF]">
                Preencha os dados do cliente para emissão imediata da O.S. O nome é opcional para agilidade total.
              </p>

              {quickError && (
                <div className="p-2.5 bg-red-900/30 border border-red-700/60 rounded text-xs text-red-200">
                  {quickError}
                </div>
              )}

              <form onSubmit={handleCreateQuickClient} className="space-y-3.5">
                {/* Nome Opcional */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#D1D5DB]">
                      Nome do Cliente <span className="text-[#9CA3AF] font-normal">(Opcional)</span>
                    </label>
                    {!quickNome.trim() && (
                      <span className="text-[10px] text-[#9CA3AF]">
                        Deixe em branco para preenchimento automático
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={quickNome}
                    onChange={(e) => setQuickNome(e.target.value)}
                    placeholder="Ex: CARLA BALIERO (ou deixe em branco)"
                    className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-xs font-medium text-[#D1D5DB]">
                          CPF <span className="text-[#E51D24]">*</span>
                        </label>
                        <span className="text-[9px] bg-[#E51D24]/15 text-[#F87171] border border-[#E51D24]/30 px-1 py-0.5 rounded font-semibold tracking-wide">
                          ID Único
                        </span>
                      </div>
                      {onlyDigits(quickCpf).length === 11 && (
                        <span className="text-[10px] text-[#10B981] font-medium">11 dígitos</span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={14}
                      value={quickCpf}
                      onChange={(e) => setQuickCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded font-mono text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                    />
                    {(() => {
                      const digits = onlyDigits(quickCpf);
                      if (digits.length === 11) {
                        const found = clients.find((c) => onlyDigits(c.cpf) === digits);
                        if (found) {
                          return (
                            <div className="text-[10.5px] text-[#10B981] mt-1 font-medium truncate" title={found.nome}>
                              ✓ Já cadastrado ({found.nome}). Será selecionado.
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                      WhatsApp / Tel <span className="text-[#E51D24]">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={quickTelefone}
                      onChange={(e) => setQuickTelefone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded font-mono text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                    />
                  </div>
                </div>

                {/* CEP e Número da residência no lugar do endereço completo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#D1D5DB] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#E51D24]" />
                        <span>CEP</span>
                      </label>
                      {quickCepLoading && (
                        <span className="text-[10.5px] text-[#9CA3AF] flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-[#E51D24]" />
                          Buscando...
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={9}
                      value={quickCep}
                      onChange={handleQuickCepChange}
                      placeholder="00000-000"
                      className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded font-mono text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                    />
                    {quickCepMsg && (
                      <div className="text-[11px] text-[#10B981] mt-1 font-medium truncate" title={quickCepMsg}>
                        {quickCepMsg}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                      Número da residência
                    </label>
                    <input
                      type="text"
                      value={quickNumero}
                      onChange={(e) => setQuickNumero(e.target.value)}
                      placeholder="Ex: 123 ou S/N"
                      className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#22262E]">
                  <button
                    type="button"
                    onClick={() => setIsInlineClientModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#E51D24] hover:bg-[#C81018] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                  >
                    Salvar e Usar na O.S.
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
