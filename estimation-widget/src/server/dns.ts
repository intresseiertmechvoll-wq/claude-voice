/**
 * Le domaine de l'adresse e-mail existe-t-il ? Une question DNS (DNS-over-HTTPS de Cloudflare), rien n'est gardé.
 * Au mieux : le seul refus est un « ce domaine n'existe pas » net (NXDOMAIN). Panne, délai dépassé,
 * réponse bizarre : on accepte (un vrai visiteur ne doit jamais être bloqué par une panne).
 */
export const DNS_TIMEOUT_MS = 2000;
const DOH = 'https://cloudflare-dns.com/dns-query';

/**
 * verified : le domaine a un serveur de messagerie (MX) ou au moins une adresse (A)
 * no_mail : le domaine existe mais n'a ni MX ni A (accepté, à vérifier par Jason)
 * nxdomain : le domaine n'existe pas (refusé)
 * unknown : pas de réponse exploitable dans le délai (accepté)
 */
export type DomainCheck = 'verified' | 'no_mail' | 'nxdomain' | 'unknown';

type DohAnswer = { Status?: unknown; Answer?: unknown };

async function query(name: string, type: 'MX' | 'A', fetchFn: typeof fetch, signal: AbortSignal): Promise<'yes' | 'empty' | 'nxdomain' | 'unknown'> {
  const res = await fetchFn(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal });
  if (!res.ok) return 'unknown';
  const j = (await res.json()) as DohAnswer;
  if (j.Status === 3) return 'nxdomain';
  if (j.Status !== 0) return 'unknown';
  const code = type === 'MX' ? 15 : 1;
  return Array.isArray(j.Answer) && j.Answer.some((a) => (a as { type?: unknown })?.type === code) ? 'yes' : 'empty';
}

export async function checkEmailDomain(email: string, fetchFn: typeof fetch, timeoutMs = DNS_TIMEOUT_MS): Promise<DomainCheck> {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return 'unknown'; // domaine accentué (IDN) : on ne juge pas
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const work = (async (): Promise<DomainCheck> => {
    const mx = await query(domain, 'MX', fetchFn, ctrl.signal);
    if (mx === 'yes') return 'verified';
    if (mx === 'nxdomain') return 'nxdomain';
    const a = await query(domain, 'A', fetchFn, ctrl.signal);
    if (a === 'yes') return 'verified';
    if (a === 'nxdomain') return 'nxdomain';
    return mx === 'empty' && a === 'empty' ? 'no_mail' : 'unknown';
  })().catch((): DomainCheck => 'unknown');
  // Le délai s'applique même si fetch ignore le signal
  const late = new Promise<DomainCheck>((r) => ctrl.signal.addEventListener('abort', () => r('unknown')));
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}
