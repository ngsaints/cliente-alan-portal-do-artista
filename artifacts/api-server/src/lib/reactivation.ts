import { pool } from '@workspace/db';
import { getEmailConfig, getPortalUrl } from './email';

// Disabled until the operator explicitly enables delivery in the deployment.
// Claims are durable: ambiguous provider responses are not automatically retried.
export async function runReactivation() {
  if (process.env.REACTIVATION_EMAILS_ENABLED !== 'true') return;
  const { resend, from } = await getEmailConfig();
  if (!resend) return;
  const portal = await getPortalUrl();
  const target = new URL('/artista/dashboard', portal);
  if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Invalid portal URL');
  const { rows } = await pool.query(`SELECT a.id, a.email FROM artists a
    JOIN artist_engagement e ON e.artist_id = a.id
    WHERE e.last_active_at < now() - interval '14 days'
    AND e.last_active_at > now() - interval '90 days'
    AND NOT EXISTS (SELECT 1 FROM artist_reactivation r WHERE r.artist_id = a.id AND r.created_at > now() - interval '7 days')
    ORDER BY e.last_active_at DESC LIMIT 50`);
  for (const artist of rows) {
    const claim = await pool.query(`INSERT INTO artist_reactivation (artist_id, campaign_week)
      VALUES ($1, date_trunc('week', now())::date) ON CONFLICT DO NOTHING RETURNING artist_id`, [artist.id]);
    if (!claim.rowCount) continue;
    try {
      const result = await resend.emails.send({ from, to: artist.email,
        subject: 'Seu próximo passo no Portal do Artista',
        text: `Seu espaço musical está esperando por você. No painel, confira as pendências do perfil, cadastre sua primeira música ou organize seus próximos compromissos no CRM. Se precisar de ajuda, use o suporte do portal.\n\nAcesse: ${target.href}`,
      }, { idempotencyKey: `reactivation-${artist.id}-${new Date().toISOString().slice(0, 10)}` });
      await pool.query("UPDATE artist_reactivation SET status = $2 WHERE artist_id = $1 AND status = 'pending'", [artist.id, result.error ? 'failed' : 'sent']);
    } catch {
      await pool.query("UPDATE artist_reactivation SET status = 'unknown' WHERE artist_id = $1 AND status = 'pending'", [artist.id]);
    }
  }
}

export function startReactivation() {
  if (process.env.REACTIVATION_EMAILS_ENABLED !== 'true') return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await runReactivation(); } catch (error) { console.error('Reactivation failed', error); }
    finally { running = false; }
  };
  void run();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
}
