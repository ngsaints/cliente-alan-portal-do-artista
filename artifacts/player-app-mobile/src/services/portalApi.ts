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
      return data.map((song: any) => ({
        id: String(song.id),
        titulo: song.titulo || 'Música Sem Título',
        artista: song.artistaNome || song.compositor || 'Artista do Portal',
        compositor: song.compositor,
        genero: song.genero || 'Sertanejo',
        subgenero: song.subgenero,
        capaUrl: normalizeUrl(song.capaUrl),
        audioUrl: normalizeUrl(song.arquivoUrl || song.audioUrl),
        duracao: Number(song.duracao) || 180,
        isLocal: false,
      }));
    }
    return getFallbackSongs();
  } catch (err) {
    console.warn('Usando catálogo inicial do Portal do Artista:', err);
    return getFallbackSongs();
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
    return getFallbackArtists();
  } catch (err) {
    console.warn('Usando catálogo inicial de artistas do Portal:', err);
    return getFallbackArtists();
  }
}

function getFallbackSongs(): SongItem[] {
  return [
    {
      id: 'portal-1',
      titulo: 'Boate Azul (Versão Exclusiva)',
      artista: 'Alan Ribeiro',
      compositor: 'Alan Ribeiro',
      genero: 'Sertanejo',
      subgenero: 'Modão / Universitário',
      capaUrl: `${PORTAL_DOMAIN}/images/hero_mockup.jpg`,
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=acoustic-guitars-acoustic-guitar-loop-110829.mp3',
      duracao: 195,
      isLocal: false,
    },
    {
      id: 'portal-2',
      titulo: 'Noite de Rodeio',
      artista: 'Alan Ribeiro',
      compositor: 'Alan Ribeiro',
      genero: 'Sertanejo',
      subgenero: 'Bruto',
      capaUrl: `${PORTAL_DOMAIN}/images/default-cover.png`,
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7351a.mp3?filename=soft-inspiring-acoustic-10255.mp3',
      duracao: 210,
      isLocal: false,
    },
    {
      id: 'portal-3',
      titulo: 'Amor de Interior',
      artista: 'Gabriel & Mateus',
      compositor: 'Gabriel Santos',
      genero: 'Sertanejo',
      subgenero: 'Romântico',
      capaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=folk-acoustic-guitar-loop-10023.mp3',
      duracao: 180,
      isLocal: false,
    },
    {
      id: 'portal-4',
      titulo: 'Vaneira do Sul',
      artista: 'Os Pioneiros',
      compositor: 'Os Pioneiros',
      genero: 'Vaneira',
      subgenero: 'Gaúcha',
      capaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591035b.mp3?filename=energetic-upbeat-pop-112194.mp3',
      duracao: 165,
      isLocal: false,
    },
  ];
}

function getFallbackArtists(): ArtistItem[] {
  return [
    {
      id: 'artist-alan',
      nome: 'Alan Ribeiro',
      genero: 'Sertanejo',
      fotoUrl: `${PORTAL_DOMAIN}/images/hero_mockup.jpg`,
      totalMusicas: 12,
      slug: 'alan-ribeiro',
    },
    {
      id: 'artist-gabriel',
      nome: 'Gabriel & Mateus',
      genero: 'Sertanejo Universitário',
      fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
      totalMusicas: 8,
      slug: 'gabriel-mateus',
    },
    {
      id: 'artist-pioneiros',
      nome: 'Os Pioneiros do Sul',
      genero: 'Vaneira',
      fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80',
      totalMusicas: 15,
      slug: 'pioneiros-do-sul',
    },
  ];
}
