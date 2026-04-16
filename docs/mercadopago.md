# 💰 Integração MercadoPago

> Meio de pagamento principal do Portal do Artista

---

## Objetivo

Permitir que artistas assinem planos pagos (Básico, Intermediário, Pro, Premium) usando **MercadoPago** como gateway de pagamento.

---

## Modalidades de Pagamento

### 1. Checkout Pro (Recomendado)
- Redireciona para página segura do MercadoPago
- Suporta: cartão, boleto, PIX
- Confirmação automática via webhook
- Ideal para assinaturas mensais

### 2. Checkout Transparente
- Pagamento dentro da plataforma (sem redirecionamento)
- Melhor UX, mas requer mais implementação
- Cartão + PIX direto no frontend

---

## Planos e Preços

| Plano | Preço/mês | Músicas | Personalização |
|-------|-----------|---------|----------------|
| 🆓 Free | R$0 | 2 | 10% |
| 🎸 Básico | R$19,90 | 10 | 30% |
| 🎵 Intermediário | R$39,90 | 25 | 50% |
| 🎤 Profissional | R$79,90 | 50 | 80% |
| ⭐ Premium | R$149,90 | 100 | 100% |

---

## Fluxo de Assinatura

```
1. Artista escolhe plano → /planos
2. Clica em "Assinar" → backend cria preferência no MP
3. Redireciona para checkout do MP
4. Artista paga (PIX, cartão, boleto)
5. Webhook notifica backend → ativa plano
6. Artista ganha acesso às features do plano
```

---

## Webhooks Necessários

| Evento | Ação |
|--------|------|
| `payment.created` | Ativar plano do artista |
| `payment.updated` | Verificar status (aprovado/recusado) |
| `subscription.updated` | Atualizar detalhes da assinatura |

---

## Credenciais (pendentes)

```env
# MercadoPago (obter em https://www.mercadopago.com.br/developers)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx
MERCADOPAGO_WEBHOOK_URL=https://94.141.97.95/api/webhooks/mercadopago
```

---

## Backlog de Implementação

### Backend (API Server)
- [ ] Instalar SDK MercadoPago (`mercadopago`)
- [ ] Criar endpoint `POST /api/payments/create-preference`
- [ ] Criar endpoint `POST /api/webhooks/mercadopago`
- [ ] Criar endpoint `GET /api/payments/status/:paymentId`
- [ ] Criar endpoint `GET /api/payments/subscription/:artistId`
- [ ] Lógica de ativação automática do plano após pagamento
- [ ] Lógica de cancelamento/expiração

### Frontend
- [ ] Página `/planos` com cards dos planos + botão "Assinar"
- [ ] Integração com Checkout Pro do MP (redirect)
- [ ] Página `/minha-assinatura` (status, histórico, cancelar)
- [ ] Badge de plano ativo no perfil do artista
- [ ] Notificações de renovação/expiração

### Banco
- [ ] Tabela `subscriptions` (artista, plano, status, próximo vencimento)
- [ ] Campo `mercadopago_subscription_id` em `artists`
- [ ] Campo `ultimo_pagamento` em `artists`

### Admin
- [ ] Ver assinaturas ativas no painel admin
- [ ] Gerenciar planos (editar preços)
- [ ] Ver histórico de pagamentos

---

## Links Úteis

- **Docs MP**: https://www.mercadopago.com.br/developers/pt/docs
- **Checkout Pro**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/introduction
- **Webhooks**: https://www.mercadopago.com.br/developers/pt/docs/notifications/ipn
- **SDK Node.js**: https://github.com/mercadopago/sdk-nodejs
- **Painel Desenvolvedor**: https://www.mercadopago.com.br/developers/panel
