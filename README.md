# N! Games — Sistema de Gerenciamento de Ordens de Serviço

Sistema profissional para gestão de assistência técnica especializada em consoles de videogame e eletrônicos, cobrindo o ciclo de vida completo de ordens de serviço, emissão de laudos periciais, controle financeiro de peças e conformidade com o Código de Defesa do Consumidor (garantia legal de 90 dias).

---

## Sobre o projeto

O projeto foi desenvolvido para atender às demandas operacionais da assistência técnica **N! Games**, proporcionando controle de ponta a ponta desde a recepção do equipamento até a entrega, com rastreabilidade auditada, emissão de documentos PDF e segurança de dados.

## Objetivo

Fornecer uma solução full-stack robusta, desacoplada e orientada a objetos que implemente os principais padrões de projeto da Engenharia de Software (GoF), separando claramente as responsabilidades entre interface, controladores, comandos de negócio e persistência em banco relacional.

## Funcionalidades

- **Gestão de Clientes (CRUD Completo)**: Cadastro com validação algorítmica de CPF (dígitos verificadores), formato de telefone/DDD e endereço.
- **Ordens de Serviço**: Cadastro detalhado com mais de 20 atributos de domínio (console, modelo, número de série, estado estético, acessórios, defeito relatado e valores).
- **Numeração Sequencial Atômica**: Geração incremental garantida para cada nova O.S. (iniciando em 150001).
- **Laudo Técnico Pericial (1:1)**: Emissão de relatório técnico estruturado com diagnóstico, componentes substituídos e parecer do perito, com garantia de unicidade estrita por ordem.
- **Histórico de Status Auditado (1:N)**: Rastreamento cronológico de todas as transições de status com registro de usuário, motivo e data ISO.
- **Emissão e Download de PDF Vetorial**: Geração de via impressa padrão A4 para balcão e via do cliente com termos de garantia.
- **Integração WhatsApp**: Notificações formatadas com dados da ordem enviadas com um clique.
- **Controle de Despesas e Manutenção**: Registro de custos de insumos e peças de reposição.
- **Autenticação Segura**: Acesso restrito com hash bcrypt e tokens JWT assinados no backend.

## Tecnologias

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express, TypeScript, tsx, esbuild.
- **Banco de Dados**: PostgreSQL / Supabase BaaS com Row Level Security (RLS).
- **Segurança**: Bcrypt.js, JSON Web Token (jsonwebtoken), Zod para validação de esquemas.
- **Testes**: Vitest (suíte unitária e de integração).
- **Build & Bundle**: Vite 6, esbuild.

## Arquitetura

O sistema adota o padrão **Model-View-Controller (MVC)** em camadas bem delimitadas:
- **View**: Interface reativa em React, responsável exclusivamente pela renderização e captura de eventos.
- **Controller**: Camada orquestradora em Express (`ServiceOrderController`, `ClientController`, `TechnicalReportController`) que valida as entradas e delega para Commands e DAOs.
- **Model**: Modelos de domínio e tipos estritos TypeScript que garantem as regras de integridade do negócio.

## Orientação a Objetos

Aplicação rigorosa dos quatro pilares da Orientação a Objetos:
- **Abstração**: Contratos definidos por interfaces (`ICommand`, `IServiceOrderDAO`, `IClientDAO`, `ITechnicalReportDAO`, `IStatusHistoryDAO`).
- **Encapsulamento**: Atributos privados e métodos de mutação controlada nas entidades e no Builder.
- **Polimorfismo por Interface**: diferentes Commands implementam o mesmo contrato ICommand e podem ser tratados pela Factory através da mesma abstração.

## Design Patterns

### MVC (Model-View-Controller)
Isolamento entre a apresentação gráfica (React), os controladores de fluxo HTTP (Express) e a camada de domínio e dados.

### DAO (Data Access Object)
Desacopla a regra de negócio do mecanismo de persistência. A aplicação interage apenas com `IServiceOrderDAO` e `IClientDAO`, permitindo alternar entre Supabase, PostgreSQL local ou qualquer outro banco sem alterar as regras de negócio.

### Builder (ServiceOrderBuilder)
Construtor fluente para a criação da entidade complexa `ServiceOrder` (com mais de 20 atributos), aplicando valores padrão e validando campos obrigatórios antes da instanciação final.

### Command
Cada operação do ciclo de vida da Ordem de Serviço é encapsulada em um comando executável (`CreateServiceOrderCommand`, `UpdateServiceOrderCommand`, `ChangeServiceOrderStatusCommand`, `DeleteServiceOrderCommand`, `GetServiceOrderByIdCommand`, `ListServiceOrdersCommand`).

### Factory Method (Command Factory & Registry)
A `ServiceOrderCommandFactory` utiliza um registro de criadores (`Command Creators`) para instanciar comandos sob demanda sem depender de estruturas `switch` ou acoplamento a classes concretas. O registro é configurado no *Composition Root* (`createServiceOrderCommandFactory`), respeitando integralmente o Princípio Aberto/Fechado (OCP).

## Automação de negócio

