import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, FolderPlus, Music, Trash2, Play, HardDrive, CheckCircle2 } from 'lucide-react';
import { SongItem } from '../types/music';
import { saveLocalSong, getLocalSongs, deleteLocalSong } from '../services/db';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';

export const LocalSongsView: React.FC = () => {
  const [localSongs, setLocalSongs] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { playSong } = usePlayer();

  useEffect(() => {
    loadSongs();
  }, []);

  async function loadSongs() {
    setLoading(true);
    try {
      const stored = await getLocalSongs();
      setLocalSongs(stored);
    } catch (err) {
      console.error('Erro ao carregar faixas locais:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const audioUrl = URL.createObjectURL(file);
      
      // Clean up title from filename
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = 'Música Local (Seu Aparelho)';

      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        title = parts[1].trim();
      }

      const songItem: SongItem = {
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        titulo: title,
        artista: artist,
        genero: 'Local',
        audioUrl: audioUrl,
        fileBlob: file,
        isLocal: true,
        addedAt: Date.now(),
        capaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
      };

      await saveLocalSong(songItem);
    }

    await loadSongs();
    setImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLocalSong(id);
    await loadSongs();
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5c518]/10 border border-[#f5c518]/30 text-[#f5c518] text-[11px] font-extrabold uppercase tracking-wider mb-1">
          <HardDrive className="w-3.5 h-3.5" />
          Armazenamento Local
        </div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-[#f5c518]" />
          Músicas no Aparelho
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Organize e toque seus arquivos MP3/WAV salvos no smartphone sem subir nada pro servidor.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Card Button */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-5 rounded-3xl bg-gradient-to-r from-[#1c1c1c] via-[#242424] to-[#161616] border-2 border-dashed border-[#f5c518]/40 hover:border-[#f5c518] text-center space-y-3 cursor-pointer group transition-all shadow-xl"
      >
        <div className="w-12 h-12 rounded-full bg-[#f5c518]/15 border border-[#f5c518]/30 text-[#f5c518] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
          <FolderPlus className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-white group-hover:text-[#f5c518] transition-colors">
            {importing ? 'Importando Áudios...' : '+ Adicionar Músicas do Celular'}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Selecione arquivos MP3, WAV ou M4A no armazenamento do seu aparelho.
          </p>
        </div>
      </div>

      {/* Local Songs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
            {localSongs.length} Faixas Salvas no Celular
          </h3>
          {localSongs.length > 0 && (
            <button
              onClick={() => playSong(localSongs[0], localSongs)}
              className="text-xs text-[#f5c518] font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Tocar Todas
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10 text-white/40 text-xs font-medium animate-pulse">
            Carregando biblioteca do dispositivo...
          </div>
        ) : localSongs.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
            <Smartphone className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-sm font-semibold text-white/70">Nenhum arquivo local adicionado ainda</p>
            <p className="text-xs text-white/40">
              Clique no botão acima para adicionar faixas do seu smartphone.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {localSongs.map((song) => (
              <div key={song.id} className="relative group">
                <SongCard song={song} queue={localSongs} />
                <button
                  onClick={(e) => handleDelete(song.id, e)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors z-10 cursor-pointer"
                  title="Remover do aparelho"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
