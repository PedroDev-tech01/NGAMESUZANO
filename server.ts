import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

import { INITIAL_CLIENTS, INITIAL_ORDERS } from './src/data/initialData';
import { Client, ServiceOrder, MaintenanceExpense, TechnicalReport } from './src/types';

// Domain Architecture (MVC + DAO + Command + Factory + Builder)
import { SupabaseClientDAO } from './src/dao/SupabaseClientDAO';
import { SupabaseServiceOrderDAO } from './src/dao/SupabaseServiceOrderDAO';
import { SupabaseStatusHistoryDAO } from './src/dao/SupabaseStatusHistoryDAO';
import { SupabaseTechnicalReportDAO } from './src/dao/SupabaseTechnicalReportDAO';
import { createServiceOrderCommandFactory } from './src/factories/createServiceOrderCommandFactory';
import { ServiceOrderController } from './src/controllers/ServiceOrderController';
import { ClientController } from './src/controllers/ClientController';
import { TechnicalReportController } from './src/controllers/TechnicalReportController';

// Middleware & Security
import { requireAuth, signToken, AuthRequest } from './src/middleware/auth';
import { validateBody } from './src/middleware/validate';
import {
  LoginSchema,
  CreateClientSchema,
  UpdateClientSchema,
  CreateServiceOrderSchema,
  UpdateServiceOrderSchema,
  ChangeStatusSchema,
  TechnicalReportSchema,
} from './src/validators/schemas';

import {
  validateCNPJ,
  formatCNPJ,
  onlyDigits,
} from './src/utils/formatters';
import { isSupabaseConfigured } from './src/lib/supabase';
import { buildVectorOrderPdf } from './src/utils/vectorPdf';
import {
  getSupabaseExpenses,
  insertSupabaseExpense,
  deleteSupabaseExpense,
  seedSupabaseIfEmpty,
  findAuthAccount,
  setSupabaseCaches,
} from './src/db/supabase-repository';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_SERVERLESS =
  process.env.NETLIFY_FUNCTION === 'true' ||
  process.env.NETLIFY === 'true' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = IS_SERVERLESS
  ? path.join('/tmp', 'ngames-db.json')
  : path.join(process.cwd(), 'data', 'db.json');

// Interface for local database mirror
interface LocalDatabase {
  clients: Client[];
  orders: ServiceOrder[];
  maintenanceExpenses: MaintenanceExpense[];
  technicalReports?: TechnicalReport[];
  nextOrderSeq: number;
}

