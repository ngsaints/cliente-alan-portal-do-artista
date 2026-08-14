import { SongItem, ArtistItem } from '../types/music';

// Portal do Artista API base URL fallback
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchExploreSongs(): Promise<SongItem[]> {
  try {
    const res = await fetch(`${API_BASE}/songs/public?limit=30`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar músicas do portal');
    const data = await res.json();

    if (Array.isArray(data)) {
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
    return [];
  } catch (err) {
    console.warn('Usando dados de demonstração para músicas do portal:', err);
    return getFallbackSongs();
  }
}

export async function fetchExploreArtists(): Promise<ArtistItem[]> {
  try {
    const res = await fetch(`${API_BASE}/artists/public?limit=20`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar artistas do portal');
    const data = await res.json();

    if (Array.isArray(data)) {
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
    console.warn('Usando dados de demonstração para artistas:', err);
    return getFallbackArtists();
  }
}

function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '/images/default-cover.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return url;
  }
  return `/api/uploads/${url}`;
}

function getFallbackSongs(): SongItem[] {
  return [
    {
      id: 'demo-1',
      titulo: 'Boate Azul (Remix Sertanejo)',
      artista: 'Alan Ribeiro',
      compositor: 'Alan Ribeiro',
      genero: 'Sertanejo',
      subgenero: 'Modão / Universitario',
      capaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=acoustic-guitars-acoustic-guitar-loop-110829.mp3',
      duracao: 195,
      isLocal: false,
    },
    {
      id: 'demo-2',
      titulo: 'Evidências do Amor',
      artista: 'Gabriel & Mateus',
      compositor: 'Gabriel Santos',
      genero: 'Sertanejo',
      subgenero: 'Romântico',
      capaUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7351a.mp3?filename=soft-inspiring-acoustic-10255.mp3',
      duracao: 210,
      isLocal: false,
    },
    {
      id: 'demo-3',
      titulo: 'Vaneira do Interior',
      artista: 'Os Pioneiros do Sul',
      compositor: 'Os Pioneiros',
      genero: 'Vaneira',
      subgenero: 'Gaúcha',
      capaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=folk-acoustic-guitar-loop-10023.mp3',
      duracao: 180,
      isLocal: false,
    },
    {
      id: 'demo-4',
      titulo: 'Pisadinha Sem Enrolação',
      artista: 'Thiago & Banda',
      compositor: 'Thiago',
      genero: 'Piseiro',
      subgenero: 'Forró',
      capaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591035b.mp3?filename=energetic-upbeat-pop-112194.mp3',
      duracao: 165,
      isLocal: false,
    },
  ];
}

function getFallbackArtists(): ArtistItem[] {
  return [
    {
      id: 'artist-1',
      nome: 'Alan Ribeiro',
      genero: 'Sertanejo',
      fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
      totalMusicas: 12,
      slug: 'alan-ribeiro',
    },
    {
      id: 'artist-2',
      nome: 'Gabriel & Mateus',
      genero: 'Sertanejo Universitário',
      fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
      totalMusicas: 8,
      slug: 'gabriel-mateus',
    },
    {
      id: 'artist-3',
      nome: 'Os Pioneiros do Sul',
      genero: 'Vaneira',
      fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80',
      totalMusicas: 15,
      slug: 'pioneiros-do-sul',
    },
  ];
}
