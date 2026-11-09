/** Recherche de commune : liste déroulante accessible (clavier + lecteur d'écran) */
import { normalize } from '../shared/communes';
import { esc } from './html';

export function setupCombobox(input: HTMLInputElement, list: HTMLUListElement, status: HTMLElement, names: string[], emptyText: string, onSelect: (name: string) => void): void {
  let matches: string[] = [];
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
    const q = normalize(input.value);
    matches = q ? names.filter((n) => normalize(n).includes(q)).sort((a, b) => Number(!normalize(a).startsWith(q)) - Number(!normalize(b).startsWith(q))) : names;
    matches = matches.slice(0, 8);
    list.innerHTML = matches.length
      ? matches.map((n, i) => `<li id="commune-opt-${i}" role="option" aria-selected="false" data-value="${esc(n)}">${esc(n)}</li>`).join('')
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
    } else if (e.key === 'Enter' && !list.hidden && active >= 0) {
      e.preventDefault();
      choose(matches[active]);
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
    // Si le texte correspond exactement à une commune (accents et majuscules ignorés), on la retient
    const exact = names.find((n) => normalize(n) === normalize(input.value));
    if (exact && exact !== input.value) choose(exact);
    else close();
  });
}
