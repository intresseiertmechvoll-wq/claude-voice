import type { T } from '../i18n';
import { esc } from './html';

export type FactKey = 'step1' | 'surface' | 'energie' | 'step4' | 'step5';

const sources: Record<FactKey, string> = {
  // Observatoire de l’Habitat / STATEC, consulté le 18/11/2026 (seuil après sélection et traitements).
  step1: 'https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/',
  // Guichet.lu / ILNAS, consulté le 18/11/2026 (pièces à vivre, pièces d’eau, dégagements intérieurs).
  surface: 'https://guichet.public.lu/fr/citoyens/logement/construction-renovation-transformation/surface-habitable/calcul-surface-habitable.html',
  // Guichet.lu, consulté le 18/11/2026 : « Un prêt climatique, garanti par l’État et proposé par les établissements
  // bancaires agréés, peut contribuer au financement de vos travaux d’assainissement énergétique. »
  energie: 'https://guichet.public.lu/fr/citoyens/life-event/logement/performance-energetique-logement.html',
  // Observatoire de l’Habitat, consulté le 18/11/2026 (série séparée, hors annexes).
  step4: 'https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-prix-affines-hors-annexes-par-commune/',
  // Observatoire de l’Habitat, consulté le 18/11/2026 (loyers demandés avant négociation).
  step5: 'https://data.public.lu/fr/datasets/loyers-annonces-des-logements-par-commune/',
};

/** Petite information sourcée, repliée par défaut. « surface » se place sous le champ de surface (étape 2). */
export function renderFact(key: string, t: T): string {
  const url = sources[key as FactKey];
  if (!url) return '';
  return `<details class="step-fact">
  <summary>${esc(t(key === 'surface' ? 'facts.surfaceTitle' : 'facts.title'))}</summary>
  <p>${esc(t(`facts.${key}`))} <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t('facts.source'))}</a></p>
</details>`;
}
