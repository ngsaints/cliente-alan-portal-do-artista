import { SongItem, ArtistItem } from '../types/music';

// Portal do Artista Production Domain
export const PORTAL_DOMAIN = 'https://portaldoartista.com';

// Use production API url when in Capacitor/Android or dev proxy
const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.origin.includes('localhost:3002') 
    ? '/api' 
    : `${PORTAL_DOMAIN}/api`);

export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return `${PORTAL_DOMAIN}/images/default-cover.png`;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/api/uploads/')) {
    return `${PORTAL_DOMAIN}${url}`;
  }
  if (url.startsWith('/uploads/')) {
    return `${PORTAL_DOMAIN}/api${url}`;
  }
  if (url.startsWith('/')) {
    return `${PORTAL_DOMAIN}${url}`;
  }
  return `${PORTAL_DOMAIN}/api/uploads/${url}`;
}

export async function fetchExploreSongs(): Promise<SongItem[]> {
  try {
    // Endpoints públicos de músicas do Portal do Artista
    const res = await fetch(`${API_BASE}/songs`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar músicas do portal');
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      return data
        .filter((song: any) => !song.isPrivate && (song.mp3Url || song.arquivoUrl || song.audioUrl || song.mp3Path))
        .map((song: any) => ({
          id: String(song.id),
          titulo: song.titulo || 'Música Sem Título',
          artista: song.artistaNome || song.compositor || 'Compositor do Portal',
          compositor: song.compositor,
          genero: song.genero || 'Sertanejo',
          subgenero: song.subgenero,
          capaUrl: normalizeUrl(song.capaUrl),
          audioUrl: normalizeUrl(song.mp3Url || song.arquivoUrl || song.audioUrl || song.mp3Path),
          duracao: Number(song.duracao) || 0,
          isLocal: false,
          artistaSlug: song.artistaSlug || undefined,
        }));
    }
    return [];
  } catch (err) {
    console.warn('Não foi possível carregar o catálogo do Portal:', err);
    return [];
  }
}

export async function fetchExploreArtists(): Promise<ArtistItem[]> {
  try {
    // Endpoint público de artistas do Portal do Artista
    const res = await fetch(`${API_BASE}/artists`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar artistas do portal');
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      return data.map((artist: any) => ({
        id: String(artist.id),
        nome: artist.nome || artist.name || 'Artista do Portal',
        genero: artist.genero || 'Sertanejo',
        fotoUrl: normalizeUrl(artist.fotoUrl || artist.capaUrl),
        totalMusicas: artist.totalMusicas || 5,
        slug: artist.slug || artist.identifier,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Não foi possível carregar artistas do Portal:', err);
    return [];
  }
}

export function artistProfileUrl(slug?: string | null): string | null {
  if (!slug) return null;
  return `${PORTAL_DOMAIN}/${slug}`;
}
