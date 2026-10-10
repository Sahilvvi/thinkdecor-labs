/**
 * Cookie consent. Nothing beyond what the site needs to work (sign-in session,
 * this choice itself) runs until the visitor accepts: the advertising and
 * analytics pixels below are injected only after an explicit "Accept all".
 * The choice is stored in localStorage and can be changed any time from the
 * footer's "Cookie settings" link.
 */
export type ConsentChoice = 'accepted' | 'rejected';

const KEY = 'td_cookie_consent';
export const OPEN_SETTINGS_EVENT = 'td:open-cookie-settings';

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  try { localStorage.setItem(KEY, choice); } catch { /* storage blocked: choice lasts for this page view only */ }
  if (choice === 'accepted') loadTrackers();
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

function addScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

let loaded = false;

/** Injects Google Tag Manager, the two Meta pixels, Reddit and Spotify. Idempotent. */
export function loadTrackers() {
  if (loaded) return;
  loaded = true;
  type Queued = ((...args: unknown[]) => void) & {
    queue?: unknown[]; callQueue?: unknown[]; q?: unknown[];
    callMethod?: (...args: unknown[]) => void; sendEvent?: (...args: unknown[]) => void;
    push?: unknown; loaded?: boolean; version?: string;
  };
  const w = window as unknown as { dataLayer: unknown[]; fbq?: Queued; _fbq?: unknown; rdt?: Queued; spdt?: Queued };

  // Google Tag Manager (also carries GA4, Google Ads and Pinterest tags).
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  addScript('https://www.googletagmanager.com/gtm.js?id=GTM-M3XMGKQV', 'td-gtm');

  // Meta Pixel — two pixels; one track() call fires for both.
  if (!w.fbq) {
    const n: Queued = (w.fbq = ((...args: unknown[]) => {
      if (n.callMethod) n.callMethod(...args);
      else n.queue?.push(args);
    }) as Queued);
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  }
  addScript('https://connect.facebook.net/en_US/fbevents.js', 'td-fbevents');
  w.fbq('init', '1034473605961424');
  w.fbq('init', '2241283269981607');
  w.fbq('track', 'PageView');

  // Reddit Pixel
  if (!w.rdt) {
    const p: Queued = (w.rdt = ((...args: unknown[]) => {
      if (p.sendEvent) p.sendEvent(...args);
      else p.callQueue?.push(args);
    }) as Queued);
    p.callQueue = [];
  }
  addScript('https://www.redditstatic.com/ads/pixel.js?pixel_id=a2_jih3osv8wtpw', 'td-rdt');
  w.rdt('init', 'a2_jih3osv8wtpw');
  w.rdt('track', 'PageVisit');

  // Spotify Pixel
  if (!w.spdt) {
    const sp: Queued = (w.spdt = ((...args: unknown[]) => { (sp.q = sp.q || []).push(args); }) as Queued);
  }
  addScript('https://pixel.byspotify.com/ping.min.js', 'spdt-capture');
  w.spdt('conf', { key: 'b31f1459095c4605a10bc8ae1d281264' });
  w.spdt('view');
}

/** Called once at startup: restores a previous "accepted" choice. */
export function initConsent() {
  if (getConsent() === 'accepted') loadTrackers();
}
