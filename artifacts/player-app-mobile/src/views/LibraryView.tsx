import React, { useState, useEffect } from 'react';
import { Library, Plus, ListMusic, Heart, Smartphone, Music } from 'lucide-react';
import { SongItem, PlaylistItem } from '../types/music';
import { getPlaylists, savePlaylist, deletePlaylist, getLocalSongs, getFavorites } from '../services/db';
import { fetchExploreSongs } from '../services/portalApi';
import { SongCard } from '../components/SongCard';

export const LibraryView: React.FC = () => {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<SongItem[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists'>('favorites');

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

      const allSongs = [...localS, ...portalS];
      const liked = allSongs.filter((s) => favIds.includes(s.id));
      setFavoriteSongs(liked);
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
      descricao: 'Playlist personalizada offline',
      songIds: [],
      createdAt: Date.now(),
      capaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    };

    await savePlaylist(newPl);
    setNewPlaylistName('');
    setShowNewModal(false);
    await loadLibraryData();
  };

  const handleDeletePl = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deletePlaylist(id);
    await loadLibraryData();
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Library className="w-6 h-6 text-[#f5c518]" />
            Sua Biblioteca
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Suas músicas favoritas e playlists híbridas offline.
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

      {/* Sub Tabs */}
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

      {/* Favorites Content */}
      {activeTab === 'favorites' && (
        <div className="space-y-3">
          {favoriteSongs.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
              <Heart className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">Nenhuma música favoritada ainda</p>
              <p className="text-xs text-white/40">
                Toque no ícone de coração em qualquer música para salvar aqui.
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

      {/* Playlists Content */}
      {activeTab === 'playlists' && (
        <div className="space-y-3">
          {playlists.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 space-y-2">
              <ListMusic className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">Você não tem playlists salvas</p>
              <p className="text-xs text-white/40">
                Crie playlists misturando faixas do Portal e áudios do seu celular.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="bg-[#181818]/80 border border-white/10 hover:border-[#f5c518]/50 rounded-2xl p-3.5 space-y-2 group cursor-pointer transition-all"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 relative">
                    <img
                      src={pl.capaUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80'}
                      alt={pl.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="font-extrabold text-sm text-white truncate group-hover:text-[#f5c518] transition-colors">
                    {pl.nome}
                  </h4>
                  <p className="text-[10px] text-white/40">{pl.songIds.length} faixas</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
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
                placeholder="Ex: Minhas Favoritas Sertanejo"
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
