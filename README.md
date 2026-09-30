# N! Games — Sistema de Gerenciamento de Ordens de Serviço

[![Quality & CI](https://github.com/PedroDev-tech01/NGAMESUZANO/actions/workflows/quality.yml/badge.svg)](https://github.com/PedroDev-tech01/NGAMESUZANO/actions/workflows/quality.yml)

Sistema full-stack para gerenciamento de assistência técnica especializada em consoles e eletrônicos, cobrindo o ciclo completo de uma Ordem de Serviço: cadastro do cliente, abertura da O.S., acompanhamento de status, laudo técnico, controle de despesas e emissão de documentos em PDF.

> Projeto desenvolvido com foco em **Orientação a Objetos, Design Patterns, separação de responsabilidades, segurança e persistência relacional**.

### Navegação rápida

[Funcionalidades](#-funcionalidades) • [Tecnologias](#-tecnologias) • [Arquitetura & Patterns](#-arquitetura-e-design-patterns) • [Mapeamento dos requisitos](#-mapeamento-dos-requisitos-do-projeto) • [API](#-api-rest) • [Segurança](#-segurança) • [Testes](#-testes-e-qualidade) • [Como executar](#-como-executar) • [Documentação](#-diagramas-e-documentação)

---

## 🎯 Sobre o projeto

O sistema foi desenvolvido para atender às demandas operacionais da assistência técnica **N! Games**, proporcionando controle de ponta a ponta desde a recepção do equipamento até a entrega ao cliente.

A aplicação centraliza dados de clientes, ordens de serviço, laudos técnicos, histórico de alterações e despesas, mantendo rastreabilidade total das ações realizadas no sistema.

### Objetivo

Fornecer uma solução full-stack organizada, robusta e desacoplada, aplicando conceitos fundamentais de Engenharia de Software e padrões de projeto GoF para separar interface, controladores, regras de negócio e persistência.

---

## ✨ Funcionalidades

- **Gestão de Clientes — CRUD completo:** cadastro com validação de CPF (dígitos verificadores), telefone e endereço.
- **Ordens de Serviço — CRUD completo:** cadastro com mais de 20 atributos de domínio (console, modelo, número de série, estado estético, acessórios, defeito relatado e valores).
- **Numeração Sequencial de O.S.:** geração incremental e atômica para cada nova ordem de serviço.
- **Laudo Técnico Pericial — relacionamento 1:1:** parecer técnico estruturado com diagnóstico e componentes substituídos, com unicidade estrita por O.S.
- **Histórico de Status — relacionamento 1:N:** rastreabilidade cronológica auditada de cada transição de situação.
- **Automação de negócio:** atualização automática de datas de conclusão, retorno com defeito, retirada e prazo de garantia legal (90 dias - CDC).
- **Emissão de PDF:** geração de documento vetorial A4 para impressão de balcão e via do cliente.
- **Integração com WhatsApp:** notificações pré-formatadas prontas para envio com dados da ordem.
- **Controle de Despesas e Manutenção:** registro financeiro de custos de peças e insumos.
- **Autenticação segura:** senhas com hash bcrypt e sessões via JSON Web Token (JWT).

---

## 🧰 Tecnologias

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express, TypeScript, tsx, esbuild |
| **Banco de Dados** | PostgreSQL / Supabase |
| **Segurança** | bcryptjs, JSON Web Token (JWT), Zod, Row Level Security (RLS) |
| **Testes** | Vitest |
| **Build & CI** | Vite 6, esbuild, GitHub Actions |

---

## 🏗 Arquitetura e Design Patterns

O sistema adota uma arquitetura em camadas orientada a objetos, combinando o padrão **Model-View-Controller (MVC)** com padrões táticos GoF e persistência desacoplada.

### Fluxo de execução

```text
React View (SPA)
    ↓
API Service (src/services/api.ts)
    ↓
Express Router + JWT Middleware (requireAuth)
    ↓
Controller (ServiceOrderController / ClientController)
    ↓
Factory Method (ServiceOrderCommandFactory)
    ↓
Command (ICommand: Create, Update, Delete, List...)
    ↓
Builder / Business Service (ServiceOrderBuilder / ServiceOrderBusinessService)
    ↓
DAO (IServiceOrderDAO / IClientDAO)
    ↓
PostgreSQL / Supabase (Persistência com RLS)
```

### Padrões de Projeto e Conceitos OO

- **MVC (Model-View-Controller):**
  - **View:** Interface reativa em React, responsável pela apresentação e captura de eventos.
  - **Controller:** Controladores Express (`ServiceOrderController`, `ClientController`, `TechnicalReportController`) que orquestram requisições e delegam para Commands e DAOs.
  - **Model:** Modelos de domínio estritos e tipados em TypeScript que garantem integridade das regras.
- **DAO (Data Access Object):** Desacopla a regra de negócio do mecanismo de banco. O sistema consome interfaces (`IServiceOrderDAO`, `IClientDAO`, `ITechnicalReportDAO`, `IStatusHistoryDAO`), viabilizando a troca da tecnologia de banco sem alterar regras de domínio.
- **Command:** Cada operação do ciclo de vida da O.S. é isolada em um comando executável que implementa a interface `ICommand` (`CreateServiceOrderCommand`, `UpdateServiceOrderCommand`, `ChangeServiceOrderStatusCommand`, `DeleteServiceOrderCommand`, `GetServiceOrderByIdCommand`, `ListServiceOrdersCommand`).
- **Factory Method (Registry / Command Creators):** A classe `ServiceOrderCommandFactory` resolve comandos via registro de criadores configurado no Composition Root (`createServiceOrderCommandFactory`), respeitando o Princípio Aberto/Fechado (OCP).
- **Builder:** `ServiceOrderBuilder` gerencia a construção passo a passo da entidade `ServiceOrder` (com mais de 20 atributos), aplicando valores padrão e validando invariantes antes da instanciação.
- **Pilares OO:** Contratos bem definidos por interfaces (**Abstração**), propriedades protegidas e mutações controladas (**Encapsulamento**) e tratamento uniforme de comandos pela abstração `ICommand` (**Polimorfismo**).

---

## ⚙️ Automação de negócio

As regras de transição e cálculos estão centralizadas em [`ServiceOrderBusinessService`](./src/services/ServiceOrderBusinessService.ts):

1. **Status `Concluído`:** Preenchimento automático da data e hora de conclusão (`saida`).
2. **Status `Retornou com defeito`:** Registro imediato de `dataRetorno` e obrigatoriedade do motivo da reincidência.
3. **Retirada do equipamento:** Registro de entrega com ativação dos termos de garantia.
4. **Garantia Legal CDC:** Cálculo do prazo legal de 90 dias a partir da retirada pelo cliente.
5. **Auditoria cronológica:** Cada alteração gera um novo registro imutável no histórico da ordem.

---

## 🔗 Relacionamentos do banco

| Relacionamento | Cardinalidade | Implementação |
|---|---:|---|
| Cliente → Ordens de Serviço | **1:N** | `service_orders.cliente_id` (chave estrangeira) |
| Ordem de Serviço → Laudo Técnico | **1:1** | `technical_reports.service_order_id` (com restrição `UNIQUE`) |
| Ordem de Serviço → Histórico de Status | **1:N** | `service_order_status_history.service_order_id` |

O script DDL completo está disponível em [`supabase-schema.sql`](./supabase-schema.sql).

---

## 🎓 Mapeamento dos requisitos do projeto

| Requisito | Onde está implementado |
|---|---|
| **MVC** | Separação entre componentes React (View), rotas/controllers Express (Controller) e modelos TypeScript (Model) |
| **DAO** | Contratos em `src/interfaces/` e implementações em `src/dao/` |
| **Command** | Comandos executáveis implementando `ICommand` em `src/commands/` |
| **Factory Method** | `ServiceOrderCommandFactory` e Composition Root em `src/factories/` |
| **Builder** | `ServiceOrderBuilder` em `src/builders/ServiceOrderBuilder.ts` |
| **CRUD Completo** | Clientes (`ClientController` / `SupabaseClientDAO`) e Ordens (`ServiceOrderController` / Commands) |
| **Automação de negócio** | `ServiceOrderBusinessService` e `ChangeServiceOrderStatusCommand` |
| **Relacionamento 1:N** | Cliente → Ordens e Ordem → Histórico de Status |
| **Relacionamento 1:1** | Ordem de Serviço → Laudo Técnico (`technical_reports.service_order_id UNIQUE`) |
| **Entidade com 10+ atributos** | `ServiceOrder`, modelada com mais de 20 atributos de domínio |
| **Diagrama de Classes** | Diagrama UML Mermaid documentado em [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Diagrama de Sequência** | Diagramas de criação e transição de status em [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Especificação de endpoints** | Tabela REST e payloads em [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) |
| **Segurança** | Autenticação JWT, hash bcryptjs, validação Zod, RLS no PostgreSQL e rotas protegidas |
| **Testes** | Suíte de testes unitários e de integração com Vitest em `tests/` |
| **Versionamento** | Repositório Git com histórico organizado de commits |
| **Integração contínua (CI)** | Pipeline automatizado em `.github/workflows/quality.yml` |

---

## 🌐 API REST

A API disponibiliza endpoints protegidos por autenticação JWT (via header `Authorization: Bearer <token>`):

| Método / Endpoint | Finalidade |
|---|---|
| `POST /api/auth/login` | Autenticação e emissão de token JWT |
| `GET /api/health` | Verificação do status da API e conexão ao banco |
| `/api/clients` | CRUD completo de clientes e consulta por CPF |
| `/api/orders` | CRUD de ordens de serviço (criação, listagem, atualização, exclusão) |
| `PATCH /api/orders/:id/status` | Transição de status com automações de negócio |
| `GET /api/orders/:id/history` | Histórico cronológico auditado da ordem |
| `/api/orders/:id/technical-report` | Emissão e consulta do laudo técnico pericial (1:1) |
| `/api/maintenance-expenses` | Gestão de despesas e peças de manutenção |
| `GET /os/:idOrNum.pdf` | Emissão segura do documento PDF da ordem |

A documentação detalhada de payloads e status codes está em [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

---

## 🔐 Segurança

- **Hash de senhas:** Senhas criptografadas exclusivamente com `bcryptjs` (salt rounds 10).
- **JSON Web Token:** Assinatura com segredo de ambiente e expiração pré-definida.
- **Middleware `requireAuth`:** Barreira em rotas protegidas no Express contra requisições não autenticadas.
- **Row Level Security (RLS):** Tabelas protegidas no banco impedindo acesso público anônimo não autorizado.
- **Controle administrativo:** Operações críticas restritas a credenciais com permissão correspondente.
- **Isolamento de credenciais:** Segredos e chaves nunca versionados, gerenciados via variáveis de ambiente.
- **Proteção contra enumeração:** Emissão de PDFs e relatórios exige token válido.

---

## 🧪 Testes e qualidade

A suíte automatizada utiliza **Vitest** e valida regras de negócio, criptografia e padrões estruturais:

- `Auth.test.ts`: Criptografia bcrypt, geração e validação de tokens JWT e middleware de proteção.
- `ServiceOrderCommandFactory.test.ts`: Registro dinâmico de criadores, resolução de comandos e OCP.
- `CreateServiceOrderCommand.test.ts`: Execução do comando de criação e persistência do histórico inicial.
- `UpdateServiceOrderCommand.test.ts`: Atualização de dados técnicos e validação de existência.
- `ChangeServiceOrderStatusCommand.test.ts`: Automação de datas de conclusão e retorno com defeito.
- `ServiceOrderBuilder.test.ts`: Validação de invariantes, campos obrigatórios e instanciação da entidade.
- `TechnicalReport.test.ts`: Regras de negócio e integridade do laudo 1:1.
- `validation.test.ts`: Validações algorítmicas de CPF, CNPJ, formatos e dados de domínio.

### Executar testes

```bash
npm test
```

### Verificação estática de tipos

```bash
npm run typecheck
```

### Build de produção

```bash
npm run build
```

---

## 🚀 Como executar

### 1. Clone o repositório

```bash
git clone https://github.com/PedroDev-tech01/NGAMESUZANO.git
cd NGAMESUZANO
```

### 2. Instale as dependências com npm

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` preenchendo as credenciais do seu ambiente Supabase e segredos de JWT.

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

### 5. Compilação para produção

```bash
npm run build
npm start
```

---

## 🔑 Variáveis de ambiente

Configuradas através do arquivo `.env` (conforme especificado em [`.env.example`](./.env.example)):

| Variável | Finalidade |
|---|---|
| `PORT` | Porta de execução do servidor Express (padrão: 3000) |
| `FRONTEND_URL` | Origem autorizada para configuração do CORS |
| `SUPABASE_URL` | Endpoint da instância Supabase / PostgreSQL |
| `SUPABASE_ANON_KEY` | Chave pública da instância |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada administrativa utilizada exclusivamente pelo backend |
| `JWT_SECRET` | Chave secreta para assinatura dos tokens JWT |
| `INITIAL_ADMIN_PASSWORD` | Senha para provisionamento inicial da conta administrativa |

> **Atenção:** Arquivos `.env` reais e credenciais privadas jamais devem ser comitados no controle de versão.

---

## ☁️ Deploy

- **Frontend:** Pronto para deploy estático na **Netlify** a partir da pasta `dist/`, com regras de redirecionamento SPA configuradas em `netlify.toml`.
- **Backend API:** Preparado para execução em contêineres Node.js ou serviços de nuvem com `npm run build && npm start`.

---

## 📚 Diagramas e documentação

- 📐 [**Arquitetura, Diagrama de Classes e Diagramas de Sequência**](./ARCHITECTURE.md)
- 📘 [**Documentação completa da API REST**](./API_DOCUMENTATION.md)
- 🗄️ [**Schema DDL PostgreSQL / Supabase**](./supabase-schema.sql)
- 🧪 [**Suíte de testes automatizados**](./tests)
- ⚙️ [**Workflow de Integração Contínua (CI)**](./.github/workflows/quality.yml)

---

## 👨‍💻 Autor

**Pedro Henrique Freire**  
Engenharia de Software

Projeto desenvolvido para a assistência técnica especializada **N! Games**.
