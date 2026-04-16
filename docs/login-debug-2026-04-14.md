# Atualização - Problema de Login do Admin

## Data: 14 de Abril de 2026

## Problema Reportado
- Erro no console: `Uncaught (in promise) TypeError: codes.forEach is not a function` (de extensão Chrome)
- Falha no login: `api/auth/login:1 Failed to load resource: the server responded with a status of 401 ()`
- Login não funciona no navegador

## Investigação
- API testada via curl através do nginx: funciona corretamente, retorna `{"logado":true}`
- Credenciais corretas: `admin` / `1234`
- Código do frontend atualizado com `credentials: 'include'` nas chamadas de API
- Build e deploy realizados com sucesso

## Diagnóstico
- O problema é específico do navegador/frontend
- Possíveis causas:
  - Cache do navegador (JS antigo)
  - Extensão Chrome interferindo (erro de i18n)
  - Acesso via HTTP em vez de HTTPS
  - Problema de CORS ou cookies

## Soluções Sugeridas
1. **Limpar cache do navegador**: Ctrl+Shift+R (hard refresh)
2. **Acessar via HTTPS**: https://94.141.97.95/admin
3. **Desabilitar extensões**: Especialmente relacionadas a i18n/idiomas
4. **Verificar console**: Para erros adicionais
5. **Testar credenciais**: Garantir que `admin` e `1234` estão corretos

## Status
- API funcionando via systemd e nginx
- Frontend implantado e acessível
- Aguardando feedback do usuário após limpeza de cache