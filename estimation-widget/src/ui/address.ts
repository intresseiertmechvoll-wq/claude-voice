/**
 * Adresse avec propositions du géoportail (même modèle accessible que la liste des communes :
 * combobox ARIA, flèches, Entrée, Échap). Le texte libre reste accepté : sans réponse du serveur,
 * le champ se comporte comme un champ texte normal.
 */
import { esc } from './html';

/** « L-3429 » jamais coupé en fin de ligne */
export const nowrapZip = (label: string) => esc(label).replace(/\bL-\d{4}\b/g, '<span class="nowrap">$&</span>');

export interface AddressComboOptions {
  /** propositions pour un texte tapé ; [] en cas de panne */
  suggest: (q: string, signal: AbortSignal) => Promise<string[]>;
  onSelect: (label: string) => void;
  /** texte annoncé aux lecteurs d'écran quand des propositions s'affichent */
  countText: (n: number) => string;
  minChars?: number;
  delayMs?: number;
}

export function setupAddressCombobox(input: HTMLInputElement, list: HTMLUListElement, status: HTMLElement, o: AddressComboOptions): void {
  const min = o.minChars ?? 4;
  let matches: string[] = [];
  let active = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: AbortController | null = null;

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
      input.setAttribute('aria-activedescendant', `rue-opt-${i}`);
      (list.children[i] as HTMLElement).scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const show = (labels: string[]) => {
    matches = labels;
    if (!labels.length || document.activeElement !== input) return close();
    list.innerHTML = labels.map((l, i) => `<li id="rue-opt-${i}" role="option" aria-selected="false" data-value="${esc(l)}">${nowrapZip(l)}</li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    status.textContent = o.countText(labels.length);
    highlight(-1);
  };

  const choose = (label: string) => {
    input.value = label;
    close();
    o.onSelect(label);
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    pending?.abort();
    const q = input.value.trim();
    if (q.length < min) return show([]);
    timer = setTimeout(() => {
      const c = new AbortController();
      pending = c;
      const stop = setTimeout(() => c.abort(), 6000);
      o.suggest(q, c.signal)
        .finally(() => clearTimeout(stop))
        .then((labels) => {
          if (pending === c && input.value.trim() === q) show(labels);
        })
        .catch(() => {});
    }, o.delayMs ?? 300);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      if (!matches.length) return;
      e.preventDefault();
      if (list.hidden) show(matches);
      highlight(Math.min(active + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (list.hidden) return;
      e.preventDefault();
      highlight(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      // Liste ouverte avec une proposition surlignée : Entrée la choisit ; sinon Entrée envoie l'étape
      if (!list.hidden && active >= 0) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === 'Escape') {
      if (!list.hidden) e.preventDefault();
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
    clearTimeout(timer);
    close();
  });
}
