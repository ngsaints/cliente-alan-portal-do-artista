import { useEffect, useState } from "react";

export type FeatureFlags = {
  vipEnabled: boolean;
  reservadoEnabled: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  vipEnabled: true,
  reservadoEnabled: true,
};

let flags: FeatureFlags = { ...DEFAULT_FLAGS };
let loaded = false;
let loadPromise: Promise<FeatureFlags> | null = null;

export function getFeatureFlags(): FeatureFlags {
  return { ...flags };
}

export function applyFeatureFlagsFromSettings(settings: Partial<Record<string, unknown>> | null | undefined): FeatureFlags {
  const vipEnabled = settings?.artistVipEnabled !== false && settings?.artist_vip_enabled !== "false";
  const reservadoEnabled =
    settings?.artistReservadoEnabled !== false && settings?.artist_reservado_enabled !== "false";
  flags = { vipEnabled, reservadoEnabled };
  loaded = true;
  return { ...flags };
}

export function loadFeatureFlags(): Promise<FeatureFlags> {
  if (loaded) return Promise.resolve(getFeatureFlags());
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/api/settings")
    .then((res) => (res.ok ? res.json() : {}))
    .then((data) => applyFeatureFlagsFromSettings(data))
    .catch(() => getFeatureFlags())
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function useFeatureFlags(): FeatureFlags {
  const [value, setValue] = useState<FeatureFlags>(() => getFeatureFlags());

  useEffect(() => {
    let alive = true;
    void loadFeatureFlags().then((next) => {
      if (alive) setValue(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return value;
}
