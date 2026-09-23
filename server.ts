import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CLIENTS, INITIAL_ORDERS } from './src/data/initialData';
import { Client, ServiceOrder, OrderStatus, MaintenanceExpense } from './src/types';
import {
  validateCPF,
  validatePhone,
  formatCPF,
  formatPhone,
  onlyDigits,
  formatCNPJ,
  validateCNPJ,
  formatCurrency,
  formatDateTime,
  getOrderValue,
} from './src/utils/formatters';
import { isSupabaseConfigured } from './src/lib/supabase';
import { buildVectorOrderPdf } from './src/utils/vectorPdf';
import {
  getSupabaseClients,
  insertSupabaseClient,
  updateSupabaseClient,
  deleteSupabaseClient,
  getSupabaseOrders,
  insertSupabaseOrder,
  updateSupabaseOrder,
  deleteSupabaseOrder,
  getSupabaseExpenses,
  insertSupabaseExpense,
  deleteSupabaseExpense,
  getSupabaseNextOrderSeq,
  incrementSupabaseOrderSeq,
  seedSupabaseIfEmpty,
  ensureAuthAccountInDb,
  findAuthAccount,
  setSupabaseCaches,
} from './src/db/supabase-repository';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Interface for local database mirror
interface LocalDatabase {
  clients: Client[];
  orders: ServiceOrder[];
  maintenanceExpenses: MaintenanceExpense[];
  nextOrderSeq: number;
}

let dbData: LocalDatabase = {
  clients: [],
  orders: [],
  maintenanceExpenses: [],
  nextOrderSeq: 150002,
};

function ensureDataDirectory() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadData(): LocalDatabase {
  try {
    ensureDataDirectory();
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        maintenanceExpenses: Array.isArray(parsed.maintenanceExpenses) ? parsed.maintenanceExpenses : [],
        nextOrderSeq: typeof parsed.nextOrderSeq === 'number' ? parsed.nextOrderSeq : 150002,
      };
    }
  } catch (error) {
    console.error('[Storage] Error reading db.json, fallback to defaults:', error);
  }

  const initialData: LocalDatabase = {
    clients: INITIAL_CLIENTS.map((c) => ({ ...c, nome: (c.nome || '').toUpperCase() })),
    orders: INITIAL_ORDERS,
    maintenanceExpenses: [],
    nextOrderSeq: 150002,
  };
  saveData(initialData);
  return initialData;
}

function saveData(data: LocalDatabase) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Storage] Failed to save db.json:', error);
  }
}

// Initialize local data mirror
dbData = loadData();
setSupabaseCaches(dbData.clients, dbData.orders, dbData.maintenanceExpenses, dbData.nextOrderSeq);

// If Supabase is configured, check seeding in background
if (isSupabaseConfigured()) {
  console.log('[Supabase] Configured! Checking table seeding and auth account...');
  ensureAuthAccountInDb().catch((err) => {
    console.warn('[Supabase] Background auth ensure error:', err);
  });
  seedSupabaseIfEmpty(dbData.clients, dbData.orders, dbData.maintenanceExpenses, dbData.nextOrderSeq).catch((err) => {
    console.warn('[Supabase] Background seed error:', err);
  });
} else {
  console.log('[Storage] Supabase not configured yet. Using local storage (/data/db.json).');
}

// Middleware
app.use(express.json());

// Request logging for API routes
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// --- API ROUTES ---

// Health check & Server Status
app.get('/api/health', async (req: Request, res: Response) => {
  const supabaseActive = isSupabaseConfigured();
  let totalClients = dbData.clients.length;
  let totalOrders = dbData.orders.length;
  let nextSeq = dbData.nextOrderSeq;

  if (supabaseActive) {
    try {
      const [sbClients, sbOrders, sbSeq] = await Promise.all([
        getSupabaseClients().catch(() => null),
        getSupabaseOrders().catch(() => null),
        getSupabaseNextOrderSeq().catch(() => null),
      ]);
      if (sbClients) totalClients = sbClients.length;
      if (sbOrders) totalOrders = sbOrders.length;
      if (typeof sbSeq === 'number') nextSeq = sbSeq;
    } catch (e) {
      console.warn('[Supabase] Error polling health stats:', e);
    }
  }

  res.json({
    status: 'ok',
    server: 'N! GAMES Tech Backend',
    engine: supabaseActive ? 'Supabase (PostgreSQL Cloud)' : 'Armazenamento Local JSON (/data/db.json)',
    supabaseConnected: supabaseActive,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      totalClients,
      totalOrders,
      nextOrderSeq: nextSeq,
    },
  });
});

