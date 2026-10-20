type Artist = { id: number; plano: string; planoAtivo: boolean };
type Subscription = {
  artistId: string | number;
  planNome: string;
  status: string;
  amount: string | number;
  asaasPaymentId: string | null;
  expiresAt: Date | string | null;
};
const normalize = (value: string) => value.trim().toLowerCase();

/** Access grants and free coupons are not evidence of a payment. Count people once. */
export function summarizeArtistPlans(artists: Artist[], subscriptions: Subscription[], now = Date.now()) {
  const paid = new Set(subscriptions.filter((sub) =>
    sub.status === "active" && Number(sub.amount) > 0 && !!sub.asaasPaymentId &&
    sub.expiresAt != null && new Date(sub.expiresAt).getTime() > now &&
    !normalize(sub.planNome).startsWith("ai_credits:")
  ).map((sub) => `${sub.artistId}:${normalize(sub.planNome)}`));
  const active = artists.filter((artist) => artist.planoAtivo &&
    !!normalize(artist.plano) && normalize(artist.plano) !== "free");
  return {
    activePlanArtists: active.length,
    freeArtists: artists.length - active.length,
    paidArtists: active.filter((artist) => paid.has(`${artist.id}:${normalize(artist.plano)}`)).length,
  };
}
