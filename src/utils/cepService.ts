import { onlyDigits } from './formatters';

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddressByCEP(rawCep: string): Promise<{
  success: boolean;
  address?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  raw?: ViaCepResult;
  error?: string;
}> {
  const digits = onlyDigits(rawCep);
  if (digits.length !== 8) {
    return { success: false, error: 'CEP deve conter 8 dígitos' };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { success: false, error: 'Falha na consulta do CEP' };
    }

    const data: ViaCepResult = await res.json();
    if (data.erro) {
      return { success: false, error: 'CEP não encontrado na base dos Correios' };
    }

    const parts = [
      data.logradouro,
      data.bairro,
      data.localidade ? `${data.localidade} - ${data.uf}` : '',
    ].filter(Boolean);

    return {
      success: true,
      address: parts.join(', '),
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      raw: data,
    };
  } catch (err: any) {
    console.warn('ViaCEP lookup warning:', err);
    return { success: false, error: 'Não foi possível consultar o CEP no momento' };
  }
}
