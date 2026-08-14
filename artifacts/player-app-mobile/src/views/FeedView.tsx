import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Play, Music, UserCheck, Smartphone } from 'lucide-react';
import { SongItem, ArtistItem } from '../types/music';
import { fetchExploreSongs, fetchExploreArtists } from '../services/portalApi';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';

export const FeedView: React.FC = () => {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong } = usePlayer();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [sData, aData] = await Promise.all([
        fetchExploreSongs(),
        fetchExploreArtists(),
      ]);
      setSongs(sData);
      setArtists(aData);
      setLoading(false);
    }
    loadData();
  }, []);

  const featuredSong = songs[0];

  return (
    <div className="space-y-6 pb-28">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5c518]/10 border border-[#f5c518]/30 text-[#f5c518] text-[11px] font-extrabold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Portal do Artista Player
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Descubra Talentos Independentes
          </h1>
        </div>
      </div>

      {/* Featured Banner Hero */}
      {featuredSong && (
        <div
          onClick={() => playSong(featuredSong, songs)}
          className="relative rounded-3xl overflow-hidden p-5 bg-gradient-to-r from-[#1f1a05] via-[#2d2208] to-[#121212] border border-[#f5c518]/30 shadow-[0_10px_30px_rgba(245,197,24,0.15)] cursor-pointer group hover:border-[#f5c518]/60 transition-all"
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/20 shadow-xl">
              <img
                src={featuredSong.capaUrl || '/images/default-cover.png'}
                alt={featuredSong.titulo}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#f5c518] text-black inline-block mb-1">
                🔥 DESTAQUE DA SEMANA
              </span>
              <h3 className="text-base font-extrabold text-white truncate">
                {featuredSong.titulo}
              </h3>
              <p className="text-xs text-white/60 truncate">
                {featuredSong.artista}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5c518] text-black text-xs font-bold hover:scale-105 transition-transform">
                <Play className="w-3.5 h-3.5 fill-current" />
                Ouvir Agora
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Artists Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#f5c518]" />
            Artistas do Portal
          </h2>
          <span className="text-xs text-[#f5c518] font-bold">Ver todos</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="flex-shrink-0 w-28 text-center space-y-2 group cursor-pointer"
            >
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#f5c518]/30 group-hover:border-[#f5c518] transition-all shadow-lg p-0.5 bg-[#181818]">
                <img
                  src={artist.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80'}
                  alt={artist.nome}
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80';
                  }}
                />
              </div>
              <h4 className="text-xs font-bold text-white truncate group-hover:text-[#f5c518] transition-colors">
                {artist.nome}
              </h4>
              <p className="text-[10px] text-white/50 truncate">
                {artist.genero}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Songs Feed List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#f5c518]" />
            Músicas em Alta no Portal
          </h2>
          <span className="text-xs text-white/50">{songs.length} faixas</span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white/40 text-xs font-medium animate-pulse">
            Carregando catálogo do Portal do Artista...
          </div>
        ) : (
          <div className="space-y-2.5">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} queue={songs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
