export function trackEngagement(event: 'activity' | 'share' | 'view', slug?: string) {
  void fetch('/api/engagement', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, slug }) }).catch(() => {});
}

export async function copyArtistLink(text: string) {
  await navigator.clipboard.writeText(text);
  trackEngagement('share');
}
