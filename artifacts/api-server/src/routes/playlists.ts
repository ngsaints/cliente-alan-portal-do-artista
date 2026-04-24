import { Router, type IRouter } from "express";
import { db, playlistsTable, playlistSongsTable, songsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router: IRouter = Router();

// GET /playlists - List artist's playlists
router.get("/playlists", async (req, res): Promise<void> => {
  if (!req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const playlists = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.artistaId, req.session.artistId))
      .orderBy(asc(playlistsTable.ordem));

    // Get song count for each playlist
    const playlistsWithCount = await Promise.all(
      playlists.map(async (p) => {
        const songs = await db
          .select()
          .from(playlistSongsTable)
          .where(eq(playlistSongsTable.playlistId, p.id));
        return { ...p, songCount: songs.length };
      })
    );

    res.json(playlistsWithCount);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).json({ error: "Erro ao buscar playlists" });
  }
});

// GET /playlists/public/:artistId - Get public playlists for an artist
router.get("/playlists/public/:artistId", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.params;

    const playlists = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.artistaId, artistId))
      .orderBy(asc(playlistsTable.ordem));

    // Get songs for each playlist with full details
    const playlistsWithSongs = await Promise.all(
      playlists.filter(p => p.ativo).map(async (p) => {
        const playlistSongs = await db
          .select({
            id: playlistSongsTable.id,
            songId: playlistSongsTable.songId,
            ordem: playlistSongsTable.ordem,
          })
          .from(playlistSongsTable)
          .where(eq(playlistSongsTable.playlistId, p.id))
          .orderBy(asc(playlistSongsTable.ordem));

        // Get full song details
        const songs = await Promise.all(
          playlistSongs.map(async (ps) => {
            const [song] = await db
              .select()
              .from(songsTable)
              .where(eq(songsTable.id, ps.songId));
            return song;
          })
        );

        return {
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          songs: songs.filter(Boolean),
        };
      })
    );

    res.json(playlistsWithSongs);
  } catch (error) {
    console.error("Error fetching public playlists:", error);
    res.status(500).json({ error: "Erro ao buscar playlists" });
  }
});

// GET /playlists/admin - List all playlists (admin only)
router.get("/playlists/admin", async (req, res): Promise<void> => {
  try {
    const playlists = await db
      .select()
      .from(playlistsTable)
      .orderBy(asc(playlistsTable.createdAt));

    const playlistsWithCount = await Promise.all(
      playlists.map(async (p) => {
        const songs = await db
          .select()
          .from(playlistSongsTable)
          .where(eq(playlistSongsTable.playlistId, p.id));
        return { ...p, songCount: songs.length };
      })
    );

    res.json(playlistsWithCount);
  } catch (error) {
    console.error("Error fetching admin playlists:", error);
    res.status(500).json({ error: "Erro ao buscar playlists" });
  }
});

// POST /playlists - Create playlist
router.post("/playlists", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { nome, descricao, artistaId } = req.body;

    if (!nome) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }

    // Use artistaId from body if provided (admin), otherwise use session
    const targetArtistId = artistaId || String(req.session.artistId);

    const [playlist] = await db
      .insert(playlistsTable)
      .values({
        artistaId: targetArtistId,
        nome,
        descricao: descricao || null,
      })
      .returning();

    res.status(201).json(playlist);
  } catch (error) {
    console.error("Error creating playlist:", error);
    res.status(500).json({ error: "Erro ao criar playlist" });
  }
});

// PUT /playlists/:id - Update playlist
router.put("/playlists/:id", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;

    // Verify ownership (admin bypasses this)
    const [existing] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!existing || (!isAdmin && String(existing.artistaId) !== String(req.session.artistId))) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    const [updated] = await db
      .update(playlistsTable)
      .set({
        nome: nome ?? existing.nome,
        descricao: descricao ?? existing.descricao,
        ativo: ativo ?? existing.ativo,
        updatedAt: new Date(),
      })
      .where(eq(playlistsTable.id, parseInt(id)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating playlist:", error);
    res.status(500).json({ error: "Erro ao atualizar playlist" });
  }
});

// DELETE /playlists/:id - Delete playlist
router.delete("/playlists/:id", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;

    // Verify ownership (admin bypasses this)
    const [existing] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!existing || (!isAdmin && String(existing.artistaId) !== String(req.session.artistId))) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    await db.delete(playlistsTable).where(eq(playlistsTable.id, parseInt(id)));

    res.json({ message: "Playlist excluída" });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ error: "Erro ao excluir playlist" });
  }
});