// Authentication endpoints
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { cnpj, senha } = req.body || {};
  const cleanCnpj = onlyDigits(cnpj);

  if (!cleanCnpj || cleanCnpj.length < 14) {
    return res.status(400).json({ error: 'CNPJ incompleto (deve conter 14 dígitos).' });
  }

  const cnpjVal = validateCNPJ(cleanCnpj);
  if (!cnpjVal.isValid) {
    return res.status(400).json({ error: cnpjVal.error || 'CNPJ inválido pelos dígitos verificadores.' });
  }

  const cleanSenha = String(senha || '').trim();
  if (!cleanSenha) {
    return res.status(400).json({ error: 'Informe a senha de acesso.' });
  }

  // Look up authorized account in database
  const account = await findAuthAccount(cleanCnpj);
  if (!account || !account.active) {
    return res.status(401).json({
      error: 'Conta não cadastrada ou não autorizada. Apenas contas registradas no sistema têm permissão de acesso.',
    });
  }

  if (account.senha !== cleanSenha) {
    return res.status(401).json({
      error: 'Senha incorreta para esta conta.',
    });
  }

  const user = {
    cnpj: formatCNPJ(cleanCnpj),
    razaoSocial: account.razaoSocial,
    nomeFantasia: account.nomeFantasia,
    token: 'ngames-auth-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    loggedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    user,
    message: 'Autenticação autorizada com sucesso',
  });
});

app.post('/api/auth/firebase', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Autenticação recebida com sucesso' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sessão encerrada com sucesso' });
});

// Full state bootstrap
app.get('/api/bootstrap', async (req: Request, res: Response) => {
  if (isSupabaseConfigured()) {
    try {
      const [clientsList, ordersList, expensesList, nextSeq] = await Promise.all([
        getSupabaseClients(),
        getSupabaseOrders(),
        getSupabaseExpenses(),
        getSupabaseNextOrderSeq(),
      ]);

      // Keep local mirror updated
      dbData = {
        clients: clientsList,
        orders: ordersList,
        maintenanceExpenses: expensesList,
        nextOrderSeq: nextSeq,
      };
      saveData(dbData);

      return res.json({
        clients: clientsList,
        orders: ordersList,
        maintenanceExpenses: expensesList,
        nextOrderSeq: nextSeq,
        source: 'supabase',
        serverTime: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn('[Supabase] Bootstrap fallback to local mirror due to error:', error.message);
    }
  }

  // Fallback to local
  res.json({
    clients: dbData.clients,
    orders: dbData.orders,
    maintenanceExpenses: dbData.maintenanceExpenses || [],
    nextOrderSeq: dbData.nextOrderSeq,
    source: 'local',
    serverTime: new Date().toISOString(),
  });
});

// --- CLIENTS ENDPOINTS ---
app.get('/api/clients', async (req: Request, res: Response) => {
  if (isSupabaseConfigured()) {
    try {
      const clientsList = await getSupabaseClients();
      return res.json(clientsList);
    } catch (e: any) {
      console.warn('[Supabase] Failed get clients, using local:', e.message);
    }
  }
  res.json(dbData.clients);
});

// Search client directly by CPF
app.get('/api/clients/by-cpf/:cpf', async (req: Request, res: Response) => {
  const clean = onlyDigits(req.params.cpf);
  if (!clean) {
    return res.status(400).json({ error: 'CPF inválido para busca' });
  }

  let list = dbData.clients;
  if (isSupabaseConfigured()) {
    try {
      list = await getSupabaseClients();
    } catch {}
  }

  const client = list.find((c) => c.id === `cpf-${clean}` || onlyDigits(c.cpf) === clean);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado com este CPF' });
  }
  res.json(client);
});

app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const { nome, cpf, telefone, email, nascimento, endereco, cep, obs } = req.body;
    if (!cpf || !telefone) {
      return res.status(400).json({ error: 'CPF e telefone são obrigatórios' });
    }

    const cpfValidation = validateCPF(String(cpf));
    if (!cpfValidation.isValid) {
      return res.status(400).json({ error: cpfValidation.error || 'CPF inválido' });
    }

    const cpfDigits = onlyDigits(String(cpf));
    const canonicalId = `cpf-${cpfDigits}`;

    let currentClients = dbData.clients;
    if (isSupabaseConfigured()) {
      try {
        currentClients = await getSupabaseClients();
      } catch {}
    }

    const duplicate = currentClients.find(
      (c) => c.id === canonicalId || onlyDigits(c.cpf) === cpfDigits
    );
    if (duplicate) {
      return res.status(400).json({
        error: `Já existe um cliente cadastrado com este CPF (${duplicate.nome}). O CPF é um ID único no sistema.`,
        client: duplicate,
      });
    }

    const phoneValidation = validatePhone(String(telefone));
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error || 'Telefone inválido' });
    }

    const cleanNome = (nome || '').trim();
    const finalNome = cleanNome
      ? cleanNome.toUpperCase()
      : `CLIENTE (${formatCPF(String(cpf).trim())})`;

    const newClient: Client = {
      id: canonicalId,
      nome: finalNome,
      cpf: formatCPF(String(cpf).trim()),
      telefone: formatPhone(String(telefone).trim()),
      cep: cep ? String(cep).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      nascimento: nascimento ? String(nascimento).trim() : undefined,
      endereco: endereco ? String(endereco).trim() : undefined,
      obs: obs ? String(obs).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await insertSupabaseClient(newClient);
    }

    // Mirror to local
    dbData.clients.push(newClient);
    saveData(dbData);
    res.status(201).json(newClient);
  } catch (error: any) {
    console.error('Failed to create client:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
  }
});

