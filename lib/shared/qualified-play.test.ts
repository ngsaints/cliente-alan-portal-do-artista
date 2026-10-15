import assert from "node:assert/strict";
import { trackQualifiedPlay } from "./qualified-play.ts";
class AudioMock extends EventTarget {
  src = "https://portal/audio.mp3";
  paused = false;
  seeking = false;
  readyState = 4;
  currentTime = 0;
}
let now = 1,
  tick: () => void = () => {},
  requests: { url: string; body: any }[] = [];
Object.defineProperty(globalThis, "performance", {
  value: { now: () => now },
  configurable: true,
});
Object.assign(globalThis, {
  window: new EventTarget(),
  setInterval: (fn: () => void) => {
    tick = fn;
    return 1;
  },
  clearInterval: () => {},
  fetch: async (url: string, opts: any) => {
    requests.push({ url, body: opts?.body });
    return { ok: true, json: async () => ({ token: "signed-ticket" }) };
  },
});
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const audio = new AudioMock();
const cleanup = trackQualifiedPlay(audio as any, "/api", () => 1);
audio.dispatchEvent(new Event("playing"));
await flush();
assert.equal(requests.length, 1);
for (let i = 0; i < 20; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 1, "Starting and short listening must not count");
audio.paused = true;
audio.dispatchEvent(new Event("pause"));
for (let i = 0; i < 60; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 1, "Paused time must not count");
audio.paused = false;
audio.seeking = true;
audio.currentTime = 300;
audio.dispatchEvent(new Event("seeking"));
for (let i = 0; i < 20; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 1, "Seeking ahead must not count");
audio.seeking = false;
audio.dispatchEvent(new Event("playing"));
for (let i = 0; i < 11; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 2);
assert.ok(requests[1].url.endsWith("/play"));
audio.dispatchEvent(new Event("playing"));
for (let i = 0; i < 40; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 2, "Resume must not duplicate a qualified play");
cleanup();
requests = [];
const local = new AudioMock();
const stop = trackQualifiedPlay(local as any, "/api", () => null);
local.dispatchEvent(new Event("playing"));
for (let i = 0; i < 40; i++) {
  now += 1000;
  tick();
}
await flush();
assert.equal(requests.length, 0);
stop();
console.log(
  "PASS: shared site/APK tracker requires real elapsed playback, excludes pauses/seeks/local files and does not recount resumes",
);
