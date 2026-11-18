import type { T } from '../i18n';
import { esc } from './html';

/**
 * Badge « Agence certifiée – Chambre immobilière ». Avec un lien, il ouvre la fiche de membre d'ImmoBuild Kohn
 * dans l'annuaire officiel de la Chambre immobilière (vérifiée : « Membre de la Chambre »).
 * Variante « dark » : sur le bandeau bleu de l'étape 1 ; « light » : sur fond clair (résultat).
 */
export function certifBadge(t: T, url: string | undefined, variant: 'dark' | 'light'): string {
  const body = `<img class="certif-img" src="/badge-chambre-immobiliere.webp" alt="" width="129" height="160" decoding="async">
    <span class="certif-text"><strong>${esc(t('certif.label'))}</strong><span>${esc(t('certif.org'))}</span>${
      url ? `<span class="certif-link">${esc(t('certif.link'))}<span class="sr-only"> ${esc(t('certif.newTab'))}</span></span>` : ''
    }</span>`;
  const cls = `certif certif-${variant}`;
  return url
    ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${body}</a>`
    : `<p class="${cls}">${body}</p>`;
}
