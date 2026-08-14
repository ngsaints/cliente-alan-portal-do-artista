import React, { useState, useEffect } from 'react';
import { Search, Compass, Music, Tag, Filter } from 'lucide-react';
import { SongItem, ArtistItem } from '../types/music';
import { fetchExploreSongs, fetchExploreArtists } from '../services/portalApi';
import { SongCard } from '../components/SongCard';

export const ExploreView: React.FC = () => {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Todos');

  const genres = ['Todos', 'Sertanejo', 'Vaneira', 'Piseiro', 'Forró', 'Pop/Rock'];

  useEffect(() => {
    async function loadData() {
      const [sData, aData] = await Promise.all([
        fetchExploreSongs(),
        fetchExploreArtists(),
      ]);
      setSongs(sData);
      setArtists(aData);
    }
    loadData();
  }, []);

  const filteredSongs = songs.filter((song) => {
    const matchesQuery =
      song.titulo.toLowerCase().includes(query.toLowerCase()) ||
      song.artista.toLowerCase().includes(query.toLowerCase()) ||
      (song.compositor && song.compositor.toLowerCase().includes(query.toLowerCase()));

    const matchesGenre =
      selectedGenre === 'Todos' ||
      (song.genero && song.genero.toLowerCase() === selectedGenre.toLowerCase());

    return matchesQuery && matchesGenre;
  });

  return (
    <div className="space-y-5 pb-28">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-[#f5c518]" />
          Explorar Músicas & Artistas
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Busque composições e conheça quem tá fazendo sucesso no Portal.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por música, artista ou compositor..."
          className="w-full bg-[#181818]/90 border border-white/15 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] transition-all"
        />
      </div>

      {/* Filter Genre Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {genres.map((g) => {
          const isSelected = selectedGenre === g;
          return (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#f5c518] text-black shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* Results Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/40">
          {filteredSongs.length} Resultados Encontrados
        </h3>

        {filteredSongs.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
            <Music className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-sm font-semibold text-white/70">Nenhuma música encontrada</p>
            <p className="text-xs text-white/40">Tente buscar por outro termo ou gênero.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSongs.map((song) => (
              <SongCard key={song.id} song={song} queue={filteredSongs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
