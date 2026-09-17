import React, { useState, useEffect } from 'react';
import { Client, ViewType } from '../types';
import {
  formatCPF,
  formatPhone,
  validateCPF,
  validatePhone,
  onlyDigits,
  formatCEP,
  isValidCEP,
} from '../utils/formatters';
import { fetchAddressByCEP } from '../utils/cepService';
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  FileText,
} from 'lucide-react';

interface ClientFormViewProps {
  editingClient: Client | null;
  clients: Client[];
  onSave: (clientData: Partial<Client>, andGoToOrder?: boolean) => void;
  onNavigate: (view: ViewType) => void;
  onEditClient?: (clientId: string) => void;
}

export const ClientFormView: React.FC<ClientFormViewProps> = ({
  editingClient,
  clients,
  onSave,
  onNavigate,
  onEditClient,
}) => {
  const [cep, setCep] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obs, setObs] = useState('');

  // CEP lookup status
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepLookupMessage, setCepLookupMessage] = useState<string | null>(null);

  // Errors & validation state
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [telefoneError, setTelefoneError] = useState<string | null>(null);
  const [telefoneTouched, setTelefoneTouched] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setCep(editingClient.cep ? formatCEP(editingClient.cep) : '');
      setNome(editingClient.nome || '');
      setCpf(editingClient.cpf || '');
      setTelefone(editingClient.telefone || '');
      setEmail(editingClient.email || '');
      setNascimento(editingClient.nascimento || '');
      setEndereco(editingClient.endereco || '');
      setObs(editingClient.obs || '');
    } else {
      setCep('');
      setNome('');
      setCpf('');
      setTelefone('');
      setEmail('');
      setNascimento('');
      setEndereco('');
      setObs('');
    }
    setCpfError(null);
    setDuplicateClient(null);
    setCpfTouched(false);
    setTelefoneError(null);
    setTelefoneTouched(false);
    setCepLookupMessage(null);
  }, [editingClient]);

  // Handle CEP change and automatic Correios/ViaCEP query
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCep(formatted);
    const digits = onlyDigits(formatted);

    if (digits.length === 8) {
      setIsLoadingCep(true);
      setCepLookupMessage('Buscando endereço nos Correios...');
      const res = await fetchAddressByCEP(digits);
      setIsLoadingCep(false);
      if (res.success && res.address) {
        setEndereco(res.address);
        setCepLookupMessage(`✓ Endereço preenchido: ${res.neighborhood || res.city || ''}`);
      } else {
        setCepLookupMessage(res.error || 'CEP não localizado');
      }
    } else {
      setCepLookupMessage(null);
    }
  };

  // Validation helpers - CPF is the Unique ID
  const checkCpf = (val: string): { isValid: boolean; error?: string; duplicate?: Client } => {
    const res = validateCPF(val);
    if (!res.isValid) return res;

    // Check duplicate: CPF is unique identifier
    const dup = clients.find(
      (c) =>
        onlyDigits(c.cpf) === onlyDigits(val) &&
        (!editingClient || c.id !== editingClient.id)
    );
    if (dup) {
      return {
        isValid: false,
        error: `Já existe um cliente cadastrado com este CPF (${dup.nome}). O CPF é um ID único no sistema.`,
        duplicate: dup,
      };
    }

    return { isValid: true };
  };

  const checkPhone = (val: string): { isValid: boolean; error?: string } => {
    return validatePhone(val);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    const digits = onlyDigits(formatted);
    if (digits.length === 11) {
      const valRes = checkCpf(formatted);
      if (valRes.isValid) {
        setCpfError(null);
        setDuplicateClient(null);
      } else {
        setCpfError(valRes.error || 'CPF inválido');
        setDuplicateClient(valRes.duplicate || null);
      }
    } else if (cpfTouched && digits.length < 11) {
      setCpfError(`CPF incompleto (${digits.length}/11 dígitos)`);
      setDuplicateClient(null);
    } else {
      setCpfError(null);
      setDuplicateClient(null);
    }
  };

  const handleCpfBlur = () => {
    setCpfTouched(true);
    if (!cpf.trim()) {
      setCpfError('Informe o CPF do cliente.');
      setDuplicateClient(null);
      return;
    }
    const valRes = checkCpf(cpf);
    if (valRes.isValid) {
      setCpfError(null);
      setDuplicateClient(null);
    } else {
      setCpfError(valRes.error || 'CPF inválido');
      setDuplicateClient(valRes.duplicate || null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
    const digits = onlyDigits(formatted);
    if (digits.length >= 10) {
      const valRes = checkPhone(formatted);
      setTelefoneError(valRes.isValid ? null : (valRes.error || 'Número de telefone inválido'));
    } else if (telefoneTouched && digits.length < 10) {
      setTelefoneError(`Número incompleto (${digits.length} dígitos de 10 ou 11)`);
    } else {
      setTelefoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    setTelefoneTouched(true);
    if (!telefone.trim()) {
      setTelefoneError('Informe o telefone / WhatsApp.');
      return;
    }
    const valRes = checkPhone(telefone);
    setTelefoneError(valRes.isValid ? null : (valRes.error || 'Número de telefone inválido'));
  };

  const executeSave = (andGoToOrder = false) => {
    setCpfTouched(true);
    setTelefoneTouched(true);
    let hasError = false;

    const cpfRes = checkCpf(cpf);
    if (!cpfRes.isValid) {
      setCpfError(cpfRes.error || 'CPF inválido');
      setDuplicateClient(cpfRes.duplicate || null);
      hasError = true;
    } else {
      setCpfError(null);
      setDuplicateClient(null);
    }

    const phoneRes = checkPhone(telefone);
    if (!phoneRes.isValid) {
      setTelefoneError(phoneRes.error || 'Número de telefone inválido');
      hasError = true;
    } else {
      setTelefoneError(null);
    }

    if (hasError) return;

    // Conforme pedido: "Quando a pessoa for cadastrar, coloque somente o cep nao precisa colocar o nome"
    // Se o técnico não digitar o nome, o sistema cria o cliente automaticamente identificado com segurança
    const cleanNome = nome.trim();
    const finalNome = cleanNome
      ? cleanNome.toUpperCase()
      : `CLIENTE ${cep.trim() ? `(CEP ${cep.trim()})` : `(${formatCPF(cpf.trim())})`}`;

    onSave(
      {
        nome: finalNome,
        cpf: formatCPF(cpf.trim()),
        telefone: formatPhone(telefone.trim()),
        cep: cep.trim() ? formatCEP(cep.trim()) : undefined,
        email: email.trim() || undefined,
        nascimento: nascimento || undefined,
        endereco: endereco.trim() || undefined,
        obs: obs.trim() || undefined,
      },
      andGoToOrder
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave(false);
  };

  const isEditing = !!editingClient;
  const isCpfValid = onlyDigits(cpf).length === 11 && !cpfError;
  const isPhoneValid = onlyDigits(telefone).length >= 10 && !telefoneError;

  return (
    <div id="view-cliente-form" className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
          <h2 id="cliente-form-title" className="text-[22px] font-bold text-white tracking-tight">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
        </div>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Cadastro ágil: basta digitar o <strong>CEP</strong> para buscar o endereço automaticamente. O nome é opcional se desejar agilidade máxima.
        </p>
      </div>

      <div className="bg-[#14171C] border border-[#22262E] rounded-lg p-6 shadow-md">
        <form id="cliente-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Nome do Cliente - Principal no topo */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12.5px] font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#E51D24]" />
                  <span>Nome do Cliente <span className="text-[#9CA3AF] font-normal text-xs">(Opcional para agilidade)</span></span>
                </label>
                {!nome.trim() && (
                  <span className="text-[10.5px] text-[#9CA3AF] italic">
                    Deixe em branco para identificação automática
                  </span>
                )}
              </div>
              <input
                id="cliente-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: CARLA BALIERO (ou deixe em branco)"
                className="w-full px-3.5 py-2.5 bg-[#101216] border border-[#22262E] rounded text-[14px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
              />
            </div>

            {/* 2. CPF (Após o Nome - ID Único) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <label className="block text-[12px] font-medium text-[#D1D5DB]">
                    CPF <span className="text-[#E51D24]">*</span>
                  </label>
                  <span className="text-[10px] bg-[#E51D24]/15 text-[#F87171] border border-[#E51D24]/30 px-1.5 py-0.5 rounded font-semibold tracking-wide">
                    ID Único
                  </span>
                </div>
                {isCpfValid && (
                  <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    CPF válido
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="cliente-cpf"
                  type="text"
                  value={cpf}
                  maxLength={14}
                  onChange={handleCpfChange}
                  onBlur={handleCpfBlur}
                  placeholder="000.000.000-00"
                  className={`w-full px-3 py-2 bg-[#101216] border font-mono rounded text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 ${
                    cpfError
                      ? 'border-[#EF4444] focus:ring-[#EF4444]/20'
                      : isCpfValid
                      ? 'border-[#10B981]/50 focus:border-[#10B981] focus:ring-[#10B981]/20'
                      : 'border-[#22262E] focus:border-[#E51D24] focus:ring-[#E51D24]/20'
                  }`}
                />
                {isCpfValid && (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
              {cpfError && (
                <div id="cliente-cpf-err" className="mt-1.5 space-y-1">
                  <div className="text-[11.5px] text-[#EF4444] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cpfError}</span>
                  </div>
                  {duplicateClient && onEditClient && (
                    <button
                      type="button"
                      onClick={() => onEditClient(duplicateClient.id)}
                      className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] underline font-medium cursor-pointer inline-flex items-center gap-1"
                    >
                      → Abrir cadastro existente de "{duplicateClient.nome}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Telefone / WhatsApp (Após o CPF) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[12px] font-medium text-[#D1D5DB] flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Telefone / WhatsApp <span className="text-[#E51D24]">*</span></span>
                </label>
                {isPhoneValid && (
                  <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Telefone válido
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="cliente-telefone"
                  type="text"
                  value={telefone}
                  maxLength={15}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="(00) 00000-0000"
                  className={`w-full px-3 py-2 bg-[#101216] border font-mono rounded text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 ${
                    telefoneError
                      ? 'border-[#EF4444] focus:ring-[#EF4444]/20'
                      : isPhoneValid
                      ? 'border-[#10B981]/50 focus:border-[#10B981] focus:ring-[#10B981]/20'
                      : 'border-[#22262E] focus:border-[#E51D24] focus:ring-[#E51D24]/20'
                  }`}
                />
                {isPhoneValid && (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
              {telefoneError && (
                <div id="cliente-telefone-err" className="text-[11.5px] text-[#EF4444] mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{telefoneError}</span>
                </div>
              )}
            </div>

            {/* 4. Endereço */}
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-medium text-[#D1D5DB] mb-1">
                Endereço preenchido (ou editável)
              </label>
              <input
                id="cliente-endereco"
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF"
                className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
              />
            </div>

            {/* 5. CEP (Abaixo da parte do endereço) */}
            <div className="sm:col-span-2 bg-[#181C23] p-3.5 rounded-lg border border-[#2A303C]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E51D24]" />
                  <span>CEP (Busca automática pelo CEP)</span>
                </label>
                {isLoadingCep && (
                  <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E51D24]" />
                    Buscando Correios...
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  id="cliente-cep"
                  type="text"
                  value={cep}
                  maxLength={9}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  className="w-full sm:w-56 px-3 py-2 bg-[#101216] border border-[#374151] rounded font-mono text-[13.5px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
                />
                <span className="text-[11px] text-[#9CA3AF]">
                  Ao digitar o CEP com 8 números, a rua, bairro e cidade preenchem o endereço acima automaticamente.
                </span>
              </div>
              {cepLookupMessage && (
                <p className="text-[11.5px] mt-2 font-medium text-[#10B981] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{cepLookupMessage}</span>
                </p>
              )}
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-[12px] font-medium text-[#D1D5DB] mb-1">Data de nascimento</label>
              <input
                id="cliente-nascimento"
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className="w-full px-3 py-2 bg-[#101216] border border-[#22262E] rounded text-[13.5px] text-white focus:outline-none focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#22262E]">
            {/* Botão de Ir direto para a O.S. com o cadastro na tela */}
            <button
              type="button"
              onClick={() => executeSave(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E51D24] hover:bg-[#C81018] text-white text-[13px] font-bold uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(229,29,36,0.35)] cursor-pointer"
              title="Salva o cliente e abre imediatamente a Ordem de Serviço já com ele selecionado"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Salvar e Ir para Ordem de Serviço</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="submit"
              className="px-4 py-2.5 bg-[#1F242D] hover:bg-[#282E3A] border border-[#374151] text-white text-[13px] font-semibold rounded transition-colors cursor-pointer"
            >
              ✓ Salvar Apenas Cliente
            </button>

            <button
              type="button"
              onClick={() => onNavigate('clientes')}
              className="px-4 py-2.5 border border-transparent rounded bg-transparent text-[#9CA3AF] hover:text-white text-[13px] font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
