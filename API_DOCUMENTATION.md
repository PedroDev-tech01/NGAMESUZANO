# N! Games — Documentação da API REST

A API REST do sistema **N! Games** é desenvolvida em Node.js com Express e TypeScript, oferecendo suporte integral às operações CRUD de Clientes, Ordens de Serviço, Laudos Técnicos Periciais (1:1) e Despesas de Manutenção.

**Base URL**: `http://localhost:3000/api` (ou `/api` no ambiente de produção)

---

## 1. Endpoints de Clientes (`/clients`)

### 1.1. Listar Clientes
- **Método**: `GET /api/clients`
- **Descrição**: Retorna a lista completa de clientes cadastrados, ordenados por data de cadastro.
- **Resposta 200 OK**:
```json
[
  {
    "id": "cpf-23916983806",
    "nome": "BRUNO SANTOS",
    "cpf": "239.169.838-06",
    "telefone": "(11) 98765-4321",
    "cep": "01310-100",
    "endereco": "Av. Paulista, 1000",
    "createdAt": "2026-09-27T18:43:17.468Z"
  }
]
```

### 1.2. Consultar Cliente por ID
- **Método**: `GET /api/clients/:id`
- **Resposta 200 OK**: Objeto `Client`.
- **Resposta 404 Not Found**: `{"error": "Cliente não encontrado"}`

### 1.3. Cadastrar Cliente
- **Método**: `POST /api/clients`
- **Cabeçalhos**: `Content-Type: application/json`
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
- **Validações**: CPF deve ser válido (algoritmo dos 11 dígitos com dígitos verificadores) e único no sistema. Telefone deve conter DDD válido.
- **Resposta 201 Created**: Objeto `Client` persistido.
- **Resposta 400 Bad Request**: Erro de validação.

### 1.4. Atualizar Cliente
- **Método**: `PUT /api/clients/:id`
- **Body**: Parcial dos campos do cliente.
- **Resposta 200 OK**: Objeto `Client` atualizado.

### 1.5. Excluir Cliente
- **Método**: `DELETE /api/clients/:id`
- **Resposta 200 OK**: `{"success": true, "message": "Cliente excluído com sucesso"}`

---

## 2. Endpoints de Ordens de Serviço (`/orders`)

A entidade **ServiceOrder** possui mais de 10 atributos de domínio conforme especificado:
`id`, `numero`, `clienteId`, `situacao`, `canal`, `entrada`, `prazo`, `saida`, `dataRetirada`, `dataRetorno`, `motivoRetorno`, `equipamento`, `marca`, `modelo`, `serie`, `defeito`, `solucao`, `estadoConsole`, `itens`, `valor`, `maoObra`, `pecas`, `obs`, `createdAt`, `historicoStatus`.

### 2.1. Listar Ordens de Serviço
- **Método**: `GET /api/orders`
- **Filtros opcionais por Query**:
  - `?situacao=Em aberto`
  - `?clienteId=cpf-12345678900`
- **Resposta 200 OK**: Lista de `ServiceOrder`.

### 2.2. Consultar Ordem de Serviço por ID ou Número
- **Método**: `GET /api/orders/:id`
- **Resposta 200 OK**: Objeto `ServiceOrder`.

### 2.3. Cadastrar Ordem de Serviço (Command + Builder)
- **Método**: `POST /api/orders`
- **Body**:
```json
{
  "clienteId": "cpf-23916983806",
  "equipamento": "PlayStation 5",
  "marca": "Sony",
  "modelo": "CFI-1214A",
  "serie": "AJ123456789",
  "defeito": "Superaquecimento e desligando em 15 minutos",
  "estadoConsole": "Lacre rompido, marcas superficiais de uso",
  "itens": [
    {
      "id": "item-1",
      "equipamento": "PlayStation 5",
      "marca": "Sony",
      "defeito": "Superaquecimento"
    }
  ],
  "valor": 350.00,
  "situacao": "Em aberto",
  "canal": "Presencial"
}
```
- **Automações Aplicadas**:
  - Geração atômica do próximo número sequencial da O.S.
  - Registro da data de entrada no padrão ISO.
  - Criação do evento inicial de histórico na tabela `service_order_status_history`.
- **Resposta 201 Created**: Objeto `ServiceOrder` com número e ID definitivos.

### 2.4. Atualizar Ordem de Serviço
- **Método**: `PUT /api/orders/:id`
- **Body**: Campos a atualizar.
- **Regra de Segurança**: Se o status já estiver `Concluído`, campos estruturais ficam protegidos contra adulteração para manter a auditoria.
- **Resposta 200 OK**: `ServiceOrder` atualizada.