let dbData: LocalDatabase = {
  clients: [],
  orders: [],
  maintenanceExpenses: [],
  technicalReports: [],
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

// Instantiações Oficiais das Camadas DAO (Acesso a dados)
const clientDAO = new SupabaseClientDAO(dbData.clients);
const statusHistoryDAO = new SupabaseStatusHistoryDAO();
const technicalReportDAO = new SupabaseTechnicalReportDAO();
const orderDAO = new SupabaseServiceOrderDAO(dbData.orders, dbData.nextOrderSeq);

// Instantiações dos Controllers e Factory (MVC + GoF Design Patterns)
const serviceOrderCommandFactory = createServiceOrderCommandFactory({
  orderDAO,
  statusHistoryDAO,
  technicalReportDAO,
});
const serviceOrderController = new ServiceOrderController(serviceOrderCommandFactory);
const clientController = new ClientController(clientDAO);
const technicalReportController = new TechnicalReportController(technicalReportDAO);

// Inicializar dados no Supabase, quando configurado.
// A autenticação administrativa é independente da tabela auth_accounts.
if (isSupabaseConfigured()) {
  console.log('[Supabase] Configurado. Inicializando sincronização...');
  seedSupabaseIfEmpty(dbData.clients, dbData.orders, dbData.maintenanceExpenses, dbData.nextOrderSeq).catch((err) => {
    console.warn('[Supabase] Aviso ao verificar dados iniciais:', err);
  });
}

// Middlewares Globais
app.use(express.json());

// CORS Policy Middleware
app.use((req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  const origin = req.headers.origin;

  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    if (origin === process.env.FRONTEND_URL) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Normaliza o caminho recebido pela Netlify Function. Dependendo do rewrite,
// o serverless-http pode receber /auth/login, /api/auth/login ou o prefixo
// /.netlify/functions/api. As rotas internas do Express continuam em /api.
app.use((req, _res, next) => {
  if (!IS_SERVERLESS) return next();

  const functionPrefix = '/.netlify/functions/api';
  if (req.url.startsWith(functionPrefix)) {
    req.url = req.url.slice(functionPrefix.length) || '/';
  }

  if (
    !req.url.startsWith('/api') &&
    !req.url.startsWith('/os/') &&
    !req.url.startsWith('/ordem/')
  ) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  next();
});

// Request logging for API routes
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ==============================================================================
// 1. ROTAS PÚBLICAS
// ==============================================================================

// Health Check Oficial
app.get('/api/health', async (req: Request, res: Response) => {
  const supabaseActive = isSupabaseConfigured();
  res.json({
    status: 'ok',
    database: supabaseActive ? 'connected' : 'connected_local',
    server: 'N! GAMES Tech Backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Autenticação Segura com Bcrypt e JWT
app.post('/api/auth/login', validateBody(LoginSchema), async (req: Request, res: Response) => {
  if (!process.env.INITIAL_ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'Configuração de autenticação ausente no servidor. Verifique INITIAL_ADMIN_PASSWORD e JWT_SECRET.',
    });
  }

  const { cnpj, senha } = req.body;
  const cleanCnpj = onlyDigits(cnpj);

  const cnpjVal = validateCNPJ(cleanCnpj);
  if (!cnpjVal.isValid) {
    return res.status(400).json({ error: cnpjVal.error || 'CNPJ inválido pelos dígitos verificadores.' });
  }

  const account = await findAuthAccount(cleanCnpj);
  if (!account || !account.active) {
    return res.status(401).json({
      error: 'Conta não cadastrada ou não autorizada. Apenas contas registradas têm permissão de acesso.',
    });
  }

  // Validação estrita de credenciais com bcrypt (apenas hashes válidos)
  const isBcryptHash =
    account.senha.startsWith('$2a$') ||
    account.senha.startsWith('$2b$') ||
    account.senha.startsWith('$2y$');

  if (!isBcryptHash) {
    return res.status(500).json({
      error: 'Credencial armazenada em formato inválido.',
    });
  }

  const isPasswordValid = await bcrypt.compare(senha, account.senha);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Senha incorreta para esta conta.' });
  }

  const token = signToken({
    cnpj: formatCNPJ(cleanCnpj),
    nomeFantasia: account.nomeFantasia,
    razaoSocial: account.razaoSocial,
    role: account.role || 'admin',
  });

  const user = {
    cnpj: formatCNPJ(cleanCnpj),
    razaoSocial: account.razaoSocial,
    nomeFantasia: account.nomeFantasia,
    token,
    loggedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    token,
    user,
    message: 'Autenticação autorizada com sucesso',
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sessão encerrada com sucesso' });
});

// Stream de PDF Oficial da Ordem de Serviço (Público para download / envio ao cliente)
async function findOrderAndClient(idOrNum: string) {
  const clean = String(idOrNum).replace(/\.pdf$/i, '').trim();
  const order = await orderDAO.findById(clean);
  if (!order) return { order: null, client: null };
  const client = await clientDAO.findById(order.clienteId);
  return { order, client };
}

app.get(['/os/:idOrNum', '/os/:idOrNum.pdf', '/api/orders/:id/pdf'], requireAuth, async (req: AuthRequest, res: Response) => {
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

app.get('/ordem/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const tokenQuery = req.query.token ? `?token=${encodeURIComponent(String(req.query.token))}` : '';
  res.redirect(`/os/${encodeURIComponent(id)}.pdf${tokenQuery}`);
});

// ==============================================================================
// 2. ROTAS PROTEGIDAS (Exigem requireAuth com JWT válido)
// ==============================================================================

// Estado completo inicial (Bootstrap autenticado)
app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [clientsList, ordersList, expensesList] = await Promise.all([
      clientDAO.findAll(),
      orderDAO.findAll(),
      isSupabaseConfigured() ? getSupabaseExpenses().catch(() => dbData.maintenanceExpenses) : Promise.resolve(dbData.maintenanceExpenses),
    ]);

    const nextSeq = Math.max(...ordersList.map((o) => o.numero), 150001) + 1;

    res.json({
      clients: clientsList,
      orders: ordersList,
      maintenanceExpenses: expensesList || [],
      nextOrderSeq: nextSeq,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao carregar dados' });
  }
});

// ------------------------------------------------------------------------------
// CRUD DE CLIENTES (Via ClientController + ClientDAO)
// ------------------------------------------------------------------------------
app.get('/api/clients', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clients = await clientController.listClients();
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

app.get('/api/clients/by-cpf/:cpf', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cpf } = req.params;
    const client = await clientController.getClientByCpf(cpf);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado com este CPF' });
    }
    res.json(client);
  } catch (err) {
    next(err);
  }
});

app.get('/api/clients/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const client = await clientController.getClientById(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (err) {
    next(err);
  }
});

