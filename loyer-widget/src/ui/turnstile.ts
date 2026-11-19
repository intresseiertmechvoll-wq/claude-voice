/**
 * Cloudflare Turnstile (anti-robots, sans case « je ne suis pas un robot » dans la plupart des cas).
 * Actif seulement si config.json → turnstileSiteKey est rempli. Le script n'est chargé qu'à l'étape 3
 * (préchargement) ou 4, jamais avant : les visiteurs qui ne vont pas au bout ne le chargent pas.
 *
 * Un jeton (token) vaut 5 minutes et ne sert qu'une fois : il est consommé à l'envoi, puis le
 * widget en refait un automatiquement pour un éventuel nouvel envoi.
 */
interface TurnstileApi {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;
let widgetId: string | null = null;
let token: string | null = null;
let echec = false;

function charger(): Promise<void> {
  loading ??= new Promise<void>((ok, ko) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      echec = true;
      loading = null; // nouvel essai possible plus tard
      s.remove();
      ko(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Préchargement (étape 3) : rien ne s'affiche */
export function precharger(): void {
  void charger().catch(() => {});
}

/** Place le widget dans `el` (étape 4). Il reste invisible sauf si Cloudflare demande une action. */
export async function monter(el: HTMLElement, siteKey: string, lang: string): Promise<void> {
  try {
    await charger();
  } catch {
    return;
  }
  const ts = window.turnstile;
  if (!el.isConnected || !ts) return;
  if (widgetId) {
    try {
      ts.remove(widgetId);
    } catch {
      /* widget déjà retiré avec l'ancien écran */
    }
  }
  widgetId = ts.render(el, {
    sitekey: siteKey,
    language: lang,
    appearance: 'interaction-only',
    action: 'loyer',
    callback: (t: string) => {
      token = t;
      echec = false;
    },
    'expired-callback': () => (token = null),
    'error-callback': () => {
      token = null;
      echec = true;
    },
  });
}

/** Attend un jeton (au plus `ms`), puis le consomme. null : pas de jeton (script bloqué, erreur, délai). */
export async function jeton(ms = 8000): Promise<string | null> {
  const fin = Date.now() + ms;
  while (!token && !echec && Date.now() < fin) await new Promise((r) => setTimeout(r, 200));
  const t = token;
  token = null;
  if (widgetId && window.turnstile) {
    try {
      window.turnstile.reset(widgetId); // nouveau jeton pour un éventuel nouvel envoi
    } catch {
      /* rien */
    }
  }
  return t;
}
