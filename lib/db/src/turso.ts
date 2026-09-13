import { createClient, type Client } from "@libsql/client/web";
export { createClient, type Client };
import { drizzle } from "drizzle-orm/libsql";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config({ path: "../../../.env" });
dotenv.config({ path: "../.env" });

export interface TursoClientConfig {
  url?: string;
  authToken?: string;
}

/**
 * Checks whether Turso DB credentials (URL and Token) are configured in the environment.
 */
export function isTursoConfigured(): boolean {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL;
  const token = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
  return Boolean(url && token);
}

/**
 * Creates a new LibSQL client for Turso DB.
 * Uses HTTP/WebSockets fetch under the hood, compatible with Node.js, Deno Deploy, and Edge workers.
 */
export function createTursoClient(config?: TursoClientConfig): Client {
  const url = config?.url || process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL;
  const authToken = config?.authToken || process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error(
      "Turso URL not found! Please set TURSO_DATABASE_URL (e.g. libsql://your-db-org.turso.io) in your .env"
    );
  }

  return createClient({
    url,
    authToken: authToken || "",
  });
}

let _tursoClient: Client | null = null;

/**
 * Returns a shared singleton LibSQL client instance.
 */
export function getTursoClient(): Client {
  if (!_tursoClient) {
    _tursoClient = createTursoClient();
  }
  return _tursoClient;
}

let _tursoDb: ReturnType<typeof drizzle> | null = null;

/**
 * Returns a Drizzle ORM instance connected to Turso DB.
 */
export function getTursoDb(customSchema?: Record<string, unknown>) {
  if (!_tursoDb) {
    const client = getTursoClient();
    _tursoDb = customSchema ? drizzle(client, { schema: customSchema }) : drizzle(client);
  }
  return _tursoDb;
}

/**
 * Turso SQLite schema DDL statements for all Portal do Artista tables.
 * Used during automatic migration or initialization on Turso DB.
 */
