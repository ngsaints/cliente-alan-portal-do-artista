export interface SongItem {
  id: string;
  titulo: string;
  artista: string;
  compositor?: string;
  genero?: string;
  subgenero?: string;
  capaUrl?: string;
  audioUrl: string;
  duracao?: number;
  isLocal?: boolean;
  fileBlob?: Blob;
  addedAt?: number;
  artistaSlug?: string;
  artistaId?: string | number | null;
  artistaFoto?: string | null;
  plays?: number;
  likes?: number;
  status?: string | null;
  youtubeUrl?: string | null;
}

export interface ArtistItem {
  id: string;
  nome: string;
  genero?: string;
  fotoUrl?: string;
  totalMusicas?: number;
  slug?: string;
}

export interface PlaylistItem {
  id: string;
  nome: string;
  descricao?: string;
  capaUrl?: string;
  songIds: string[];
  createdAt: number;
}
