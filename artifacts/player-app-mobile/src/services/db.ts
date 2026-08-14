import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SongItem, PlaylistItem } from '../types/music';

interface ListenerAppDB extends DBSchema {
  local_songs: {
    key: string;
    value: SongItem;
  };
  playlists: {
    key: string;
    value: PlaylistItem;
  };
  favorites: {
    key: string;
    value: { songId: string; addedAt: number };
  };
}

const DB_NAME = 'portal_do_artista_listener_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ListenerAppDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ListenerAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('local_songs')) {
          db.createObjectStore('local_songs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'songId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLocalSong(song: SongItem): Promise<void> {
  const db = await getDB();
  await db.put('local_songs', song);
}

export async function getLocalSongs(): Promise<SongItem[]> {
  const db = await getDB();
  return db.getAll('local_songs');
}

export async function deleteLocalSong(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('local_songs', id);
}

export async function savePlaylist(playlist: PlaylistItem): Promise<void> {
  const db = await getDB();
  await db.put('playlists', playlist);
}

export async function getPlaylists(): Promise<PlaylistItem[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

export async function toggleFavorite(songId: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('favorites', songId);
  if (existing) {
    await db.delete('favorites', songId);
    return false;
  } else {
    await db.put('favorites', { songId, addedAt: Date.now() });
    return true;
  }
}

export async function getFavorites(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll('favorites');
  return all.map((item) => item.songId);
}
