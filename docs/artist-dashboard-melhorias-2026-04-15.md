# 🎛️ Melhorias do Dashboard do Artista — 15/04/2026

> Sessão de melhorias no painel do artista (`/artista/dashboard`)

---

## Correções Críticas (Backend)

### 1. `artistaId` não era salvo nas músicas

**Arquivo**: `artifacts/api-server/src/routes/artist-songs.ts`

O endpoint `POST /artist/:artistId/songs` criava a música sem o campo `artistaId`, fazendo com que as músicas não aparecessem no perfil do artista.

```diff
  const [song] = await db
    .insert(songsTable)
    .values({
+     artistaId: artistId,
      titulo,
      descricao,
      ...
    })
```

### 2. `PUT /api/artists/profile` agora aceita upload de arquivos

**Arquivo**: `artifacts/api-server/src/routes/artists.ts`

Antes: endpoint só aceitava `application/json`, sem suporte a upload de capa/banner.

Agora: aceita `multipart/form-data` com campos `capaFile` e `bannerFile`, além dos campos de texto. Upload funciona tanto para storage local quanto Cloudflare R2.

Campos aceitos:
- `name`, `profissao`, `cidade`, `instagram`, `tiktok`, `spotify`, `contato`
- `fonte`, `cor`, `layout`, `player` (personalização)
- `capaFile` (upload de foto de perfil)
- `bannerFile` (upload de banner)

### 3. `GET /api/artists/status` retorna mais campos

**Arquivo**: `artifacts/api-server/src/routes/artists.ts`

Campos adicionados na resposta:
- `slug` — URL amigável do artista
- `capaUrl` — foto de perfil
- `bannerUrl` — banner do perfil
- `contato` — telefone/WhatsApp
- `fonte` — fonte personalizada
- `cor` — cor personalizada
- `layout` — tipo de layout
- `player` — tipo de player

---

## Correções de Fluxo (Frontend)

### 4. Redirect pós-cadastro → Dashboard

**Arquivo**: `artifacts/alan-ribeiro-catalog/src/pages/Cadastro.tsx`

Antes: após cadastro, redirecionava para `/artista/{id}` (página pública).

Agora: redireciona para `/artista/dashboard`, para que o artista já acesse seu painel.

### 5. totalPlays e totalLikes reais

**Arquivo**: `artifacts/alan-ribeiro-catalog/src/pages/ArtistDashboard.tsx`

Antes: `totalPlays` era hardcoded para `0`.

Agora: agrega os campos `plays` e `likes` de todas as músicas do artista:

```ts
totalPlays: mySongs.reduce((acc, s) => acc + (Number(s.plays) || 0), 0),
totalLikes: mySongs.reduce((acc, s) => acc + (Number(s.likes) || 0), 0),
```

---

## Novas Funcionalidades do Dashboard

### 6. Upload de Foto de Perfil e Banner

**Tab "Meu Perfil"** agora tem seção "Fotos do Perfil" com:
- Preview da foto de perfil atual (circular)
- Preview do banner atual (retangular)
- Input de arquivo para trocar cada um
- Indicador do arquivo selecionado ("salve para aplicar")

### 7. Campo Contato (WhatsApp)

Novo campo `contato` no formulário de perfil, com placeholder `(21) 99999-9999`.

### 8. Link do Perfil Público

No formulário de perfil, exibe o link público do artista:
```
Seu link: https://94.141.97.95/a/artist-slug
```

No header do dashboard, botão "Meu Perfil" que abre o perfil público em nova aba.

### 9. Aba "Personalização" (nova tab)

Nova tab com 4 campos de customização:

| Campo | Tipo | Opções |
|-------|------|--------|
| **Fonte** | Select | Arial, Inter, Roboto, Poppins, Open Sans, Montserrat, Lato, Playfair Display, Oswald, Raleway |
| **Cor do Perfil** | Color picker + text | Hex (ex: `#ffffff`) |
| **Layout** | Select | Padrão, Gradiente, Minimalista, Escuro |
| **Tipo de Player** | Select | Padrão, Minimalista, Lista, Waveform |

Inclui **preview em tempo real** mostrando como o perfil ficará com as configurações escolhidas.

### 10. Botão Deletar Música

Cada música na listagem agora tem um botão de lixeira (aparece no hover). Ao clicar:
- Confirmação "Tem certeza que deseja excluir?"
- Chama `DELETE /api/artist/:artistId/songs/:songId`
- Loading spinner enquanto exclui
- Atualiza a lista automaticamente

### 11. Contadores de Likes e Plays por Música

Cada card de música (tanto no dashboard quanto na listagem) exibe:
- ❤️ número de likes
- 📈 número de plays

### 12. Toast de Sucesso

Ao salvar perfil ou personalização, aparece uma notificação fixa no canto superior direito: "Salvo com sucesso!" (desaparece após 3 segundos).

### 13. Ações Rápidas no Dashboard

Nova seção no tab "Dashboard" com botões de atalho:
- **Adicionar Música** → vai para tab "Minhas Músicas"
- **Editar Perfil** → vai para tab "Meu Perfil"
- **Personalizar** → vai para tab "Personalização"
- **Ver Meu Perfil** → abre perfil público em nova aba

### 14. Cards de Estatísticas Expandidos

Dashboard agora tem 4 cards em vez de 3:
- Total de Músicas (com limite)
- Total de Plays
- **Total de Likes** (novo)
- Conteúdo VIP

---

## Estrutura do Dashboard (Após Mudanças)

```
/artista/dashboard
├── Header
│   ├── "Painel do Artista" + nome
│   ├── Botão "Meu Perfil" (link público)
│   └── Botão "Sair"
├── Tabs
│   ├── Dashboard       → Stats + Ações Rápidas + Músicas Recentes
│   ├── Minhas Músicas  → Listagem + Upload + Delete
│   ├── Meu Perfil      → Fotos + Info + Link público
│   ├── Personalização  → Fonte + Cor + Layout + Player + Preview
│   ├── Meu Plano       → Plano atual + Upgrade
│   └── Interesses      → Leads/contatos recebidos
└── Toast de sucesso (global)
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `artifacts/api-server/src/routes/artist-songs.ts` | Adicionado `artistaId` no insert de música |
| `artifacts/api-server/src/routes/artists.ts` | `PUT /artists/profile` aceita multipart + campos de personalização; `GET /artists/status` retorna mais campos |
| `artifacts/alan-ribeiro-catalog/src/pages/ArtistDashboard.tsx` | Reescrito com novas tabs, upload de fotos, personalização, delete de música, stats reais, ações rápidas, toast |
| `artifacts/alan-ribeiro-catalog/src/pages/Cadastro.tsx` | Redirect pós-cadastro para `/artista/dashboard` |

---

## Backlog Atualizado

Itens do backlog original que foram resolvidos nesta sessão:

- [x] Painel do artista (dashboard próprio) — **completo**
- [x] Upload de músicas pelo artista — **funcional**
- [x] Perfil do artista com personalização real — **implementado**
- [x] Slug de URL customizado — **já existia**
- [x] Contador de plays — **agregado no dashboard**
- [x] Sistema de likes/compartilhar — **likes visíveis no dashboard**

Itens ainda pendentes:

- [ ] Recuperação de senha
- [ ] Editar música existente (PUT)
- [ ] OG tags / SEO
- [ ] Sistema de email
- [ ] QR Code para compartilhar perfil
