import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "@workspace/db";

const router: IRouter = Router();
router.post('/engagement', rateLimit({ windowMs: 60_000, limit: 30 }), async (req, res) => {
  const { event, slug } = req.body ?? {};
  if (!['activity', 'share', 'view'].includes(event)) {
    res.status(400).json({ error: 'Evento inválido' }); return;
  }
  try {
    let id = req.session.artistId;
    if (event === 'view') {
      if (typeof slug !== 'string' || slug.length > 255) { res.sendStatus(400); return; }
      const result = await pool.query('SELECT id FROM artists WHERE slug = $1', [slug]);
      id = result.rows[0]?.id;
      if (id === req.session.artistId) { res.sendStatus(204); return; }
    }
    if (!id) { res.sendStatus(event === 'view' ? 404 : 401); return; }
    await pool.query(`INSERT INTO artist_engagement (artist_id, last_active_at, shares, profile_views)
      VALUES ($1, CASE WHEN $2 <> 'view' THEN now() END, CASE WHEN $2 = 'share' THEN 1 ELSE 0 END, CASE WHEN $2 = 'view' THEN 1 ELSE 0 END)
      ON CONFLICT (artist_id) DO UPDATE SET
      last_active_at = CASE WHEN $2 <> 'view' THEN now() ELSE artist_engagement.last_active_at END,
      shares = artist_engagement.shares + EXCLUDED.shares,
      profile_views = artist_engagement.profile_views + EXCLUDED.profile_views`, [id, event]);
    res.sendStatus(204);
  } catch (error) { console.error('Engagement event failed', error); res.sendStatus(500); }
});

router.get('/admin/engagement', async (req, res) => {
  if (!req.session.logado) { res.sendStatus(401); return; }
  try {
    const { rows } = await pool.query(`SELECT a.id, a.name, a.plano,
      e.last_active_at, COALESCE(e.shares, 0) AS shares, COALESCE(e.profile_views, 0) AS views,
      (SELECT count(*)::integer FROM songs s WHERE s.artista_id = a.id::text) AS songs,
      (NULLIF(trim(a.capa_url), '') IS NOT NULL AND a.capa_url NOT LIKE '%default%') AS photo,
      (NULLIF(trim(a.biografia), '') IS NOT NULL AND NULLIF(trim(a.contato), '') IS NOT NULL
        AND NULLIF(trim(a.cidade), '') IS NOT NULL AND NULLIF(trim(a.profissao), '') IS NOT NULL) AS profile,
      CASE WHEN e.last_active_at IS NULL THEN 'Sem histórico'
        WHEN e.last_active_at < now() - interval '30 days' AND a.plano <> 'free' AND a.plano_ativo THEN 'Atenção: plano pago'
        WHEN e.last_active_at < now() - interval '14 days' THEN 'Inativo'
        ELSE 'Ativo' END AS status
      FROM artists a LEFT JOIN artist_engagement e ON e.artist_id = a.id ORDER BY a.name`);
    res.json(rows);
  } catch (error) { console.error('Engagement report failed', error); res.status(500).json({ error: 'Não foi possível carregar os indicadores.' }); }
});
export default router;