export const TURSO_SCHEMA_DDL = [
  // Artistas
  `CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    documento TEXT,
    doc_tipo TEXT,
    doc_tipo_documento TEXT,
    doc_numero TEXT,
    doc_pais TEXT,
    password TEXT NOT NULL,
    profissao TEXT,
    contato TEXT,
    instagram TEXT,
    tiktok TEXT,
    spotify TEXT,
    capa_url TEXT,
    banner_url TEXT,
    biografia TEXT,
    cidade TEXT,
    genero TEXT,
    fonte TEXT DEFAULT 'Arial',
    cor TEXT DEFAULT '#ffffff',
    layout TEXT,
    player TEXT DEFAULT 'Padrão',
    player_gradient TEXT,
    player_cor TEXT,
    card_style TEXT DEFAULT 'default',
    vip_senha TEXT DEFAULT '',
    plano TEXT NOT NULL DEFAULT 'free',
    plano_ativo INTEGER NOT NULL DEFAULT 1,
    asaas_customer_id TEXT,
    musica_count REAL NOT NULL DEFAULT 0,
    limite_musicas REAL NOT NULL DEFAULT 2,
    personalizacao_percent REAL NOT NULL DEFAULT 10,
    ai_queries_count INTEGER NOT NULL DEFAULT 0,
    ai_queries_reset_at TEXT,
    ai_music_queries_count INTEGER NOT NULL DEFAULT 0,
    ai_music_extra_credits INTEGER NOT NULL DEFAULT 0,
    can_post_articles INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_artists_email ON artists(email)`,
  `CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug)`,

  // Músicas
  `CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista_id TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    genero TEXT NOT NULL,
    subgenero TEXT,
    compositor TEXT,
    letra TEXT,
    edicao TEXT,
    distribuicao TEXT,
    associacao TEXT,
    status TEXT NOT NULL DEFAULT 'Disponível',
    preco_x REAL,
    preco_y REAL,
    capa_path TEXT,
    mp3_path TEXT,
    youtube_url TEXT,
    tipo_midia TEXT NOT NULL DEFAULT 'audio',
    is_vip INTEGER NOT NULL DEFAULT 0,
    vip_code TEXT,
    is_private INTEGER NOT NULL DEFAULT 0,
    destaque INTEGER NOT NULL DEFAULT 0,
    likes REAL NOT NULL DEFAULT 0,
    plays REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_songs_artista_id ON songs(artista_id)`,
  `CREATE INDEX IF NOT EXISTS idx_songs_genero ON songs(genero)`,

  // Planos
  `CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    preco REAL NOT NULL,
    limite_musicas REAL NOT NULL,
    personalizacao_percent REAL NOT NULL,
    descricao TEXT,
    frase_efeito TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    can_stream INTEGER NOT NULL DEFAULT 1,
    can_sell INTEGER NOT NULL DEFAULT 1,
    can_customize INTEGER NOT NULL DEFAULT 1,
    can_analytics INTEGER NOT NULL DEFAULT 0,
    can_verified INTEGER NOT NULL DEFAULT 0,
    can_priority_support INTEGER NOT NULL DEFAULT 0,
    can_distribute INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Interesses / Notificações
  `CREATE TABLE IF NOT EXISTS interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    mensagem TEXT,
    contratar_show INTEGER NOT NULL DEFAULT 0,
    reservar_musica INTEGER NOT NULL DEFAULT 0,
    agendar_reuniao INTEGER NOT NULL DEFAULT 0,
    lido INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_interests_song_id ON interests(song_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interests_lido ON interests(lido)`,

  // Assinaturas
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista_id TEXT NOT NULL,
    plano_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    asaas_subscription_id TEXT,
    asaas_customer_id TEXT,
    valor REAL NOT NULL,
    ciclo TEXT NOT NULL DEFAULT 'MONTHLY',
    proxima_cobranca TEXT,
    coupon_code TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_artista_id ON subscriptions(artista_id)`,

  // Cupons
  `CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    desconto_percent REAL NOT NULL,
    valido_ate TEXT,
    max_usos INTEGER,
    usos_count INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Configurações do App
  `CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Configurações de Sistema
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  // Demos de Música com IA (Vivi Studio)
  `CREATE TABLE IF NOT EXISTS ai_music_demos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    lyrics TEXT NOT NULL,
    audio_url TEXT,
    replicate_id TEXT,
    status TEXT NOT NULL DEFAULT 'generating',
    cost_credits INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ai_music_demos_artista ON ai_music_demos(artista_id)`,

  // Playlists
  `CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    artista_id TEXT,
    is_public INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Galerias
  `CREATE TABLE IF NOT EXISTS galleries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS gallery_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    foto_url TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    legenda TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Gêneros e Cidades
  `CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    estado TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Métricas, Engajamento e CRM
  `CREATE TABLE IF NOT EXISTS audicoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    artista_id TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS song_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    mensagem TEXT,
    lido INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    data TEXT NOT NULL,
    local TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    descricao TEXT,
    link_ingressos TEXT,
    artista_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS custos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    categoria TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    origem TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Blog / Artigos
  `CREATE TABLE IF NOT EXISTS article_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    category_id INTEGER,
    author_id INTEGER,
    published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Co-compositores
  `CREATE TABLE IF NOT EXISTS song_composers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    documento TEXT,
    percentual REAL NOT NULL DEFAULT 0,
    associacao TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Banners CTA & Feedbacks
  `CREATE TABLE IF NOT EXISTS cta_banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    link_url TEXT NOT NULL,
    link_texto TEXT NOT NULL DEFAULT 'Saiba mais',
    imagem_url TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    posicao TEXT NOT NULL DEFAULT 'home_top',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS exit_feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista_id INTEGER,
    motivo TEXT NOT NULL,
    comentario TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ajuda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'geral',
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Sessões no Turso (compatível com express-session no Edge)
  `CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire TEXT NOT NULL
  )`
];