app.post('/api/clients', requireAuth, validateBody(CreateClientSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created = await clientController.createClient(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    if (err.message && err.message.includes('Conflito')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

app.put('/api/clients/:id', requireAuth, validateBody(UpdateClientSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await clientController.updateClient(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/clients/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const success = await clientController.deleteClient(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json({ success: true, message: 'Cliente excluído com sucesso' });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------------------
// GESTÃO DE ORDENS DE SERVIÇO (Via ServiceOrderController + Factory + Command + Builder + DAO)
// ------------------------------------------------------------------------------
app.get('/api/orders', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await serviceOrderController.listOrders(req.query as any);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await serviceOrderController.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', requireAuth, validateBody(CreateServiceOrderSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created = await serviceOrderController.createOrder(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/orders/:id', requireAuth, validateBody(UpdateServiceOrderSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await serviceOrderController.updateOrder({
      id: req.params.id,
      ...req.body,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/orders/:id/status', requireAuth, validateBody(ChangeStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const newStatus = req.body.situacao || req.body.newStatus;
    const updated = await serviceOrderController.changeStatus({
      orderId: req.params.id,
      newStatus,
      observacao: req.body.observacao,
      usuario: req.body.usuario || req.user?.nomeFantasia || 'Técnico Especialista',
      customDate: req.body.saida || req.body.dataRetorno || req.body.dataRetirada,
      motivoRetorno: req.body.motivoRetorno,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/orders/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const success = await serviceOrderController.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada para exclusão' });
    }
    res.json({ success: true, message: 'Ordem de serviço excluída com sucesso' });
  } catch (err) {
    next(err);
  }
});

// Histórico de Status Oficial (Relacionamento 1:N)
app.get('/api/orders/:id/history', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const history = await statusHistoryDAO.findByOrderId(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------------------
// LAUDOS TÉCNICOS PERICIAIS (Relacionamento 1:1 Estrito com validação de unicidade)
// ------------------------------------------------------------------------------
app.get('/api/orders/:id/technical-report', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await technicalReportController.getReportByOrderId(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Laudo técnico não encontrado para esta ordem de serviço' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders/:id/technical-report', requireAuth, validateBody(TechnicalReportSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created = await technicalReportController.createReport({
      serviceOrderId: req.params.id,
      ...req.body,
    });
    res.status(201).json(created);
  } catch (err: any) {
    if (err.message && (err.message.includes('1:1') || err.message.includes('violada') || err.message.includes('já possui'))) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

app.put('/api/orders/:id/technical-report', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await technicalReportController.updateReport(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/orders/:id/technical-report', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const success = await technicalReportController.deleteReport(req.params.id);
    res.json({ success, message: 'Laudo técnico removido com sucesso' });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------------------
// DESPESAS DE MANUTENÇÃO (Custos e peças)
// ------------------------------------------------------------------------------
app.get('/api/maintenance-expenses', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isSupabaseConfigured()) {
      const expenses = await getSupabaseExpenses();
      return res.json(expenses);
    }
    res.json(dbData.maintenanceExpenses || []);
  } catch (err) {
    next(err);
  }
});

app.post('/api/maintenance-expenses', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
  } catch (err) {
    next(err);
  }
});

app.delete('/api/maintenance-expenses/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
  } catch (err) {
    next(err);
  }
});

// Sincronização / Reset de dados padrão (Exclusivo Administradores)
app.post('/api/reset', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso restrito a administradores.',
    });
  }
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

    res.json({ success: true, message: 'Registros restaurados com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: 'Falha ao restaurar dados' });
  }
});

// ==============================================================================
// 3. MIDDLEWARE DE TRATAMENTO GLOBAL DE ERROS (Padronização de status HTTP)
// ==============================================================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor';

  // Não vazar stack trace em produção
  const response: any = { error: message };
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

// ==============================================================================
// 4. VITE MIDDLEWARES / STATIC SERVING & INICIALIZAÇÃO
// ==============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
    console.log(`[N! GAMES] Servidor backend ativo em http://0.0.0.0:${PORT}`);
  });
}

// Em Netlify Functions o Express é invocado pelo handler serverless e não abre porta.
if (process.env.NODE_ENV !== 'test' && !IS_SERVERLESS) {
  startServer();
}

export { app };
