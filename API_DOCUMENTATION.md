# N! Games — Documentação da API REST

A API REST do sistema **N! Games** é desenvolvida em Node.js com Express e TypeScript, oferecendo suporte integral às operações autenticadas de Clientes, Ordens de Serviço, Histórico de Status (1:N), Laudos Técnicos Periciais (1:1) e Despesas de Manutenção.

**Base URL**: `http://localhost:3000/api` (ou `/api` em produção)

---

## 1. Autenticação & Diagnóstico (`/auth` e `/health`)

### 1.1. Login Administrativo
- **Método**: `POST /api/auth/login`
- **Cabeçalhos**: `Content-Type: application/json`
- **Body**:
```json
{
  "cnpj": "34.467.363/0001-53",
  "senha": "sua-senha-segura"
}
```
- **Validações**: Validação do algoritmo de dígitos verificadores do CNPJ e verificação da senha via `bcrypt.compare()`.
- **Resposta 200 OK**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "cnpj": "34.467.363/0001-53",
    "razaoSocial": "N! GAMES ASSISTÊNCIA TÉCNICA ESPECIALIZADA",
    "nomeFantasia": "N! GAMES",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "loggedAt": "2026-09-30T10:00:00.000Z"
  },
  "message": "Autenticação autorizada com sucesso"
}
```
- **Resposta 401 Unauthorized**: Credenciais inválidas ou conta inativa.

### 1.2. Logout
- **Método**: `POST /api/auth/logout`
- **Resposta 200 OK**: `{"success": true, "message": "Sessão encerrada com sucesso"}`

### 1.3. Health Check
- **Método**: `GET /api/health`
- **Resposta 200 OK**:
```json
{
  "status": "ok",
  "database": "connected",
  "server": "N! GAMES Tech Backend",
  "uptime": 1240,
  "timestamp": "2026-09-30T10:00:00.000Z"
}
```

### 1.4. Bootstrap Inicial
- **Método**: `GET /api/bootstrap`
- **Cabeçalhos**: `Authorization: Bearer <token>`
- **Resposta 200 OK**: Consolidação atômica de clientes, ordens, despesas e próximo sequencial.

---

## 2. Endpoints de Clientes (`/clients`)

Todas as rotas de clientes exigem o cabeçalho `Authorization: Bearer <token>`.

### 2.1. Listar Clientes
- **Método**: `GET /api/clients`
- **Resposta 200 OK**: Lista completa de clientes cadastrados.

### 2.2. Consultar Cliente por ID
- **Método**: `GET /api/clients/:id`
- **Resposta 200 OK**: Objeto `Client`.
- **Resposta 404 Not Found**: `{"error": "Cliente não encontrado"}`

### 2.3. Consultar Cliente por CPF
- **Método**: `GET /api/clients/by-cpf/:cpf`
- **Resposta 200 OK**: Objeto `Client`.
- **Resposta 404 Not Found**: `{"error": "Cliente não encontrado com este CPF"}`

### 2.4. Cadastrar Cliente
- **Método**: `POST /api/clients`
- **Body**:
```json
{
  "nome": "Carla Baliero",
  "cpf": "123.456.789-00",
  "telefone": "(11) 99999-8888",
  "cep": "04001-000",
  "endereco": "Rua Domingos de Morais, 200"
}
```
- **Validações**: CPF válido e único no sistema; telefone com DDD válido.
- **Resposta 201 Created**: Objeto `Client` persistido.
- **Resposta 409 Conflict**: Caso o CPF já esteja cadastrado.

### 2.5. Atualizar Cliente
- **Método**: `PUT /api/clients/:id`
- **Body**: Campos do cliente a atualizar.
- **Resposta 200 OK**: Objeto `Client` atualizado.

### 2.6. Excluir Cliente
- **Método**: `DELETE /api/clients/:id`
- **Resposta 200 OK**: `{"success": true, "message": "Cliente excluído com sucesso"}`

---

## 3. Endpoints de Ordens de Serviço (`/orders`)

A entidade **ServiceOrder** possui mais de 10 atributos de domínio:
`id`, `numero`, `clienteId`, `situacao`, `canal`, `entrada`, `prazo`, `saida`, `dataRetirada`, `dataRetorno`, `motivoRetorno`, `equipamento`, `marca`, `modelo`, `serie`, `defeito`, `solucao`, `estadoConsole`, `itens`, `valor`, `maoObra`, `pecas`, `obs`, `createdAt`, `historicoStatus`.

### 3.1. Listar Ordens de Serviço
- **Método**: `GET /api/orders`
- **Filtros opcionais**: `?situacao=Em aberto`, `?clienteId=cpf-12345678900`
- **Resposta 200 OK**: Lista de `ServiceOrder`.

### 3.2. Consultar Ordem de Serviço por ID ou Número
- **Método**: `GET /api/orders/:id`
- **Resposta 200 OK**: Objeto `ServiceOrder`.

### 3.3. Cadastrar Ordem de Serviço (Command + Builder)
- **Método**: `POST /api/orders`
- **Fluxo**: `ServiceOrderController.createOrder` ➔ `ServiceOrderCommandFactory` ➔ `CreateServiceOrderCommand` ➔ `ServiceOrderBuilder` ➔ `IServiceOrderDAO`.
- **Body**:
```json
{
  "clienteId": "cpf-23916983806",
  "equipamento": "PlayStation 5",
  "marca": "Sony",
  "modelo": "CFI-1214A",
  "serie": "AJ123456789",
  "defeito": "Superaquecimento e desligando em 15 minutos",
  "estadoConsole": "Lacre rompido, marcas de uso",
  "valor": 350.00,
  "situacao": "Em aberto",
  "canal": "Presencial"
}
```
- **Resposta 201 Created**: Objeto `ServiceOrder` com número sequencial atômico e histórico inicial.

### 3.4. Atualizar Ordem de Serviço (incluindo Prazo e Retirada)
- **Método**: `PUT /api/orders/:id`
- **Body**: Campos técnicos a atualizar (equipamento, valor, pecas, maoObra, prazo, dataRetirada, obs).
- **Resposta 200 OK**: `ServiceOrder` atualizada.

### 3.5. Alterar Status com Automação de Negócio
- **Método**: `PATCH /api/orders/:id/status`
- **Fluxo**: `ServiceOrderController.changeStatus` ➔ `ChangeServiceOrderStatusCommand` ➔ `IServiceOrderDAO` + `IStatusHistoryDAO`.
- **Body**:
```json
{
  "situacao": "Concluído",
  "observacao": "Troca de metal líquido realizada e testes aprovados",
  "usuario": "Técnico Especialista"
}
```
- **Automações Aplicadas**:
  - `Concluído`: preenche automaticamente a data de `saida`.
  - `Retornou com defeito`: registra data de retorno e motivo de reincidência.
  - Grava automaticamente o evento na tabela auditada de histórico.
- **Resposta 200 OK**: `ServiceOrder` atualizada.

### 3.6. Excluir Ordem de Serviço
- **Método**: `DELETE /api/orders/:id`
- **Resposta 200 OK**: `{"success": true, "message": "Ordem de serviço excluída com sucesso"}`

---

## 4. Histórico de Status — Relacionamento 1:N (`/orders/:id/history`)

### 4.1. Consultar Histórico Auditado da O.S.
- **Método**: `GET /api/orders/:id/history`
- **Resposta 200 OK**: Lista imutável de transições de status daquela ordem com status anterior, status novo, observação, autor e data.

---

## 5. Laudos Técnicos Periciais — Relacionamento 1:1 (`/orders/:id/technical-report`)

Cada Ordem de Serviço pode ter **no máximo UM laudo técnico** (restrição UNIQUE no banco de dados).

### 5.1. Consultar Laudo da O.S.
- **Método**: `GET /api/orders/:id/technical-report`
- **Resposta 200 OK**: Objeto `TechnicalReport`.
- **Resposta 404 Not Found**: Caso a ordem não possua laudo.

### 5.2. Emitir Laudo Técnico
- **Método**: `POST /api/orders/:id/technical-report`
- **Body**:
```json
{
  "diagnostico": "Curto-circuito na linha de 12V da fonte secundária",
  "servicoRealizado": "Substituição de mosfets e capacitores",
  "pecasUtilizadas": "2x Mosfets de potência",
  "observacaoTecnica": "Consumo de corrente aferido em 1.8A",
  "tecnicoResponsavel": "Técnico Especialista N! GAMES",
  "dataAnalise": "2026-09-30T10:00:00.000Z"
}
```
- **Resposta 201 Created**: Objeto `TechnicalReport` persistido.
- **Resposta 409 Conflict**: Caso já exista um laudo emitido para esta ordem.

### 5.3. Atualizar Laudo Técnico
- **Método**: `PUT /api/orders/:id/technical-report`
- **Body**: Campos técnicos retificados.
- **Resposta 200 OK**: Objeto `TechnicalReport` atualizado.

### 5.4. Excluir Laudo Técnico
- **Método**: `DELETE /api/orders/:id/technical-report`
- **Resposta 200 OK**: `{"success": true, "message": "Laudo técnico removido com sucesso"}`

---

## 6. Despesas de Manutenção (`/maintenance-expenses`)

### 6.1. Listar Despesas
- **Método**: `GET /api/maintenance-expenses`
- **Resposta 200 OK**: Lista de despesas cadastradas.

### 6.2. Cadastrar Despesa
- **Método**: `POST /api/maintenance-expenses`
- **Body**:
```json
{
  "mes": "2026-09",
  "descricao": "Lote de pasta térmica de alta condutividade",
  "categoria": "Peças & Componentes",
  "valor": 180.00,
  "data": "2026-09-30"
}
```
- **Resposta 201 Created**: Despesa persistida.

### 6.3. Excluir Despesa
- **Método**: `DELETE /api/maintenance-expenses/:id`
- **Resposta 200 OK**: `{"success": true, "message": "Custo de manutenção excluído com sucesso"}`

---

## 7. Documento PDF da Ordem de Serviço

- **Métodos**:
  - `GET /os/:idOrNum.pdf`
  - `GET /api/orders/:id/pdf`
  - `GET /ordem/:id` (redirecionamento autenticado)
- **Autenticação**: Exige token JWT via header `Authorization: Bearer <token>` ou query param `?token=<token>`.
- **Proteção**: Bloqueia enumeração sequencial por usuários anônimos.
- **Resposta 200 OK**: Buffer binário do PDF vetorial com cabeçalho `Content-Type: application/pdf`.
