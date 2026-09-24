import { SongItem, ArtistItem } from '../types/music';

// Portal do Artista Production Domain
export const PORTAL_DOMAIN = 'https://portaldoartista.com';

// Use production API url when in Capacitor/Android or dev proxy.
// Em dev (vite :3002) usa '/api' via proxy; em produção usa domínio absoluto.
const API_BASE = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost:3002')
    ? '/api'
    : `${PORTAL_DOMAIN}/api`);

function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const proto = window.location.protocol;
  return proto === 'capacitor:' || proto === 'ionic:' || (window as any).Capacitor?.isNativePlatform?.() === true;
}

export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return `${PORTAL_DOMAIN}/images/default-cover.png`;
  const trimmed = String(url).trim();
  if (!trimmed) return `${PORTAL_DOMAIN}/images/default-cover.png`;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  // No PWA/web servido pelo mesmo domínio, relativo funciona e evita CORS.
  // No Capacitor nativo (capacitor://localhost) precisa de URL absoluta.
  const needsAbsolute = isNativeCapacitor() || !window.location.origin.includes('portaldoartista.com') && !window.location.origin.includes('localhost');
  if (trimmed.startsWith('/api/uploads/')) {
    return needsAbsolute ? `${PORTAL_DOMAIN}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    const withApi = `/api${trimmed}`;
    return needsAbsolute ? `${PORTAL_DOMAIN}${withApi}` : withApi;
  }
  if (trimmed.startsWith('/')) {
    return needsAbsolute ? `${PORTAL_DOMAIN}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('uploads/')) {
    const withApi = `/api/${trimmed}`;
    return needsAbsolute ? `${PORTAL_DOMAIN}${withApi}` : withApi;
  }
  return needsAbsolute ? `${PORTAL_DOMAIN}/api/uploads/${trimmed}` : `/api/uploads/${trimmed}`;
}

function prettyNameFromSlug(slug?: string | null): string | null {
  if (!slug) return null;
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

type RawArtist = {
  id: string | number;
  name?: string;
  nome?: string;
  slug?: string;
  identifier?: string;
  genero?: string;
  capaUrl?: string;
  fotoUrl?: string;
  musicaCount?: string | number;
  totalMusicas?: string | number;
};

export function mapArtist(raw: RawArtist): ArtistItem {
  const total = Number(raw.totalMusicas ?? raw.musicaCount ?? 0);
  return {
    id: String(raw.id),
    nome: raw.nome || raw.name || 'Artista do Portal',
    genero: raw.genero || 'Sertanejo',
    fotoUrl: normalizeUrl(raw.fotoUrl || raw.capaUrl),
    totalMusicas: Number.isFinite(total) ? total : 0,
    slug: raw.slug || raw.identifier,
  };
}

export async function fetchExploreArtists(): Promise<ArtistItem[]> {
  try {
    const res = await fetch(`${API_BASE}/artists`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar artistas do portal');
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.data ?? [];
    if (Array.isArray(list) && list.length > 0) {
      return (list as RawArtist[]).map(mapArtist);
    }
    return [];
  } catch (err) {
    console.warn('Não foi possível carregar artistas do Portal:', err);
    return [];
  }
}

type RawSong = {
  id: string | number;
  titulo?: string;
  genero?: string;
  subgenero?: string | null;
  compositor?: string | null;
  capaUrl?: string | null;
  mp3Url?: string | null;
  arquivoUrl?: string | null;
  audioUrl?: string | null;
  mp3Path?: string | null;
  duracao?: string | number | null;
  isPrivate?: boolean | null;
  artistaNome?: string | null;
  artistaSlug?: string | null;
  artistaId?: string | number | null;
  artistaFoto?: string | null;
  youtubeUrl?: string | null;
  status?: string | null;
  plays?: string | number | null;
  likes?: string | number | null;
};

export async function fetchExploreSongs(): Promise<SongItem[]> {
  try {
    const [songsRes, artistsRes] = await Promise.all([
      fetch(`${API_BASE}/songs`, { cache: 'no-store' }),
      fetch(`${API_BASE}/artists`, { cache: 'no-store' }).catch(() => null),
    ]);
    if (!songsRes.ok) throw new Error('Falha ao buscar músicas do portal');
    const data = await songsRes.json();
    if (!Array.isArray(data)) return [];

    let artistById = new Map<string, string>();
    let artistBySlug = new Map<string, string>();
    try {
      if (artistsRes && artistsRes.ok) {
        const aData = await artistsRes.json();
        const list = Array.isArray(aData) ? aData : aData?.data ?? [];
        for (const a of list as RawArtist[]) {
          const label = a.nome || a.name;
          if (!label) continue;
          artistById.set(String(a.id), label);
          if (a.slug) artistBySlug.set(a.slug, label);
        }
      }
    } catch {
      // nomes de artista são best-effort
    }

    return (data as RawSong[])
      .filter((song) => {
        if (song.isPrivate) return false;
        const audio = song.mp3Url || song.arquivoUrl || song.audioUrl || song.mp3Path;
        return Boolean(audio);
      })
      .map((song) => {
        const audioRaw = song.mp3Url || song.arquivoUrl || song.audioUrl || song.mp3Path || '';
        const artistaResolvido =
          song.artistaNome ||
          song.compositor ||
          (song.artistaId != null ? artistById.get(String(song.artistaId)) : undefined) ||
          (song.artistaSlug ? artistBySlug.get(song.artistaSlug) : undefined) ||
          prettyNameFromSlug(song.artistaSlug) ||
          'Artista do Portal';
        return {
          id: String(song.id),
          titulo: song.titulo || 'Música Sem Título',
          artista: artistaResolvido,
          compositor: song.compositor ?? undefined,
          genero: song.genero || 'Sertanejo',
          subgenero: song.subgenero ?? undefined,
          capaUrl: normalizeUrl(song.capaUrl),
          audioUrl: normalizeUrl(audioRaw),
          duracao: Number(song.duracao) || 0,
          isLocal: false,
          artistaSlug: song.artistaSlug || undefined,
          artistaId: song.artistaId ?? null,
          artistaFoto: song.artistaFoto ?? null,
          plays: Number(song.plays) || 0,
          likes: Number(song.likes) || 0,
          status: song.status ?? null,
          youtubeUrl: song.youtubeUrl ?? null,
        } as SongItem;
      });
  } catch (err) {
    console.warn('Não foi possível carregar o catálogo do Portal:', err);
    return [];
  }
}

/** Registra 1 play no backend (best-effort, sem bloquear o player). */
export function reportPlay(songId: string | number): void {
  try {
    const id = encodeURIComponent(String(songId).replace(/^local-.*$/, ''));
    if (String(songId).startsWith('local-')) return;
    fetch(`${API_BASE}/songs/${id}/play`, { method: 'POST' }).catch(() => {});
  } catch {
    // ignora
  }
}

/** Curte no backend (1 por IP). Retorna true se contou, false se já tinha curtido/falhou. */
export async function likeRemote(songId: string | number): Promise<boolean> {
  try {
    if (String(songId).startsWith('local-')) return false;
    const res = await fetch(`${API_BASE}/songs/${encodeURIComponent(String(songId))}/like`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export function artistProfileUrl(slug?: string | null): string | null {
  if (!slug) return null;
  return `${PORTAL_DOMAIN}/${slug}`;
}

export function songShareUrl(song: SongItem): string {
  if (song.artistaSlug) return `${PORTAL_DOMAIN}/${song.artistaSlug}`;
  return `${PORTAL_DOMAIN}/play`;
}