app.put('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let currentClients = dbData.clients;
    if (isSupabaseConfigured()) {
      try {
        currentClients = await getSupabaseClients();
      } catch {}
    }

    const existing = currentClients.find((c) => c.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    let formattedCpf = existing.cpf;
    if (req.body.cpf && req.body.cpf !== existing.cpf) {
      const cpfValidation = validateCPF(String(req.body.cpf));
      if (!cpfValidation.isValid) {
        return res.status(400).json({ error: cpfValidation.error || 'CPF inválido' });
      }
      const newDigits = onlyDigits(String(req.body.cpf));
      const targetCanonicalId = `cpf-${newDigits}`;
      const duplicate = currentClients.find(
        (c) => c.id !== id && (c.id === targetCanonicalId || onlyDigits(c.cpf) === newDigits)
      );
      if (duplicate) {
        return res.status(400).json({
          error: `Já existe um cliente cadastrado com este CPF (${duplicate.nome}). O CPF é um ID único.`,
        });
      }
      formattedCpf = formatCPF(String(req.body.cpf).trim());
    }

    let formattedPhone = existing.telefone;
    if (req.body.telefone && req.body.telefone !== existing.telefone) {
      const phoneValidation = validatePhone(String(req.body.telefone));
      if (!phoneValidation.isValid) {
        return res.status(400).json({ error: phoneValidation.error || 'Telefone inválido' });
      }
      formattedPhone = formatPhone(String(req.body.telefone).trim());
    }

    const payload: Partial<Client> = {
      ...req.body,
      nome: req.body.nome !== undefined && req.body.nome !== null
        ? (String(req.body.nome).trim() ? String(req.body.nome).trim().toUpperCase() : existing.nome)
        : existing.nome,
      cpf: formattedCpf,
      telefone: formattedPhone,
      cep: req.body.cep !== undefined ? (req.body.cep ? String(req.body.cep).trim() : undefined) : existing.cep,
    };

    let updated = { ...existing, ...payload };
    if (isSupabaseConfigured()) {
      updated = await updateSupabaseClient(id, payload);
    }

    // Mirror to local
    const localIdx = dbData.clients.findIndex((c) => c.id === id);
    if (localIdx !== -1) {
      dbData.clients[localIdx] = updated;
    } else {
      dbData.clients.push(updated);
    }
    saveData(dbData);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update client:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured()) {
      await deleteSupabaseClient(id);
    }
    dbData.clients = dbData.clients.filter((c) => c.id !== id);
    dbData.orders = dbData.orders.filter((o) => o.clienteId !== id);
    saveData(dbData);
    res.json({ success: true, message: 'Cliente excluído com sucesso' });
  } catch (error: any) {
    console.error('Failed to delete client:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir cliente' });
  }
});

