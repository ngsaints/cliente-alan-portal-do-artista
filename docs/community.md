# Comunidade do Portal

A comunidade fica em `/comunidade`, com acesso no menu público e no painel do artista. É necessário entrar com uma conta para ler ou participar. O admin tem acesso às salas e à aba Comunidade do painel administrativo.

Salas iniciais: Encontro dos Artistas (`encontro`) e Parcerias de Composição (`parcerias`). O histórico recente exibe as últimas 100 mensagens. Mensagens são texto; links HTTP/HTTPS são clicáveis. Não há upload de arquivos nem mensagens privadas nesta versão.

## Banco e publicação

A migração `migrations/034_community.sql` cria apenas as tabelas e o índice da comunidade. Os endpoints também inicializam essas tabelas com `CREATE IF NOT EXISTS` no primeiro acesso autenticado. A conta de conexão deve ter permissão de criação ou a migração deve ser executada antes da publicação. O adaptador aceita PostgreSQL e Turso/SQLite.

O frontend deve ser reconstruído no deploy. O envio ao Git não substitui o deploy da VPS.

## Atualização e presença

O chat usa SSE em `/api/community/events` para sinalizar mudanças e consulta as mensagens autenticadas para atualizar a tela. A conexão não transporta o conteúdo das mensagens. Há uma consulta de recuperação a cada 15 segundos; assim, a atualização também funciona quando a conexão cai ou há mais de uma instância da API. Proxies devem permitir conexões SSE; a resposta envia `X-Accel-Buffering: no` e keepalive a cada 25 segundos.

Presença é atualizada a cada 30 segundos em abas visíveis; participantes sem atividade por 90 segundos deixam de aparecer como online.

## Moderação

Artistas podem denunciar mensagens e ocultar participantes. Bloqueios são pessoais e podem ser desfeitos na lista de bloqueados. O admin pode remover mensagens, encerrar denúncias, suspender participantes e remover suspensões. Suspensão bloqueia o envio na comunidade; não cancela planos ou a conta do artista.

Mensagens removidas são ocultadas do histórico e das respostas; o conteúdo permanece disponível na base para moderação. O limite de envio/denúncia é de 20 ações por minuto por artista e o texto aceita até 2.000 caracteres. As salas devem ter acompanhamento humano pelo admin.

## Verificação

`node --import tsx community.test.ts` na pasta `artifacts/api-server` executa testes com SQLite em memória: autorização, isolamento do admin, autoria pela sessão, salas/respostas, presença, bloqueios, denúncias, suspensões e remoção de conteúdo. Os testes não acessam o banco de produção.
