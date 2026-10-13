import assert from "node:assert/strict";
import {
  createCreditCheckout,
  CreditCheckoutError,
} from "./src/lib/credit-checkout";
const artist = { id: 7, name: "Ana", email: "ana@example.com" };
const pkg = {
  id: "pack_5",
  name: "Start",
  credits: 5,
  price: 19.9,
  pricePerCredit: 3.98,
  badge: "",
  description: "",
};
let calls: string[] = [];
const deps = () => ({
  getCredentials: async () => {
    calls.push("credentials");
    return { apiKey: "configured" };
  },
  findCustomer: async () => {
    calls.push("customer");
    return { id: "cus_1" };
  },
  createPayment: async (body: Record<string, unknown>) => {
    calls.push("payment");
    assert.equal(body.value, 19.9);
    assert.equal(body.externalReference, "credits-7-pack_5");
    return { id: "pay_1", invoiceUrl: "https://www.asaas.com/i/charge" };
  },
  savePending: async (id: string) => {
    calls.push("pending");
    assert.equal(id, "pay_1");
  },
  getQrCode: async () => {
    calls.push("qr");
    return { encodedImage: "image", payload: "pix-payload" };
  },
});
const run = async (extra: Partial<ReturnType<typeof deps>> = {}) => {
  calls = [];
  return createCreditCheckout(artist, pkg, { ...deps(), ...extra });
};
const checkout = await run();
assert.equal(checkout.mode, "asaas_pix");
assert.equal(checkout.pixCopiaECola, "pix-payload");
assert.deepEqual(calls, [
  "credentials",
  "customer",
  "payment",
  "pending",
  "qr",
]);
assert.ok(!("addedCredits" in checkout));
await assert.rejects(
  run({ getCredentials: async () => ({ apiKey: "" }) }),
  (err: unknown) =>
    err instanceof CreditCheckoutError && err.statusCode === 503,
);
assert.deepEqual(
  calls,
  [],
  "Missing credentials must not create or record a charge",
);
for (const stage of [
  "getCredentials",
  "findCustomer",
  "createPayment",
] as const) {
  await assert.rejects(
    run({
      [stage]: async () => {
        throw new Error("gateway unavailable");
      },
    }),
  );
  assert.ok(!calls.includes("pending"));
}
await assert.rejects(
  run({ createPayment: async () => ({ id: "" }) }),
  CreditCheckoutError,
);
assert.ok(!calls.includes("pending"));
await assert.rejects(
  run({
    savePending: async () => {
      throw new Error("database unavailable");
    },
  }),
  /suporte antes de tentar outra compra/,
);
assert.ok(!calls.includes("qr"));
const fallback = await run({
  getQrCode: async () => {
    throw new Error("qr unavailable");
  },
});
assert.equal(fallback.invoiceUrl, "https://www.asaas.com/i/charge");
assert.equal(fallback.pixCopiaECola, "");
assert.ok(calls.includes("pending"));
assert.ok(!("addedCredits" in fallback));
await assert.rejects(
  run({
    createPayment: async () => ({ id: "pay_1" }),
    getQrCode: async () => ({ payload: "" }),
  }),
  /Nenhum crédito foi liberado/,
);
await assert.rejects(
  run({
    createPayment: async () => ({
      id: "pay_1",
      invoiceUrl: "javascript:alert(1)",
    }),
    getQrCode: async () => ({}),
  }),
  CreditCheckoutError,
);
console.log(
  "PASS: valid Pix checkout, missing configuration, credential/customer/payment failures, pending-record failure, QR/invoice recovery and unavailable payment; no instant credit delivery",
);
