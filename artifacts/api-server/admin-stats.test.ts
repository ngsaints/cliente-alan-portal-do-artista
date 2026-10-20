import assert from "node:assert/strict";
import { summarizeArtistPlans } from "./src/lib/admin-stats.ts";
const now = Date.parse("2026-10-20T12:00:00Z");
const artists = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, plano: "pro", planoAtivo: true }));
artists[8].plano = " FREE ";
artists[9].planoAtivo = false;
const sub = (artistId: number, changes = {}) => ({ artistId: String(artistId), planNome: "pro", status: "active", amount: "20", asaasPaymentId: "pay_1", expiresAt: "2026-11-20", ...changes });
assert.deepEqual(summarizeArtistPlans(artists, [
  sub(1), sub(1), // A renewal must not count the artist twice.
  sub(2, { amount: "0", asaasPaymentId: null }), // Courtesy.
  sub(3, { expiresAt: "2026-10-19" }),
  sub(4, { status: "pending" }),
  sub(5, { asaasPaymentId: null }), // Direct activation without collection.
  sub(6, { planNome: "ai_credits:pack_5" }),
  sub(7, { planNome: "old_plan" }),
  sub(8, { expiresAt: null }), sub(9), sub(10), sub(999),
], now), { activePlanArtists: 8, freeArtists: 2, paidArtists: 1 });
assert.deepEqual(summarizeArtistPlans([], [], now), { activePlanArtists: 0, freeArtists: 0, paidArtists: 0 });
assert.equal(summarizeArtistPlans([artists[0]], [sub(1, { planNome: " PRO ", expiresAt: new Date(now + 1) })], now).paidArtists, 1);
assert.equal(summarizeArtistPlans([artists[0]], [sub(1, { expiresAt: new Date(now) })], now).paidArtists, 0);
console.log("PASS: admin metrics distinguish enabled access from paid current subscriptions, deduplicate artists and exclude grants, expired/pending subscriptions and credit packs");