### 2.5. Alterar Status com Automação de Negócio
- **Método**: `PATCH /api/orders/:id/status`
- **Body**:
```json
{
  "situacao": "Concluído",
  "observacao": "Troca de metal líquido realizada e testes com 4 horas de jogo sem erro"
}
```
- **Automações**: Preenchimento automático da data de `saida` quando concluído; registro de data de retorno e motivo se for `Retornou com defeito`.
- **Resposta 200 OK**: `ServiceOrder` atualizada.

### 2.6. Atualizar Prazo Técnico
- **Método**: `PATCH /api/orders/:id/prazo`
- **Body**: `{"prazo": "2026-10-05T18:00:00.000Z"}`
- **Resposta 200 OK**: Objeto atualizado.

### 2.7. Registrar Retirada / Balcão
- **Método**: `PATCH /api/orders/:id/retirada`
- **Body**: `{"dataRetirada": "2026-09-29T14:30:00.000Z"}`
- **Automação**: Inicia a contagem dos 90 dias de garantia legal do CDC.
- **Resposta 200 OK**: Objeto atualizado.

### 2.8. Excluir Ordem de Serviço
- **Método**: `DELETE /api/orders/:id`
- **Resposta 200 OK**: `{"success": true, "message": "Ordem excluída com sucesso"}`

---

## 3. Endpoints de Laudo Técnico Pericial — Relacionamento 1:1 (`/orders/:id/technical-report`)

Cada Ordem de Serviço pode ter **no máximo UM laudo técnico** (restrição UNIQUE no PostgreSQL e tratada pelo `TechnicalReportController`).

### 3.1. Consultar Laudo da O.S. (1:1)
- **Método**: `GET /api/orders/:id/technical-report`
- **Resposta 200 OK**:
```json
{
  "id": "rep-muk62h-01",
  "serviceOrderId": "ord-1790605262789-wjrv6",
  "diagnostico": "Presença de oxidação severa no conector HDMI e trilha de dados rompida.",
  "servicoRealizado": "Microsoldagem de restauração de trilhas e substituição da porta HDMI por componente original.",
  "pecasUtilizadas": "1x Conector HDMI Original PS5",
  "observacaoTecnica": "Teste de resolução 4K a 120Hz validado com sucesso durante 3 horas em monitor de referência.",
  "tecnicoResponsavel": "Eng. Técnico N! Games",
  "dataAnalise": "2026-09-29T13:00:00.000Z",
  "createdAt": "2026-09-29T13:00:00.000Z",
  "updatedAt": "2026-09-29T13:00:00.000Z"
}
```
- **Resposta 404 Not Found**: Se a O.S. ainda não possuir laudo emitido.

### 3.2. Emitir Laudo Técnico (1:1)
- **Método**: `POST /api/orders/:id/technical-report`
- **Body**:
```json
{
  "diagnostico": "Curto-circuito na linha de 12V da fonte secundária",
  "servicoRealizado": "Substituição de mosfets e recalibração das tensões de alimentação",
  "pecasUtilizadas": "2x Mosfets de potência",
  "observacaoTecnica": "Consumo de corrente dentro das especificações de fábrica (1.8A em carga)",
  "tecnicoResponsavel": "Técnico Especialista N! GAMES",
  "dataAnalise": "2026-09-29T15:00:00.000Z"
}
```
- **Resposta 201 Created**: Objeto `TechnicalReport` persistido.
- **Resposta 409 Conflict**: Caso já exista um laudo emitido para esta mesma O.S. (proteção da regra 1:1).

### 3.3. Atualizar Laudo Técnico
- **Método**: `PUT /api/orders/:id/technical-report`
- **Body**: Campos do laudo a serem retificados.
- **Resposta 200 OK**: Objeto atualizado com timestamp `updatedAt`.

### 3.4. Excluir Laudo Técnico
- **Método**: `DELETE /api/orders/:id/technical-report`
- **Resposta 200 OK**: `{"success": true, "message": "Laudo técnico excluído com sucesso"}`

---

## 4. Endpoints de PDF Vetorial e Impressão

- `GET /os/:id.pdf`: Transmite o arquivo PDF vetorial com layout A4 oficial, logotipo, especificações e termos de garantia.
- `GET /ordem/:id`: Rota curta com redirecionamento amigável para o documento.

---

## 5. Endpoints de Diagnóstico do Servidor

- `GET /api/health`: Retorna status operacional do servidor Node.js/Express, conexão com Supabase e contadores de entidades no banco.
- `GET /api/bootstrap`: Carga consolidada atômica de dados para inicialização instantânea do frontend.
