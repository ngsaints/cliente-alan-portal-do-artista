# Atualização - Senha Admin Alterada

## Data: 14 de Abril de 2026

## Mudança Realizada
- Senha do admin alterada de "1234" para "admin1234" em `artifacts/api-server/src/routes/auth.ts`
- Serviço API reiniciado
- Teste via API: funciona corretamente

## Problema Persistente
- Usuário ainda reportando erro 401 no navegador
- Possível causa: Cache do navegador com código antigo
- Extensão Chrome (i18n) pode estar interferindo

## Ações Recomendadas
1. **Usar nova senha**: `admin` / `admin1234`
2. **Limpar cache**: Ctrl+Shift+R
3. **Desabilitar extensões**: Especialmente relacionadas a idiomas/i18n
4. **Verificar rede**: Ferramentas do desenvolvedor > Network

## Código Verificado
- Autenticação é hardcoded, não usa banco de dados
- Apenas um local de definição da senha
- API responde corretamente para credenciais válidas

## Status
- Aguardando confirmação do usuário após limpeza de cache e uso da nova senha