// --- ORDERS ENDPOINTS ---
app.get('/api/orders', async (req: Request, res: Response) => {
  if (isSupabaseConfigured()) {
    try {
      const ordersList = await getSupabaseOrders();
      return res.json(ordersList);
    } catch (e: any) {
      console.warn('[Supabase] Failed get orders, using local:', e.message);
    }
  }
  res.json(dbData.orders);
});

app.get('/api/orders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  let currentOrders = dbData.orders;
  if (isSupabaseConfigured()) {
    try {
      currentOrders = await getSupabaseOrders();
    } catch {}
  }
  const order = currentOrders.find((o) => o.id === id || String(o.numero) === id);
  if (!order) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  }
  res.json(order);
});

// Helper to safely escape HTML strings for server-rendered pages
function escapeHtml(str?: any): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function findOrderAndClient(idOrNum: string) {
  const clean = String(idOrNum).replace(/\.pdf$/i, '').trim();
  let currentOrders = dbData.orders;
  if (isSupabaseConfigured()) {
    try {
      currentOrders = await getSupabaseOrders();
    } catch {}
  }
  const order = currentOrders.find((o) => o.id === clean || String(o.numero) === clean);
  if (!order) return { order: null, client: null };

  let currentClients = dbData.clients;
  if (isSupabaseConfigured()) {
    try {
      currentClients = await getSupabaseClients();
    } catch {}
  }
  const client = currentClients.find((c) => c.id === order.clienteId) || null;
  return { order, client };
}

