import type { T } from '../i18n';
import { esc } from './html';

const sources: Partial<Record<number, string>> = {
  // Observatoire de l’Habitat / STATEC, consulté le 18/11/2026 (seuil après sélection et traitements).
  1: 'https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/',
  // Guichet.lu, consulté le 18/11/2026 : « Un prêt climatique, garanti par l’État et proposé par les établissements
  // bancaires agréés, peut contribuer au financement de vos travaux d’assainissement énergétique. »
  2: 'https://guichet.public.lu/fr/citoyens/life-event/logement/performance-energetique-logement.html',
  // Observatoire de l’Habitat, consulté le 18/11/2026 (série séparée, hors annexes).
  4: 'https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-prix-affines-hors-annexes-par-commune/',
  // Observatoire de l’Habitat, consulté le 18/11/2026 (loyers demandés avant négociation).
  5: 'https://data.public.lu/fr/datasets/loyers-annonces-des-logements-par-commune/',
};

export function renderFact(step: number, t: T): string {
  const url = sources[step];
  if (!url) return '';
  return `<details class="step-fact">
  <summary>${esc(t('facts.title'))}</summary>
  <p>${esc(t(`facts.step${step}`))} <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t('facts.source'))}</a></p>
</details>`;
}
