# Avalia

Sistema de gestao de gastos residenciais desenvolvido com backend em .NET/C# e frontend em React com TypeScript.

## Funcionalidades implementadas

### Cadastro de pessoas

- Cadastro de pessoa com nome e idade.
- Listagem de pessoas cadastradas.
- Edicao de cadastro de pessoa.
- Remocao de pessoa.
- Consulta do total de pessoas cadastradas.
- Validacao de nome obrigatorio.
- Validacao de idade entre 0 e 130 anos.

### Regra de negocio por idade

- Pessoas com idade menor que 18 anos podem cadastrar despesas.
- Pessoas com idade menor que 18 anos nao podem cadastrar receitas.
- Pessoas com idade igual ou maior que 18 anos podem cadastrar despesas e receitas.
- A API retorna as permissoes calculadas nos campos:
  - `canRegisterExpense`
  - `canRegisterIncome`

### Cadastro de transacoes

- Cadastro de transacao com descricao, valor, tipo e pessoa.
- Listagem de transacoes cadastradas.
- Identificador da transacao gerado automaticamente.
- Validacao de descricao obrigatoria.
- Validacao de valor maior que zero.
- Validacao de tipo permitido: `despesa` ou `receita`.
- Validacao de pessoa existente no cadastro de pessoas.
- Bloqueio de transacao do tipo `receita` para pessoa menor de 18 anos.

### Consulta de totais

- Listagem de todas as pessoas cadastradas.
- Exibicao do total de receitas por pessoa.
- Exibicao do total de despesas por pessoa.
- Exibicao do saldo por pessoa, calculado por `receita - despesa`.
- Exibicao do total geral de receitas.
- Exibicao do total geral de despesas.
- Exibicao do saldo liquido geral.

## Estrutura do projeto

```text
Avalia/
  backend/
    Avalia.Api.csproj
    Program.cs
    Data/
      avalia.db
  frontend/
    src/
      App.tsx
      App.css
      index.css
    package.json
  Avalia.slnx
  .gitignore
  README.md
```

## Como rodar

### Backend

Na raiz do projeto:

```powershell
dotnet run --project backend --urls http://localhost:5080
```

A API ficara disponivel em:

```text
http://localhost:5080
```

### Frontend

Em outro terminal:

```powershell
cd frontend
npm run dev
```

A aplicacao ficara disponivel em:

```text
http://localhost:5173
```

## Endpoints de pessoas

```text
GET    /api/people
GET    /api/people/{id}
POST   /api/people
PUT    /api/people/{id}
DELETE /api/people/{id}
```

## Endpoints de transacoes

```text
GET  /api/transactions
POST /api/transactions
```

## Endpoint de totais

```text
GET /api/totals
```

## Banco de dados

O projeto utiliza SQLite com o arquivo local:

```text
backend/Data/avalia.db
```

### Estrutura

```text
Pessoas
  Id
  Nome
  Idade

Transacoes
  Id
  Descricao
  Valor
  Tipo
  PessoaId
```

### Relacionamento

```text
Pessoa 1:N Transacoes
```

- Uma pessoa pode ter varias transacoes.
- Uma transacao pertence a uma pessoa.
- `Transacoes.PessoaId` referencia `Pessoas.Id`.

## Registro de alteracoes

### Criacao da base do projeto

- Criada a solution `Avalia.slnx`.
- Criado o projeto backend `backend/Avalia.Api.csproj`.
- Criado o projeto frontend em `frontend/` com React e TypeScript.
- Configurado CORS na API para permitir chamadas do frontend local.

### Backend

- Removido o endpoint inicial de exemplo do template.
- Criado o endpoint base `/api/people`.
- Criados os modelos `Person` e `PersonRequest`.
- Criado armazenamento temporario em memoria com `PeopleStore`.
- Implementadas operacoes de listar, buscar por id, cadastrar, editar e remover pessoas.
- Adicionada validacao de nome obrigatorio.
- Adicionada validacao simples de e-mail.
- Adicionado campo `Age` no cadastro de pessoa.
- Adicionada validacao de idade.
- Adicionadas permissoes calculadas:
  - `CanRegisterExpense`
  - `CanRegisterIncome`
- Adicionado Entity Framework Core com SQLite.
- Criado `AvaliaDbContext`.
- Criada entidade `Pessoa` com os campos `Id`, `Nome` e `Idade`.
- Criada entidade `Transacao` com os campos `Id`, `Descricao`, `Valor`, `Tipo` e `PessoaId`.
- Configurado relacionamento 1:N entre `Pessoa` e `Transacao`.
- Configurada criacao automatica do banco SQLite em `backend/Data/avalia.db`.
- Substituido armazenamento em memoria pelo banco SQLite.
- Criado endpoint base `/api/transactions`.
- Implementada listagem de transacoes.
- Implementado cadastro de transacoes.
- Adicionada geracao automatica do identificador da transacao.
- Adicionada validacao de pessoa existente para cadastro de transacao.
- Adicionada validacao para impedir receita quando a pessoa for menor de 18 anos.
- Criado endpoint `/api/totals`.
- Implementado calculo de totais por pessoa.
- Implementado calculo de total geral de receitas, despesas e saldo liquido.

### Frontend

- Removida a tela inicial padrao do Vite.
- Criada tela de cadastro de pessoas.
- Criado formulario com campos de nome e idade.
- Criada tabela de pessoas cadastradas.
- Adicionadas acoes de editar e remover pessoa.
- Adicionado contador de pessoas cadastradas.
- Adicionada exibicao das permissoes de despesa e receita por pessoa.
- Adicionado tratamento de mensagens de sucesso e erro.
- Adicionados estilos responsivos para desktop e telas menores.
- Criada tela de cadastro de transacoes.
- Criado formulario com campos de descricao, valor, tipo e pessoa.
- Criada tabela de transacoes cadastradas.
- Adicionado contador de transacoes cadastradas.
- Criada consulta de totais por pessoa.
- Criada exibicao do total geral ao final da consulta de totais.

### Repositorio

- Adicionado `.gitignore` na raiz.
- Configurado `.gitignore` para ignorar arquivos de build, dependencias, caches, logs, arquivos locais de IDE, arquivos `.env` e bancos locais.
