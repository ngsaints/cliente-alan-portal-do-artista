# Sessão 2026-04-14 — Debug Login Admin

## Problema
Usuário não conseguia fazer login no painel admin (`/admin`) com credenciais `admin` / `1234`.

## Diagnóstico

### 1. Credenciais no Banco
- Existiam duas tabelas de settings: `settings` e `app_settings`
- As credenciais estavam em `app_settings`, mas o código buscava em `settings`
- Credenciais em `settings`: `admin` / `admin1234`
- Credenciais em `app_settings`: `admin` / `1234`

**Solução**: Atualizar senha em `settings` para `1234`

### 2. API Funcionando
- Login funcionava via curl: `curl -sk -X POST https://94.141.97.95/api/auth/login -d '{"usuario":"admin","senha":"1234"}'`
- Retornava `{"logado":true}`
- Sessão persistia corretamente

### 3. Frontend não Enviava Dados
- Logs mostravam: `[AUTH] Body recebido: {}`
- `usuario` e `senha` chegavam como `undefined` no backend

**Causa**: O código gerado pelo Orval esperava o formato:
```javascript
await login.mutateAsync({ data: { usuario, senha } })
```
Mas o frontend enviava:
```javascript
await login.mutateAsync({ usuario, senha })
```

### 4. Correção Aplicada
Arquivo: `artifacts/alan-ribeiro-catalog/src/pages/Admin.tsx` (linha 48)

```diff
- await login.mutateAsync({ usuario, senha });
+ await login.mutateAsync({ data: { usuario, senha } });
```

## Resultado
- Login funcionou corretamente
- Painel admin acessível com `admin` / `1234`
- Rebuild e deploy do frontend executados