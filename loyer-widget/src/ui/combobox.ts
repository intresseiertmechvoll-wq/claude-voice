/** Recherche de commune : liste déroulante accessible (clavier + lecteur d'écran), avec autres noms (Kirchberg → Luxembourg) */
import { ALIASES } from '../shared/aliases';
import { normalize } from '../shared/communes';
import { esc } from './html';

type Match = { value: string; label: string };

/** Nom officiel pour un texte tapé (accents, majuscules et autres noms tolérés), sinon null */
export function resolveCommune(text: string, names: string[]): string | null {
  const q = normalize(text);
  if (!q) return null;
  const exact = names.find((n) => normalize(n) === q);
  if (exact) return exact;
  const alias = Object.entries(ALIASES).find(([a]) => normalize(a) === q);
  return alias ? alias[1] : null;
}

export function searchCommunes(text: string, names: string[], limit = 8): Match[] {
  const q = normalize(text);
  if (!q) return names.slice(0, limit).map((n) => ({ value: n, label: n }));
  const starts = (s: string) => normalize(s).startsWith(q);
  const direct = names.filter((n) => normalize(n).includes(q)).sort((a, b) => Number(!starts(a)) - Number(!starts(b)));
  const out: Match[] = direct.map((n) => ({ value: n, label: n }));
  for (const [alias, value] of Object.entries(ALIASES).sort(([a], [b]) => Number(!starts(a)) - Number(!starts(b)))) {
    if (normalize(alias).includes(q) && !out.some((m) => m.value === value)) out.push({ value, label: `${alias} → ${value}` });
  }
  return out.slice(0, limit);
}

export function setupCombobox(input: HTMLInputElement, list: HTMLUListElement, status: HTMLElement, names: string[], emptyText: string, onSelect: (name: string) => void): void {
  let matches: Match[] = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const highlight = (i: number) => {
    active = i;
    [...list.children].forEach((li, j) => li.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', `commune-opt-${i}`);
      (list.children[i] as HTMLElement).scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const open = () => {
    matches = searchCommunes(input.value, names);
    list.innerHTML = matches.length
      ? matches.map((m, i) => `<li id="commune-opt-${i}" role="option" aria-selected="false" data-value="${esc(m.value)}">${esc(m.label)}</li>`).join('')
      : `<li class="empty" role="option" aria-disabled="true" aria-selected="false">${esc(emptyText)}</li>`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    status.textContent = matches.length ? `${matches.length}` : emptyText;
    highlight(-1);
  };

  const choose = (name: string) => {
    input.value = name;
    onSelect(name);
    close();
  };

  input.addEventListener('input', open);
  input.addEventListener('focus', () => {
    if (input.value === '') open();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) open();
      if (matches.length) highlight(Math.min(active + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length) highlight(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      // Option surlignée, sinon texte reconnu (« dudelange », « Kirchberg »), sinon seule proposition restante
      const wasOpen = !list.hidden;
      const pick = active >= 0 ? matches[active]?.value : resolveCommune(input.value, names) ?? (wasOpen && matches.length === 1 ? matches[0].value : null);
      if (pick) {
        choose(pick);
        if (wasOpen) e.preventDefault(); // liste ouverte : Entrée choisit ; liste fermée : Entrée envoie l'étape
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });
  // mousedown plutôt que click : la sélection se fait avant que le champ perde le focus
  list.addEventListener('mousedown', (e) => {
    const li = (e.target as HTMLElement).closest('li[data-value]') as HTMLElement | null;
    if (li) {
      e.preventDefault();
      choose(li.dataset.value!);
    }
  });
  input.addEventListener('blur', () => {
    const exact = resolveCommune(input.value, names);
    if (exact && exact !== input.value) choose(exact);
    else close();
  });
}
