# Músicas em alta

Site `/play`, PWA `/play-app` e APK consultam a mesma lista ordenada em `GET /api/songs/trending`. O catálogo geral `/api/songs` e a navegação Explorar mantêm a descoberta de artistas; a home do player usa o ranking.

O ranking conta eventos válidos em uma janela móvel de 7 dias. Empates usam a data da reprodução mais recente, a publicação da faixa e seu ID. Sem reproduções recentes, o player apresenta Novidades do Portal, em ordem de publicação. O Destaque da semana é o primeiro colocado; sem dados recentes, o cartão é identificado como novidade.

Para contar: o player solicita um ticket assinado em `/songs/:id/listen` e registra o evento em `/songs/:id/play` após acumular 30 segundos de áudio em reprodução. Pausa, espera por dados e avanço de posição não contam como escuta. O servidor rejeita tickets prematuros, expirados, adulterados ou emitidos para outra faixa/ouvinte. Os tickets são consumidos uma vez. Um mesmo ouvinte só conta um play por faixa a cada 30 minutos, inclusive com tickets diferentes. Contagem, recibo e incremento histórico ficam na mesma transação.

Ouvintes autenticados usam o ID da conta; anônimos usam um hash HMAC do IP. Não armazenamos IP bruto nos eventos. Pessoas anônimas numa mesma rede podem compartilhar a deduplicação. Trata-se de proteção básica contra repetição, não de prova infalível de audição ou sistema antifraude financeiro.

Reproduções antigas permanecem no contador histórico. Não são convertidas em plays semanais, pois não têm data de escuta. O ranking começará a acumular dados a partir da publicação desta versão. Arquivos locais, faixas privadas e faixas sem áudio não participam.

A migração `035_song_ranking.sql` é aditiva. Os endpoints também criam o esquema no primeiro acesso quando o usuário do banco possui permissão. Configure `SESSION_SECRET` (ou `PLAYBACK_SIGNING_SECRET`) no servidor. Não use uma chave pública ou troque a chave durante uma escuta.

É necessário publicar a API e os frontends na VPS e instalar o APK 1.0.2 para ativar a regra em todos os clientes. APKs anteriores não enviam tickets e deixam de incrementar a contagem. Atualização automática da lista ocorre a cada minuto ou após uma reprodução qualificada.