Centralizada no serviço `ServiceOrderBusinessService`:
1. **Transição para 'Concluído'**: Preenchimento automático da data e hora de saída (`saida`).
2. **Transição para 'Retornou com defeito'**: Registro imediato de `dataRetorno` e obrigatoriedade do motivo da reincidência.
3. **Garantia Legal CDC**: Ativação e cálculo do prazo legal de 90 dias a partir da data de retirada pelo cliente.
4. **Auditoria de Histórico**: Cada mudança gera automaticamente um novo registro imutável no histórico da ordem.

## Relacionamentos

- **Client 1:N ServiceOrder**: Um cliente pode ter múltiplas ordens de serviço associadas.
- **ServiceOrder 1:1 TechnicalReport**: Cada ordem de serviço possui no máximo um laudo pericial (chave estrangeira com restrição UNIQUE).
- **ServiceOrder 1:N StatusHistory**: Cada ordem possui um histórico auditado de todas as suas alterações de situação.

## API

A API REST disponibiliza endpoints protegidos por autenticação JWT:
- `/api/auth/login`: Autenticação e emissão de token.
- `/api/health`: Status operacional da API e do banco.
- `/api/clients`: CRUD completo de clientes e busca por CPF (`/by-cpf/:cpf`).
- `/api/orders`: Listagem, consulta, criação, atualização e exclusão de ordens.
- `/api/orders/:id/status`: Transição de status com automação de negócio.
- `/api/orders/:id/history`: Histórico cronológico auditado.
- `/api/orders/:id/technical-report`: Emissão e consulta do laudo pericial (1:1).
- `/api/maintenance-expenses`: Gestão de despesas e peças.
- `/os/:idOrNum.pdf`: Emissão segura de PDF com controle de acesso.

Consulte o arquivo `API_DOCUMENTATION.md` para a especificação completa de payloads e respostas.

## Segurança

- **Hashing de Senhas**: Senhas protegidas exclusivamente com `bcryptjs` (salt rounds 10).
- **JWT**: Tokens assinados com segredo restrito ao ambiente do servidor e prazo de expiração (8h).
- **Middleware `requireAuth`**: Proteção de rotas da API contra requisições não autenticadas via header Bearer ou token de query.
- **Row Level Security (RLS)**: Tabelas no PostgreSQL protegidas por políticas restritivas que impedem escrita anônima (`anon`) e restringem a tabela `auth_accounts` estritamente ao `service_role`.
- **Prevenção contra Enumeração**: PDFs e relatórios exigem autenticação para evitar raspagem de dados por ID sequencial.

## Testes

A suíte de testes unitários e de integração utiliza o framework **Vitest**:
- `Auth.test.ts`: Criptografia bcrypt, emissão e validação de tokens JWT, bloqueio e liberação no middleware `requireAuth`.
- `ServiceOrderCommandFactory.test.ts`: Registro dinâmico de criadores, resolução de comandos, extensibilidade OCP e tratamento de exceções.
- `CreateServiceOrderCommand.test.ts`: Execução do comando de criação e persistência do histórico inicial.
- `UpdateServiceOrderCommand.test.ts`: Atualização de dados técnicos e validação de existência.
- `ChangeServiceOrderStatusCommand.test.ts`: Automação de datas de conclusão e retorno com defeito.
- `ServiceOrderBuilder.test.ts`: Validação de invariantes, campos obrigatórios e instanciação.
- `TechnicalReport.test.ts`: Regras de negócio e integridade do laudo 1:1.
- `validation.test.ts`: Validações de CPF, CNPJ, moeda e dados técnicos.

Para executar a suíte de testes:
```bash
npm test
```

## Como executar

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio>
cd ngames-sistema-os
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
Copie o arquivo de exemplo e preencha as variáveis:
```bash
cp .env.example .env
```

4. **Inicie o servidor de desenvolvimento**:
```bash
npm run dev
```

5. **Para compilar o projeto para produção**:
```bash
npm run build
npm start
```

## Variáveis de ambiente

Configuradas através do arquivo `.env` (baseado no `.env.example`):
- `PORT`: Porta de execução do servidor Express (padrão: 3000).
- `FRONTEND_URL`: URL do cliente frontend para configuração de CORS.
- `SUPABASE_URL`: Endpoint da instância Supabase/PostgreSQL.
- `SUPABASE_ANON_KEY`: Chave pública para leitura autorizada.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave privada do backend para operações administrativas seguras.
- `JWT_SECRET`: Chave secreta de alta entropia para assinatura dos tokens JWT.
- `INITIAL_ADMIN_PASSWORD`: Senha inicial para a conta administrativa mestre.

## Deploy

- **Frontend**: Pronto para deploy estático na Netlify (`dist/`), com regras de roteamento SPA configuradas em `netlify.toml`.
- **Backend API**: Preparado para execução em contêineres Node.js ou plataformas cloud com `npm run build && npm start`.

## Diagramas

Os diagramas arquiteturais completos em notação UML (Mermaid), incluindo o Diagrama de Classes e os Diagramas de Sequência para criação e alteração de status, estão detalhados no arquivo `ARCHITECTURE.md`.

## Autor

Projeto desenvolvido e mantido para a assistência técnica especializada **N! Games**.
