# Implementação de Autenticação Admin via Banco de Dados

## Data: 14 de Abril de 2026

## Mudanças Realizadas

### 1. Modificação do Sistema de Login
- **Arquivo**: `artifacts/api-server/src/routes/auth.ts`
- **Alteração**: Substituído login hardcoded por consulta ao banco de dados
- **Lógica**: Busca `admin_user` e `admin_pass` na tabela `settings`
- **Fallback**: Se não encontrar no DB, usa `admin` / `admin1234`

### 2. Atualização do Seed
- **Arquivo**: `scripts/seed.ts`
- **Adição**: Configurações padrão para admin no banco
  - `admin_user`: "admin"
  - `admin_pass`: "admin1234"

### 3. Configuração do Banco
- Criado usuário `artista` com senha `artista123`
- Concedidas permissões no banco `portal_do_artista`
- Copiado `.env` para `lib/db/` para acesso ao `DATABASE_URL`
- Executado push do schema e seed do banco

### 4. Reinício do Serviço
- Reiniciado `portal-artista-api.service` para aplicar mudanças

## Como Funciona Agora
1. Login consulta a tabela `settings` por `admin_user` e `admin_pass`
2. Compara as credenciais fornecidas
3. Se válidas, cria sessão
4. Credenciais podem ser alteradas via painel admin (settings)

## Teste
- API testada via curl: funciona corretamente
- Credenciais: `admin` / `admin1234`

## Benefícios
- Credenciais armazenadas no banco de dados
- Possibilidade de alterar senha via interface
- Mais seguro e configurável