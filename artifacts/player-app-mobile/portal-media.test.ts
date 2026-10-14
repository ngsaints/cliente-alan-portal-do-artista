import assert from "node:assert/strict";
import {
  normalizeUrl,
  portalImageCrossOrigin,
  PORTAL_DOMAIN,
} from "./src/services/portalMedia.ts";
for (const url of [
  "/api/uploads/photos/Foto Artista.jpg",
  "/uploads/photos/Foto Artista.jpg",
  "uploads/photos/Foto Artista.jpg",
  "photos/Foto Artista.jpg",
])
  assert.equal(
    normalizeUrl(url),
    `${PORTAL_DOMAIN}/api/uploads/photos/Foto%20Artista.jpg`,
  );
assert.equal(
  normalizeUrl("/images/default-cover.png"),
  `${PORTAL_DOMAIN}/images/default-cover.png`,
);
assert.equal(normalizeUrl(null), `${PORTAL_DOMAIN}/images/default-cover.png`);
assert.equal(
  normalizeUrl("https://cdn.example/cover.jpg"),
  "https://cdn.example/cover.jpg",
);
assert.equal(
  normalizeUrl("//cdn.example/cover.jpg"),
  "https://cdn.example/cover.jpg",
);
assert.equal(normalizeUrl("blob:local-song"), "blob:local-song");
assert.equal(
  normalizeUrl("data:image/png;base64,AAA"),
  "data:image/png;base64,AAA",
);
assert.equal(
  portalImageCrossOrigin(normalizeUrl("/api/uploads/covers/cover.jpg")),
  "anonymous",
);
assert.equal(
  portalImageCrossOrigin(`${PORTAL_DOMAIN}/images/default-cover.png`),
  undefined,
);
assert.equal(
  portalImageCrossOrigin("https://cdn.example/cover.jpg"),
  undefined,
);
assert.equal(portalImageCrossOrigin("blob:local-song"), undefined);
console.log(
  "PASS: APK media resolves to production, upload path variants and spaces, CORS image mode, external and local media",
);
