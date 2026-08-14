import React from 'react';
import { Play, Pause, Heart, Music, Smartphone } from 'lucide-react';
import { SongItem } from '../types/music';
import { usePlayer } from '../context/PlayerContext';

interface SongCardProps {
  song: SongItem;
  queue?: SongItem[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, queue }) => {
  const { currentSong, isPlaying, playSong, favorites, toggleLike } = usePlayer();

  const isThisPlaying = currentSong?.id === song.id && isPlaying;
  const isLiked = favorites.includes(song.id);

  return (
    <div
      onClick={() => playSong(song, queue)}
      className="group relative bg-[#181818]/60 hover:bg-[#222]/80 backdrop-blur-md border border-white/10 hover:border-[#f5c518]/40 rounded-2xl p-3 flex items-center gap-3 transition-all duration-300 shadow-lg cursor-pointer active:scale-[0.99]"
    >
      {/* Thumbnail with overlay */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-black/50 border border-white/10">
        <img
          src={song.capaUrl || '/images/default-cover.png'}
          alt={song.titulo}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
          }}
        />

        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
            isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
            style={{ backgroundColor: '#f5c518', color: '#121212' }}
          >
            {isThisPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </div>
        </div>

        {/* Badge Indicator if Local File */}
        {song.isLocal && (
          <div className="absolute top-1 left-1 p-0.5 rounded-md bg-black/70 backdrop-blur-md">
            <Smartphone className="w-2.5 h-2.5 text-[#f5c518]" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-white truncate leading-tight group-hover:text-[#f5c518] transition-colors">
          {song.titulo}
        </h4>
        <p className="text-xs text-white/50 truncate font-medium mt-0.5">
          {song.artista}
        </p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/5 text-white/70 border border-white/10 flex items-center gap-1">
            {song.isLocal ? (
              <>
                <Smartphone className="w-2.5 h-2.5 text-[#f5c518]" />
                MP3 Local
              </>
            ) : (
              <>
                <Music className="w-2.5 h-2.5 text-[#f5c518]" />
                {song.genero || 'Portal'}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Right Actions: Favorite Heart */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(song.id);
        }}
        className="p-2 rounded-full text-white/40 hover:text-[#f5c518] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#f5c518] text-[#f5c518]' : ''}`} />
      </button>
    </div>
  );
};
