import React, { useState, useEffect } from 'react';
import { Library, Plus, ListMusic, Heart, Music, ChevronLeft, Trash2, Play } from 'lucide-react';
import { SongItem, PlaylistItem } from '../types/music';
import { getPlaylists, savePlaylist, deletePlaylist, getLocalSongs, getFavorites, updatePlaylistSongs } from '../services/db';
import { fetchExploreSongs } from '../services/portalApi';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';

export const LibraryView: React.FC = () => {
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [allSongs, setAllSongs] = useState<SongItem[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<SongItem[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists'>('favorites');
  const [openPlaylist, setOpenPlaylist] = useState<PlaylistItem | null>(null);
  const [showAddSongs, setShowAddSongs] = useState(false);

  useEffect(() => {
    loadLibraryData();
  }, []);

  async function loadLibraryData() {
    try {
      const [pls, localS, portalS, favIds] = await Promise.all([
        getPlaylists(),
        getLocalSongs(),
        fetchExploreSongs(),
        getFavorites(),
      ]);

      setPlaylists(pls);
      const catalog = [...localS, ...portalS];
      setAllSongs(catalog);
      setFavoriteSongs(catalog.filter((s) => favIds.includes(s.id)));
      if (openPlaylist) {
        const updated = pls.find((p) => p.id === openPlaylist.id) || null;
        setOpenPlaylist(updated);
      }
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    }
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newPl: PlaylistItem = {
      id: `pl-${Date.now()}`,
      nome: newPlaylistName.trim(),
      descricao: 'Playlist do aparelho',
      songIds: [],
      createdAt: Date.now(),
    };

    await savePlaylist(newPl);
    setNewPlaylistName('');
    setShowNewModal(false);
    setActiveTab('playlists');
    await loadLibraryData();
  };

  const songsOf = (pl: PlaylistItem) => allSongs.filter((s) => pl.songIds.includes(s.id));

  const handleToggleInPlaylist = async (songId: string) => {
    if (!openPlaylist) return;
    const has = openPlaylist.songIds.includes(songId);
    const nextIds = has
      ? openPlaylist.songIds.filter((id) => id !== songId)
      : [...openPlaylist.songIds, songId];
    await updatePlaylistSongs(openPlaylist.id, nextIds);
    await loadLibraryData();
  };

  const handleDeletePl = async (id: string) => {
    await deletePlaylist(id);
    setOpenPlaylist(null);
    await loadLibraryData();
  };

  if (openPlaylist) {
    const tracks = songsOf(openPlaylist);
    return (
      <div className="space-y-5 pb-28">
        <button
          type="button"
          onClick={() => {
            setOpenPlaylist(null);
            setShowAddSongs(false);
          }}
          className="text-xs text-white/60 hover:text-white flex items-center gap-1 font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> Biblioteca
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">{openPlaylist.nome}</h1>
            <p className="text-xs text-white/50 mt-1">{tracks.length} faixa(s) nesta playlist</p>
          </div>
          <button
            type="button"
            onClick={() => handleDeletePl(openPlaylist.id)}
            className="p-2 rounded-xl text-red-400/70 hover:bg-red-500/10"
            title="Excluir playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={tracks.length === 0}
            onClick={() => playSong(tracks[0], tracks)}
            className="flex-1 py-2.5 rounded-xl bg-[#f5c518] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-current" /> Tocar playlist
          </button>
          <button
            type="button"
            onClick={() => setShowAddSongs((v) => !v)}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {showAddSongs ? 'Fechar' : 'Adicionar faixas'}
          </button>
        </div>

        {showAddSongs && (
          <div className="space-y-2 rounded-2xl border border-white/10 p-3 bg-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
              Escolha músicas do aparelho ou do Portal
            </p>
            {allSongs.length === 0 ? (
              <p className="text-xs text-white/50 py-4 text-center">
                Importe músicas na aba Aparelho para montar playlists.
              </p>
            ) : (
              allSongs.map((song) => {
                const added = openPlaylist.songIds.includes(song.id);
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => handleToggleInPlaylist(song.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                      added ? 'bg-[#f5c518]/15 text-[#f5c518]' : 'bg-black/30 text-white/80'
                    }`}
                  >
                    <span className="truncate">
                      {song.titulo} <span className="text-white/40">· {song.artista}</span>
                    </span>
                    <span className="shrink-0 font-bold">{added ? 'Na lista' : '+ Add'}</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tracks.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
            <ListMusic className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-sm font-semibold text-white/70">Playlist vazia</p>
            <p className="text-xs text-white/40">Adicione faixas locais ou do catálogo do Portal.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tracks.map((song) => (
              <SongCard key={song.id} song={song} queue={tracks} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Library className="w-6 h-6 text-[#f5c518]" />
            Sua Biblioteca
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Favoritas e playlists no aparelho. Nada disso sobe para o Portal.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="p-2.5 rounded-2xl bg-[#f5c518] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Playlist
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'favorites'
              ? 'bg-[#f5c518] text-black shadow-md'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          Favoritas ({favoriteSongs.length})
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'playlists'
              ? 'bg-[#f5c518] text-black shadow-md'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          Playlists ({playlists.length})
        </button>
      </div>

      {activeTab === 'favorites' && (
        <div className="space-y-3">
          {favoriteSongs.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
              <Heart className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">Nenhuma música favoritada ainda</p>
              <p className="text-xs text-white/40">
                Toque no coração em qualquer faixa local ou do Portal.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {favoriteSongs.map((song) => (
                <SongCard key={song.id} song={song} queue={favoriteSongs} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'playlists' && (
        <div className="space-y-3">
          {playlists.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
              <ListMusic className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">Você não tem playlists salvas</p>
              <p className="text-xs text-white/40">
                Crie listas com MP3s do celular e faixas dos compositores do Portal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setOpenPlaylist(pl)}
                  className="bg-[#181818]/80 border border-white/10 hover:border-[#f5c518]/50 rounded-2xl p-3.5 space-y-2 group cursor-pointer transition-all text-left"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#f5c518]/10 border border-white/10 flex items-center justify-center">
                    <Music className="w-10 h-10 text-[#f5c518]/70" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white truncate group-hover:text-[#f5c518] transition-colors">
                    {pl.nome}
                  </h4>
                  <p className="text-[10px] text-white/40">{pl.songIds.length} faixas</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm bg-[#1a1a1a] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-black text-white">Criar Nova Playlist</h3>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1">
                Nome da Playlist
              </label>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Ex: Sertanejo do celular"
                required
                className="w-full bg-[#121212] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f5c518]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 font-bold text-xs hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#f5c518] text-black font-extrabold text-xs shadow-md hover:scale-102 transition-transform"
              >
                Criar Playlist
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
