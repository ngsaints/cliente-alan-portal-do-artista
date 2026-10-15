/** Counts real elapsed playback, not position jumps, and obtains a server-issued listen ticket. */
export function trackQualifiedPlay(
  audio: HTMLAudioElement,
  apiBase: string,
  getSongId: () => string | number | null,
) {
  let active = false,
    disposed = false,
    songId: string | null = null,
    source = "",
    listened = 0,
    lastTime = 0,
    submitted = false,
    token: Promise<string | null> | null = null,
    reporting = false,
    attempts = 0;
  const start = () => {
    const value = getSongId();
    if (value == null || String(value).startsWith("local-")) return;
    const id = String(value);
    if (id !== songId || audio.src !== source) {
      songId = id;
      source = audio.src;
      listened = 0;
      submitted = false;
      attempts = 0;
      const captured = id;
      token = fetch(`${apiBase}/songs/${encodeURIComponent(id)}/listen`, {
        method: "POST",
      })
        .then(async (res) => (res.ok ? (await res.json()).token : null))
        .catch(() => null);
      if (captured !== songId) token = null;
    }
    active = true;
    lastTime = performance.now();
  };
  const tick = () => {
    if (disposed) return;
    if (!songId) {
      if (!audio.paused) start();
      return;
    }
    const now = performance.now(),
      delta = lastTime ? Math.max(0, Math.min(5000, now - lastTime)) : 0;
    lastTime = now;
    if (active && !audio.paused && !audio.seeking && audio.readyState >= 2)
      listened += delta;
    if (listened < 30_000 || submitted || reporting || attempts >= 3) return;
    const id = songId,
      capturedToken = token;
    reporting = true;
    attempts++;
    Promise.resolve(capturedToken)
      .then(async (value) => {
        if (disposed || songId !== id || !value) return;
        const res = await fetch(
          `${apiBase}/songs/${encodeURIComponent(id!)}/play`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: value }),
          },
        );
        if (res.ok) {
          if (songId === id) submitted = true;
          window.dispatchEvent(new Event("portal:qualified-play"));
        }
      })
      .catch(() => {})
      .finally(() => {
        reporting = false;
      });
  };
  const stop = () => {
    tick();
    active = false;
    lastTime = 0;
  };
  const reset = () => {
    active = false;
    songId = null;
    source = "";
    token = null;
    listened = 0;
    lastTime = 0;
    submitted = false;
  };
  audio.addEventListener("playing", start);
  audio.addEventListener("pause", stop);
  audio.addEventListener("waiting", stop);
  audio.addEventListener("seeking", stop);
  audio.addEventListener("emptied", reset);
  const timer = setInterval(tick, 1000);
  return () => {
    disposed = true;
    clearInterval(timer);
    audio.removeEventListener("playing", start);
    audio.removeEventListener("pause", stop);
    audio.removeEventListener("waiting", stop);
    audio.removeEventListener("seeking", stop);
    audio.removeEventListener("emptied", reset);
  };
}
