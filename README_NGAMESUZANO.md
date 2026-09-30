# N! Games — Sistema de Gerenciamento de Ordens de Serviço

[![Quality & CI](https://github.com/PedroDev-tech01/NGAMESUZANO/actions/workflows/quality.yml/badge.svg)](https://github.com/PedroDev-tech01/NGAMESUZANO/actions/workflows/quality.yml)

Sistema full-stack para gerenciamento de assistência técnica especializada em consoles e eletrônicos, cobrindo o ciclo completo de uma Ordem de Serviço: cadastro do cliente, abertura da O.S., acompanhamento de status, laudo técnico, controle de despesas e emissão de documentos em PDF.

> Projeto desenvolvido com foco em **Orientação a Objetos, Design Patterns, separação de responsabilidades, segurança e persistência relacional**.

### Navegação rápida

[Funcionalidades](#-funcionalidades) • [Arquitetura](#-arquitetura) • [Design Patterns](#-design-patterns) • [Requisitos acadêmicos](#-requisitos-acadêmicos-atendidos) • [API](#-api-rest) • [Segurança](#-segurança) • [Testes](#-testes-e-qualidade) • [Como executar](#-como-executar) • [Diagramas](#-diagramas-e-documentação)

---

## 🎯 Sobre o projeto

O sistema foi desenvolvido para atender às demandas operacionais da assistência técnica **N! Games**, proporcionando controle desde a recepção do equipamento até sua entrega ao cliente.

A aplicação centraliza dados de clientes, ordens de serviço, laudos técnicos, histórico de alterações e despesas, mantendo rastreabilidade das principais ações realizadas no sistema.

### Objetivo

Fornecer uma solução full-stack organizada e desacoplada, aplicando conceitos estudados em Engenharia de Software e utilizando padrões de projeto para separar interface, controladores, regras de negócio e persistência.

---

## ✨ Funcionalidades

- **Gestão de Clientes — CRUD completo:** cadastro, consulta, atualização e exclusão, com validação de CPF, telefone e endereço.
- **Ordens de Serviço — CRUD completo:** cadastro detalhado com mais de 20 atributos de domínio.
- **Numeração Sequencial de O.S.:** geração incremental e persistida do número de cada nova ordem de serviço.
- **Laudo Técnico Pericial — relacionamento 1:1:** cada O.S. pode possuir no máximo um laudo técnico.
- **Histórico de Status — relacionamento 1:N:** cada mudança de situação gera rastreabilidade cronológica.
- **Automação de negócio:** atualização automática de datas, retorno com defeito, retirada e garantia.
- **Emissão de PDF:** geração de documento vetorial para impressão e atendimento ao cliente.
- **Integração com WhatsApp:** preparação de mensagens com informações da ordem.
- **Controle de Despesas e Manutenção:** registro de custos de peças, insumos e manutenção.
- **Autenticação segura:** senhas com bcrypt e autenticação via JWT no backend.

---

## 🧰 Tecnologias

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express, TypeScript, tsx, esbuild |
| **Banco de Dados** | PostgreSQL / Supabase |
| **Segurança** | bcryptjs, JSON Web Token, Zod, Row Level Security |
| **Testes** | Vitest |
| **Build** | Vite 6, esbuild |
| **CI** | GitHub Actions |

---

## 🏗 Arquitetura

O sistema utiliza **Model-View-Controller (MVC)** em conjunto com camadas de domínio, Commands, Factory e DAOs.

### Fluxo principal

```text
React View
    ↓
API Service (api.ts)
    ↓
Express Router + JWT Middleware
    ↓
Controller
    ↓
Factory Method
    ↓
Command
    ↓
Builder / Business Service
    ↓
DAO
    ↓
PostgreSQL / Supabase
```

### MVC

- **Model:** modelos de domínio e tipos TypeScript responsáveis pela representação e integridade dos dados.
- **View:** componentes React responsáveis pela interface e interação com o usuário.
- **Controller:** `ServiceOrderController`, `ClientController` e `TechnicalReportController`, responsáveis pela orquestração dos fluxos da aplicação.

A descrição completa da arquitetura está em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 🧠 Orientação a Objetos

O projeto aplica os principais conceitos de Orientação a Objetos:

- **Abstração:** contratos definidos através de interfaces como `ICommand`, `IServiceOrderDAO`, `IClientDAO`, `ITechnicalReportDAO` e `IStatusHistoryDAO`.
- **Encapsulamento:** entidades e Builder controlam a construção e alteração dos dados de domínio.
- **Polimorfismo por Interface:** diferentes Commands implementam o mesmo contrato `ICommand` e podem ser tratados pela Factory através da mesma abstração.

---

## 🧩 Design Patterns

### MVC — Model-View-Controller

Separa apresentação, controle da aplicação e modelos de domínio, reduzindo o acoplamento entre interface e regras de negócio.

### DAO — Data Access Object

A persistência é acessada através de interfaces como [`IServiceOrderDAO`](./src/interfaces/IServiceOrderDAO.ts) e [`IClientDAO`](./src/interfaces/IClientDAO.ts), permitindo que as regras de negócio não dependam diretamente do mecanismo de banco de dados.

Implementações principais:

- [`SupabaseServiceOrderDAO`](./src/dao/SupabaseServiceOrderDAO.ts)
- [`SupabaseClientDAO`](./src/dao/SupabaseClientDAO.ts)
- [`SupabaseTechnicalReportDAO`](./src/dao/SupabaseTechnicalReportDAO.ts)
- [`SupabaseStatusHistoryDAO`](./src/dao/SupabaseStatusHistoryDAO.ts)

### Builder — ServiceOrderBuilder

[`ServiceOrderBuilder`](./src/builders/ServiceOrderBuilder.ts) centraliza a construção da entidade `ServiceOrder`, que possui mais de 20 atributos, aplicando valores padrão e validações antes da instanciação final.

### Command

As operações relacionadas ao ciclo de vida da Ordem de Serviço são encapsuladas como objetos executáveis:

- `CreateServiceOrderCommand`
- `UpdateServiceOrderCommand`
- `DeleteServiceOrderCommand`
- `GetServiceOrderByIdCommand`
- `ListServiceOrdersCommand`
- `ChangeServiceOrderStatusCommand`

Todos seguem o contrato [`ICommand`](./src/interfaces/ICommand.ts).

### Factory Method — Command Factory & Registry

A [`ServiceOrderCommandFactory`](./src/factories/ServiceOrderCommandFactory.ts) utiliza um registro de `CommandCreator` para fornecer Commands sob demanda sem acoplar o Controller às implementações concretas.

O registro das implementações acontece no Composition Root [`createServiceOrderCommandFactory`](./src/factories/createServiceOrderCommandFactory.ts), permitindo extensão sem modificar a lógica interna da Factory.

---

## ⚙️ Automação de negócio

As regras automáticas estão centralizadas em [`ServiceOrderBusinessService`](./src/services/ServiceOrderBusinessService.ts).

1. **Status `Concluído`:** registra automaticamente a data/hora de conclusão.
2. **Status `Retornou com defeito`:** registra a data do retorno e o motivo informado.
3. **Retirada do equipamento:** registra o momento de retirada pelo cliente.
4. **Garantia:** calcula o período associado à retirada do equipamento.
5. **Histórico:** cada mudança relevante de status gera registro de auditoria.

---

## 🔗 Relacionamentos do banco

| Relacionamento | Cardinalidade | Implementação |
|---|---:|---|
| Cliente → Ordens de Serviço | **1:N** | `service_orders.cliente_id` |
| Ordem de Serviço → Laudo Técnico | **1:1** | `technical_reports.service_order_id UNIQUE` |
| Ordem de Serviço → Histórico de Status | **1:N** | `service_order_status_history.service_order_id` |

O schema completo está disponível em [`supabase-schema.sql`](./supabase-schema.sql).

---

## 🎓 Requisitos acadêmicos atendidos

| Requisito | Onde está implementado |
|---|---|
| **MVC** | Models, componentes React e Controllers separados |
| **DAO** | `src/interfaces/` + `src/dao/` |
| **Command** | `src/commands/` |
| **Factory Method** | `ServiceOrderCommandFactory` + Composition Root |
| **Builder** | `ServiceOrderBuilder` |
| **CRUD** | Clientes e Ordens de Serviço |
| **Automação de negócio** | `ServiceOrderBusinessService` + `ChangeServiceOrderStatusCommand` |
| **Relacionamento 1:N** | Cliente → Ordens e Ordem → Histórico |
| **Relacionamento 1:1** | Ordem → Laudo Técnico |
| **Entidade com 10+ atributos** | `ServiceOrder`, com mais de 20 atributos |
| **Diagrama de Classes** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Diagrama de Sequência** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Especificação de endpoints** | [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) |
| **Segurança** | JWT, bcrypt, validação, RLS e proteção de rotas |
| **Testes** | `tests/` + Vitest |
| **GitHub / versionamento** | Repositório versionado com histórico de commits |
| **Integração contínua** | `.github/workflows/quality.yml` |

---

## 🌐 API REST

A API utiliza autenticação JWT nas rotas protegidas.

Principais endpoints:

| Método / Endpoint | Finalidade |
|---|---|
| `POST /api/auth/login` | Autenticação e emissão de JWT |
| `GET /api/health` | Status da API |
| `/api/clients` | CRUD de clientes |
| `/api/orders` | CRUD de ordens de serviço |
| `PATCH /api/orders/:id/status` | Alteração de status e automações |
| `/api/orders/:id/history` | Histórico de status |
| `/api/orders/:id/technical-report` | Laudo técnico da ordem |
| `/api/maintenance-expenses` | Gestão de despesas |
| `GET /os/:idOrNum.pdf` | Geração protegida do PDF da O.S. |

A especificação detalhada dos payloads e respostas está em [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

---

## 🔐 Segurança

- **bcryptjs:** senhas persistidas como hash bcrypt.
- **JWT:** tokens assinados no backend com expiração configurada.
- **`requireAuth`:** middleware de proteção das rotas privadas.
- **Controle administrativo:** operações sensíveis, como reset de dados, exigem perfil administrativo.
- **RLS:** políticas de Row Level Security no PostgreSQL/Supabase.
- **`auth_accounts`:** acesso restrito ao backend através de `service_role`.
- **Variáveis de ambiente:** segredos e credenciais não são versionados no repositório.
- **PDF protegido:** documentos associados às ordens exigem autenticação.

---

## 🧪 Testes e qualidade

A suíte utiliza **Vitest** e cobre os principais componentes da arquitetura:

- `Auth.test.ts`
- `ServiceOrderCommandFactory.test.ts`
- `CreateServiceOrderCommand.test.ts`
- `UpdateServiceOrderCommand.test.ts`
- `ChangeServiceOrderStatusCommand.test.ts`
- `ServiceOrderBuilder.test.ts`
- `TechnicalReport.test.ts`
- `validation.test.ts`

### Executar testes

```bash
npm test
```

### Verificação de tipos

```bash
npm run typecheck
```

### Build de produção

```bash
npm run build
```

### CI

O workflow [`Quality & CI`](./.github/workflows/quality.yml) executa automaticamente **typecheck, testes e build** em pushes e pull requests direcionados à `main`.

---

## 🚀 Como executar

### 1. Clone o repositório

```bash
git clone https://github.com/PedroDev-tech01/NGAMESUZANO.git
cd NGAMESUZANO
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Depois, preencha o `.env` com as credenciais do seu ambiente.

### 4. Inicie em desenvolvimento

```bash
npm run dev
```

### 5. Gere o build de produção

```bash
npm run build
npm start
```

---

## 🔑 Variáveis de ambiente

O arquivo [`.env.example`](./.env.example) contém a estrutura esperada.

| Variável | Finalidade |
|---|---|
| `PORT` | Porta do servidor Express |
| `FRONTEND_URL` | Origem autorizada para CORS |
| `SUPABASE_URL` | URL da instância Supabase |
| `SUPABASE_ANON_KEY` | Chave pública da instância |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada utilizada apenas pelo backend |
| `JWT_SECRET` | Segredo para assinatura dos JWTs |
| `INITIAL_ADMIN_PASSWORD` | Senha utilizada no provisionamento inicial da conta administrativa |

> Nunca versione arquivos `.env`, senhas ou chaves privadas reais.

---

## ☁️ Deploy

### Frontend

Preparado para deploy estático na **Netlify**, publicando a pasta `dist/` e utilizando as regras SPA definidas em `netlify.toml`.

### Backend

O backend Express deve ser executado em um ambiente Node.js separado. O frontend se comunica com essa API por meio da URL configurada para o ambiente de produção.

---

## 📚 Diagramas e documentação

- 📐 [**Arquitetura, Diagrama de Classes e Diagramas de Sequência**](./ARCHITECTURE.md)
- 📘 [**Documentação completa da API**](./API_DOCUMENTATION.md)
- 🗄️ [**Schema PostgreSQL / Supabase**](./supabase-schema.sql)
- 🧪 [**Testes automatizados**](./tests)
- ⚙️ [**Workflow de CI**](./.github/workflows/quality.yml)

O arquivo `ARCHITECTURE.md` contém:

- Diagrama de Classes UML;
- Diagrama de Sequência de criação de Ordem de Serviço;
- Diagrama de Sequência de alteração de status;
- arquitetura MVC;
- Design Patterns;
- princípios SOLID;
- relacionamentos do banco.

---

## 👨‍💻 Autor

**Pedro Henrique Freire**  
Engenharia de Software

Projeto desenvolvido para a assistência técnica especializada **N! Games**.