// Stream direct vector PDF for order viewing or download (/os/:idOrNum, /os/:idOrNum.pdf, or /api/orders/:id/pdf)
app.get(['/os/:idOrNum', '/os/:idOrNum.pdf', '/api/orders/:id/pdf'], async (req: Request, res: Response) => {
  try {
    const idOrNum = req.params.idOrNum || req.params.id;
    const { order, client } = await findOrderAndClient(idOrNum);
    if (!order) {
      return res.status(404).send('Ordem de serviço não encontrada');
    }

    const doc = buildVectorOrderPdf(order, client);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const safeFilename = `OS-${order.numero}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[PDF Server] Erro ao gerar PDF:', err);
    res.status(500).send('Erro ao processar PDF da Ordem de Serviço');
  }
});

// Friendly redirect for short order links: /ordem/:id -> /os/:id.pdf
app.get('/ordem/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.redirect(`/os/${encodeURIComponent(id)}.pdf`);
});

app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const {
      clienteId,
      situacao,
      canal,
      entrada,
      prazo,
      saida,
      dataRetirada,
      dataRetorno,
      motivoRetorno,
      equipamento,
      marca,
      modelo,
      serie,
      defeito,
      solucao,
      itens,
      valor,
      maoObra,
      pecas,
      desconto,
      obs,
    } = req.body;

    if (!clienteId || (!equipamento && (!itens || itens.length === 0))) {
      return res.status(400).json({ error: 'Cliente e Equipamento são campos obrigatórios' });
    }

    let orderNum = dbData.nextOrderSeq;
    if (isSupabaseConfigured()) {
      try {
        orderNum = await incrementSupabaseOrderSeq();
      } catch {
        orderNum = dbData.nextOrderSeq;
        dbData.nextOrderSeq += 1;
      }
    } else {
      dbData.nextOrderSeq += 1;
    }

    const primaryEquip = equipamento
      ? String(equipamento).trim()
      : (itens && itens[0]?.equipamento ? String(itens[0].equipamento).trim() : 'Equipamento');

    const newOrder: ServiceOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      numero: orderNum,
      clienteId,
      situacao: situacao || 'Em aberto',
      canal: canal || 'Presencial',
      entrada: entrada || new Date().toISOString(),
      prazo: prazo ? String(prazo).trim() : undefined,
      saida: saida || undefined,
      dataRetirada: dataRetirada
        ? String(dataRetirada).trim()
        : (situacao === 'Concluído' && req.body.marcarRetirada ? new Date().toISOString() : undefined),
      dataRetorno: dataRetorno
        ? String(dataRetorno).trim()
        : (situacao === 'Retornou com defeito' ? (req.body.retornoAt || new Date().toISOString()) : undefined),
      motivoRetorno: motivoRetorno ? String(motivoRetorno).trim() : undefined,
      equipamento: primaryEquip,
      marca: marca ? String(marca).trim() : undefined,
      modelo: modelo ? String(modelo).trim() : undefined,
      serie: serie ? String(serie).trim() : undefined,
      defeito: defeito ? String(defeito).trim() : undefined,
      solucao: solucao ? String(solucao).trim() : undefined,
      itens: Array.isArray(itens) ? itens : undefined,
      valor: typeof valor === 'number' ? valor : (Number(valor) || 0),
      maoObra: maoObra !== undefined ? Number(maoObra) : undefined,
      pecas: pecas !== undefined ? Number(pecas) : undefined,
      desconto: desconto !== undefined ? Number(desconto) : undefined,
      obs: obs ? String(obs).trim() : undefined,
      retornoAt: situacao === 'Retornou com defeito' ? (req.body.retornoAt || dataRetorno || new Date().toISOString()) : undefined,
      createdAt: new Date().toISOString(),
      historicoStatus: req.body.historicoStatus || [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          de: 'Criada',
          para: situacao || 'Em aberto',
          data: entrada || new Date().toISOString(),
          observacao: 'Abertura da Ordem de Serviço',
        },
      ],
    };

    if (isSupabaseConfigured()) {
      await insertSupabaseOrder(newOrder);
    }

    dbData.orders.unshift(newOrder);
    saveData(dbData);
    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar ordem de serviço' });
  }
});

app.put('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let currentOrders = dbData.orders;
    if (isSupabaseConfigured()) {
      try {
        currentOrders = await getSupabaseOrders();
      } catch {}
    }

    const existing = currentOrders.find((o) => o.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const payload: Partial<ServiceOrder> = {
      ...req.body,
      valor: req.body.valor !== undefined ? Number(req.body.valor) : existing.valor,
      maoObra: req.body.maoObra !== undefined ? Number(req.body.maoObra) : existing.maoObra,
      pecas: req.body.pecas !== undefined ? Number(req.body.pecas) : existing.pecas,
      desconto: req.body.desconto !== undefined ? Number(req.body.desconto) : existing.desconto,
      prazo: req.body.prazo !== undefined ? (req.body.prazo ? String(req.body.prazo).trim() : undefined) : existing.prazo,
      saida: req.body.saida !== undefined ? (req.body.saida ? String(req.body.saida).trim() : undefined) : existing.saida,
      dataRetirada: req.body.dataRetirada !== undefined ? (req.body.dataRetirada ? String(req.body.dataRetirada).trim() : undefined) : existing.dataRetirada,
      dataRetorno: req.body.dataRetorno !== undefined ? (req.body.dataRetorno ? String(req.body.dataRetorno).trim() : undefined) : existing.dataRetorno,
      motivoRetorno: req.body.motivoRetorno !== undefined ? (req.body.motivoRetorno ? String(req.body.motivoRetorno).trim() : undefined) : existing.motivoRetorno,
      retornoAt: req.body.situacao === 'Retornou com defeito' ? (req.body.retornoAt || existing.retornoAt || new Date().toISOString()) : existing.retornoAt,
      itens: req.body.itens !== undefined ? req.body.itens : existing.itens,
    };

    // Registrar histórico de status se houve mudança de situação
    if (req.body.situacao && req.body.situacao !== existing.situacao) {
      const newEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        de: existing.situacao,
        para: req.body.situacao,
        data: new Date().toISOString(),
        observacao: req.body.motivoRetorno || (req.body.situacao === 'Concluído' ? 'Serviço concluído' : undefined),
      };
      payload.historicoStatus = [
        ...(Array.isArray(existing.historicoStatus) && existing.historicoStatus.length > 0
          ? existing.historicoStatus
          : [
              {
                id: `init-${existing.id}`,
                de: 'Criada',
                para: existing.situacao,
                data: existing.entrada || existing.createdAt || new Date().toISOString(),
                observacao: 'Abertura da O.S.',
              },
            ]),
        newEntry,
      ];
    } else if (req.body.historicoStatus !== undefined) {
      payload.historicoStatus = req.body.historicoStatus;
    }

    // Integridade do histórico: se a O.S. já estiver com status 'Concluído',
    // desabilita/bloqueia a alteração de campos principais (equipamento, cliente, data de entrada)
    if (existing.situacao === 'Concluído') {
      payload.clienteId = existing.clienteId;
      payload.entrada = existing.entrada;
      payload.equipamento = existing.equipamento;
      payload.marca = existing.marca;
      payload.modelo = existing.modelo;
      payload.serie = existing.serie;
      if (Array.isArray(existing.itens) && existing.itens.length > 0) {
        payload.itens = existing.itens;
      }
    }

    let updated = { ...existing, ...payload };
    if (isSupabaseConfigured()) {
      updated = await updateSupabaseOrder(id, payload);
    }

    const localIdx = dbData.orders.findIndex((o) => o.id === id);
    if (localIdx !== -1) {
      dbData.orders[localIdx] = updated;
    } else {
      dbData.orders.unshift(updated);
    }
    saveData(dbData);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update order:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar ordem de serviço' });
  }
});

app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { situacao } = req.body;
    if (!situacao) {
      return res.status(400).json({ error: 'Campo situacao é obrigatório' });
    }

    let currentOrders = dbData.orders;
    if (isSupabaseConfigured()) {
      try {
        currentOrders = await getSupabaseOrders();
      } catch {}
    }

    const existing = currentOrders.find((o) => o.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const willBeFinished = situacao === 'Concluído' && !existing.saida;
    const isReopening = (situacao === 'Retornou com defeito' || situacao === 'Em aberto' || situacao === 'Em andamento');
    const isRetorno = situacao === 'Retornou com defeito';
    const nowIso = new Date().toISOString();

    const newHistoryEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      de: existing.situacao,
      para: situacao as OrderStatus,
      data: nowIso,
      observacao: situacao === 'Concluído' ? 'Serviço concluído' : undefined,
    };

    const updatedHistory = req.body.historicoStatus || [
      ...(Array.isArray(existing.historicoStatus) && existing.historicoStatus.length > 0
        ? existing.historicoStatus
        : [
            {
              id: `init-${existing.id}`,
              de: 'Criada',
              para: existing.situacao,
              data: existing.entrada || existing.createdAt || nowIso,
              observacao: 'Abertura da O.S.',
            },
          ]),
      newHistoryEntry,
    ];

    const patchPayload: Partial<ServiceOrder> = {
      situacao: situacao as OrderStatus,
      saida: willBeFinished ? nowIso : (isReopening ? undefined : existing.saida),
      retornoAt: isRetorno
        ? (req.body.retornoAt || existing.retornoAt || nowIso)
        : existing.retornoAt,
      historicoStatus: updatedHistory,
    };

    let updated = { ...existing, ...patchPayload };
    if (isSupabaseConfigured()) {
      updated = await updateSupabaseOrder(id, patchPayload);
    }

    const localIdx = dbData.orders.findIndex((o) => o.id === id);
    if (localIdx !== -1) {
      dbData.orders[localIdx] = updated;
    }
    saveData(dbData);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to patch order status:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar status da ordem' });
  }
});

app.patch('/api/orders/:id/prazo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prazo } = req.body;
    const patchPayload = { prazo: prazo ? String(prazo).trim() : undefined };

    let updated: any = null;
    if (isSupabaseConfigured()) {
      updated = await updateSupabaseOrder(id, patchPayload);
    }
    const idx = dbData.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      dbData.orders[idx].prazo = patchPayload.prazo;
      if (!updated) updated = dbData.orders[idx];
    }
    saveData(dbData);
    res.json(updated || { id, ...patchPayload });
  } catch (error: any) {
    console.error('Failed to patch prazo:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar prazo' });
  }
});

app.patch('/api/orders/:id/retirada', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dataRetirada } = req.body;
    const patchPayload = { dataRetirada: dataRetirada ? String(dataRetirada).trim() : new Date().toISOString() };

    let updated: any = null;
    if (isSupabaseConfigured()) {
      updated = await updateSupabaseOrder(id, patchPayload);
    }
    const idx = dbData.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      dbData.orders[idx].dataRetirada = patchPayload.dataRetirada;
      if (!updated) updated = dbData.orders[idx];
    }
    saveData(dbData);
    res.json(updated || { id, ...patchPayload });
  } catch (error: any) {
    console.error('Failed to patch retirada:', error);
    res.status(500).json({ error: error.message || 'Erro ao registrar retirada' });
  }
});

app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured()) {
      await deleteSupabaseOrder(id);
    }
    dbData.orders = dbData.orders.filter((o) => o.id !== id);
    saveData(dbData);
    res.json({ success: true, message: 'Ordem excluída com sucesso' });
  } catch (error: any) {
    console.error('Failed to delete order:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir ordem de serviço' });
  }
});

// --- MAINTENANCE EXPENSES ---
app.get('/api/maintenance-expenses', async (req: Request, res: Response) => {
  if (isSupabaseConfigured()) {
    try {
      const expenses = await getSupabaseExpenses();
      return res.json(expenses);
    } catch (e: any) {
      console.warn('[Supabase] Failed get expenses, using local:', e.message);
    }
  }
  res.json(dbData.maintenanceExpenses || []);
});

app.post('/api/maintenance-expenses', async (req: Request, res: Response) => {
  try {
    const { mes, descricao, categoria, valor, data } = req.body;
    if (!mes || !descricao || valor === undefined) {
      return res.status(400).json({ error: 'Mês, descrição e valor são obrigatórios' });
    }

    const newExpense: MaintenanceExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mes: String(mes).trim(),
      descricao: String(descricao).trim(),
      categoria: categoria || 'Peças & Componentes',
      valor: Number(valor) || 0,
      data: data || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await insertSupabaseExpense(newExpense);
    }

    if (!dbData.maintenanceExpenses) dbData.maintenanceExpenses = [];
    dbData.maintenanceExpenses.unshift(newExpense);
    saveData(dbData);
    res.status(201).json(newExpense);
  } catch (error: any) {
    console.error('Failed to create expense:', error);
    res.status(500).json({ error: error.message || 'Erro ao registrar despesa' });
  }
});

app.delete('/api/maintenance-expenses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured()) {
      await deleteSupabaseExpense(id);
    }
    if (dbData.maintenanceExpenses) {
      dbData.maintenanceExpenses = dbData.maintenanceExpenses.filter((e) => e.id !== id);
      saveData(dbData);
    }
    res.json({ success: true, message: 'Custo de manutenção excluído com sucesso' });
  } catch (error: any) {
    console.error('Failed to delete expense:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir despesa' });
  }
});

// Reset endpoint
app.post('/api/reset', async (req: Request, res: Response) => {
  try {
    dbData = {
      clients: INITIAL_CLIENTS.map((c) => ({ ...c, nome: (c.nome || '').toUpperCase() })),
      orders: INITIAL_ORDERS,
      maintenanceExpenses: [],
      nextOrderSeq: 150002,
    };
    saveData(dbData);

    if (isSupabaseConfigured()) {
      await seedSupabaseIfEmpty(dbData.clients, dbData.orders, dbData.maintenanceExpenses, 150002);
    }

    res.json({ success: true, message: 'Dados sincronizados com sucesso' });
  } catch (error: any) {
    console.error('Failed to reset:', error);
    res.status(500).json({ error: 'Falha ao restaurar dados' });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[N! GAMES] Server running on http://0.0.0.0:${PORT} (Supabase Ready)`);
  });
}

startServer();
