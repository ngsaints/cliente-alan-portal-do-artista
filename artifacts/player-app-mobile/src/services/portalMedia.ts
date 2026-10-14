export const PORTAL_DOMAIN = "https://portaldoartista.com";
/** Remote catalog media belongs to the portal, never to the APK's localhost origin. */
export function normalizeUrl(value: string | null | undefined): string {
  const url = String(value || "").trim();
  if (!url) return `${PORTAL_DOMAIN}/images/default-cover.png`;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/uploads/"))
    return new URL(`/api${url}`, PORTAL_DOMAIN).href;
  if (url.startsWith("uploads/"))
    return new URL(`/api/${url}`, PORTAL_DOMAIN).href;
  if (url.startsWith("/")) return new URL(url, PORTAL_DOMAIN).href;
  return new URL(`/api/uploads/${url}`, PORTAL_DOMAIN).href;
}
/** CORS mode permits portal uploads with CORP same-origin in the native WebView. */
export function portalImageCrossOrigin(src: string): "anonymous" | undefined {
  try {
    const url = new URL(src, PORTAL_DOMAIN);
    return url.origin === PORTAL_DOMAIN &&
      (url.pathname.startsWith("/api/uploads/") ||
        url.pathname.startsWith("/uploads/"))
      ? "anonymous"
      : undefined;
  } catch {
    return undefined;
  }
}
