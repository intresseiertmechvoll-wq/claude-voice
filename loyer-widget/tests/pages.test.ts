import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { genererPage, genererSitemap, ROOT } from '../scripts/pages';

describe('Pages de présentation /fr/ /de/ /en/', () => {
  for (const lang of ['fr', 'de', 'en'] as const) {
    it(`${lang} : fichier à jour (sinon : npm run pages), indexable, outil intégré, aucune valeur manquante`, () => {
      const html = genererPage(lang);
      expect(readFileSync(join(ROOT, lang, 'index.html'), 'utf8')).toBe(html);
      expect(html).toContain(`<html lang="${lang}">`);
      expect(html).toContain(`<link rel="canonical" href="https://verlounen.lu/${lang}/" />`);
      expect(html).not.toContain('noindex');
      expect(html).toContain(`<div data-immobuild-loyer data-lang="${lang}"></div><script src="/embed.js" async></script>`);
      for (const mauvais of ['undefined', 'NaN', '{trimestre}', '{releve}', 'null']) expect(html).not.toContain(mauvais);
      // 8 régions × 2 exemples, chacun avec une fourchette
      expect((html.match(/class="range"/g) ?? []).length).toBe(16);
      // pas de style ni de script en ligne (CSP) : seul le script externe embed.js
      expect(html).not.toMatch(/<style|style="|<script>(?!<\/script>)/);
    });
  }
  it('sitemap à jour, avec les trois langues', () => {
    expect(readFileSync(join(ROOT, 'public/sitemap.xml'), 'utf8')).toBe(genererSitemap());
    expect((genererSitemap().match(/<loc>/g) ?? []).length).toBe(3);
  });
});
