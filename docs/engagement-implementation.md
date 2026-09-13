# Acompanhamento e ativação dos artistas

Implementação local; não aplicada ao banco de produção.

## Ativação

1. Aplicar `026_artist_engagement.sql` pelo procedimento de migração existente antes de publicar a API.
2. Publicar API e frontend juntos.
3. Conferir, com artista de teste, atividade no dashboard, cópia de link e visita pública em outra sessão. Conferir resultados em Admin > Artistas.
4. E-mails permanecem desligados. Para habilitar após validar remetente Resend e `portal_url`, configurar `REACTIVATION_EMAILS_ENABLED=true` no servidor e reiniciar a API. Não habilitar antes de revisar destinatários e conteúdo.

## Regras

- Última atividade é registrada ao abrir o dashboard, retornar à aba e a cada cinco minutos com a aba visível. Não representa interação contínua nem histórico anterior à instalação.
- Artistas sem observações aparecem como “Sem histórico”.
- Inativo: 14 dias sem atividade registrada. Atenção em plano pago: 30 dias. Trata-se de um indicador operacional, não previsão estatística de cancelamento.
- Número de músicas no novo painel vem da tabela de músicas, não do contador de limite do plano.
- Links copiados: apenas cópias bem-sucedidas dos botões de música e perfil no dashboard. Não comprova envio a terceiros.
- Visitas: carregamentos do perfil público por slug; visitas do próprio artista autenticado são ignoradas. Não são visitantes únicos e não há atribuição a uma campanha/link específico.
- Rotas de eventos têm limite de requisições. Atividade e cópia exigem sessão e usam o artista da sessão; relatório exige sessão administrativa.
- Reativação: execução horária, até 50 candidatos por execução, artistas com atividade entre 14 e 90 dias atrás, no máximo um envio em sete dias. Registro persistente e chave única semanal evitam duplicação entre processos. Erros ou resultados desconhecidos ficam registrados, sem repetição imediata.
- CRM reaproveitado como calendário e suporte. Esta cópia não contém gestor de tarefas independente.
- Nenhuma geração musical ou saldo de créditos foi adicionado. A Vivi mantém seu funcionamento existente.

## Verificação operacional pendente

Validar migração em PostgreSQL de teste, sessão autenticada e interface com dados reais. Validar entrega Resend antes de ativar envios. O código não habilita nem dispara e-mails em ambiente sem a configuração explícita.

## Validação local

- TypeScript: bibliotecas, API e frontend passaram.
- Build Vite passou (aviso de tamanho do bundle já monolítico).
- `artifacts/api-server/engagement.test.ts`: testes HTTP com banco simulado para autenticação, validação, propriedade da sessão, atividade, visitas e falha de banco. A rotina de e-mails desligada também é verificada.
- Os testes não substituem a aplicação da migração em PostgreSQL nem um teste de entrega do provedor de e-mail.