// GET /playlists/:id/songs - Get playlist songs
router.get("/playlists/:id/songs", async (req, res): Promise<void> => {
  if (!req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;

    // Verify ownership
    const [playlist] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    if (!playlist || String(playlist.artistaId) !== String(req.session.artistId)) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    // Get playlist songs with song details
    const playlistSongs = await db
      .select({
        id: playlistSongsTable.id,
        ordem: playlistSongsTable.ordem,
        songId: playlistSongsTable.songId,
      })
      .from(playlistSongsTable)
      .where(eq(playlistSongsTable.playlistId, parseInt(id)))
      .orderBy(asc(playlistSongsTable.ordem));

    // Fetch full song details for each
    const songs = await Promise.all(
      playlistSongs.map(async (ps) => {
        const [song] = await db
          .select()
          .from(songsTable)
          .where(eq(songsTable.id, ps.songId));
        return song ? { ...song, playlistSongId: ps.id, ordem: ps.ordem } : null;
      })
    );

    res.json(songs.filter(Boolean));
  } catch (error) {
    console.error("Error fetching playlist songs:", error);
    res.status(500).json({ error: "Erro ao buscar músicas da playlist" });
  }
});

// POST /playlists/:id/songs - Add song to playlist
router.post("/playlists/:id/songs", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { songId } = req.body;

    if (!songId) {
      res.status(400).json({ error: "songId é obrigatório" });
      return;
    }

    // Verify ownership (admin bypasses this)
    const [playlist] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!playlist || (!isAdmin && String(playlist.artistaId) !== String(req.session.artistId))) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    // Verify song belongs to artist (admin bypasses this)
    const [song] = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, parseInt(songId)));

    if (!song || (!isAdmin && String(song.artistaId) !== String(req.session.artistId))) {
      res.status(404).json({ error: "Música não encontrada" });
      return;
    }

    // Check if song already in playlist
    const existing = await db
      .select()
      .from(playlistSongsTable)
      .where(
        and(
          eq(playlistSongsTable.playlistId, parseInt(id)),
          eq(playlistSongsTable.songId, parseInt(songId))
        )
      );

    if (existing.length > 0) {
      res.status(409).json({ error: "Música já está na playlist" });
      return;
    }

    // Get max order
    const allSongs = await db
      .select()
      .from(playlistSongsTable)
      .where(eq(playlistSongsTable.playlistId, parseInt(id)));
    const maxOrder = allSongs.reduce((max, s) => Math.max(max, s.ordem || 0), 0);

    const [playlistSong] = await db
      .insert(playlistSongsTable)
      .values({
        playlistId: parseInt(id),
        songId: parseInt(songId),
        ordem: maxOrder + 1,
      })
      .returning();

    res.status(201).json(playlistSong);
  } catch (error) {
    console.error("Error adding song to playlist:", error);
    res.status(500).json({ error: "Erro ao adicionar música à playlist" });
  }
});

// DELETE /playlists/:id/songs/:songId - Remove song from playlist
router.delete("/playlists/:id/songs/:songId", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id, songId } = req.params;

    // Verify ownership (admin bypasses this)
    const [playlist] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!playlist || (!isAdmin && String(playlist.artistaId) !== String(req.session.artistId))) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    await db
      .delete(playlistSongsTable)
      .where(
        and(
          eq(playlistSongsTable.playlistId, parseInt(id)),
          eq(playlistSongsTable.songId, parseInt(songId))
        )
      );

    res.json({ message: "Música removida da playlist" });
  } catch (error) {
    console.error("Error removing song from playlist:", error);
    res.status(500).json({ error: "Erro ao remover música da playlist" });
  }
});

// PUT /playlists/:id/songs/reorder - Reorder songs in playlist
router.put("/playlists/:id/songs/reorder", async (req, res): Promise<void> => {
  if (!req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { songIds } = req.body;

    if (!Array.isArray(songIds)) {
      res.status(400).json({ error: "songIds deve ser um array" });
      return;
    }

    // Verify ownership
    const [playlist] = await db
      .select()
      .from(playlistsTable)
      .where(eq(playlistsTable.id, parseInt(id)));

    if (!playlist || String(playlist.artistaId) !== String(req.session.artistId)) {
      res.status(404).json({ error: "Playlist não encontrada" });
      return;
    }

    // Update order for each song
    for (let i = 0; i < songIds.length; i++) {
      await db
        .update(playlistSongsTable)
        .set({ ordem: i + 1 })
        .where(
          and(
            eq(playlistSongsTable.playlistId, parseInt(id)),
            eq(playlistSongsTable.songId, songIds[i])
          )
        );
    }

    res.json({ message: "Playlist reordenada" });
  } catch (error) {
    console.error("Error reordering playlist:", error);
    res.status(500).json({ error: "Erro ao reordenar playlist" });
  }
});

export default router;
