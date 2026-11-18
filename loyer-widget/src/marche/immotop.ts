/**
 * Lecture des pages de résultats immotop.lu : les annonces sont dans les données de la page
 * (<script id="__NEXT_DATA__">), avec loyer, surface, chambres, commune et pays.
 * On ne garde que ces champs : jamais le nom de l'agence ou de l'agent, ni les photos.
 */
export interface AnnonceImmotop {
  loyer: number;
  surface: number | null;
  chambres: number | null;
  type: string;
  localite: string;
  pays: string;
  url: string;
}

export interface PageImmotop {
  annonces: AnnonceImmotop[];
  page: number;
  pages: number;
  total: number;
}

const nombre = (v: unknown): number | null => {
  const m = String(v ?? '').replace(/[\s  ]/g, '').match(/\d+(?:[.,]\d+)?/);
  return m ? Math.round(Number(m[0].replace(',', '.'))) : null;
};

export function extraireImmotop(html: string): PageImmotop {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('immotop : données de la page (__NEXT_DATA__) introuvables ; la page a peut-être changé de format');
  const d = JSON.parse(m[1]);
  const queries: any[] = d?.props?.pageProps?.dehydratedState?.queries ?? [];
  const q = queries.map((x) => x?.state?.data).find((x) => Array.isArray(x?.results));
  if (!q) throw new Error('immotop : liste des annonces introuvable dans la page ; la page a peut-être changé de format');
  const annonces: AnnonceImmotop[] = [];
  for (const r of q.results as any[]) {
    const e = r?.realEstate;
    const p = e?.properties?.[0];
    const loyer = nombre(e?.price?.value ?? p?.price?.value);
    const url = r?.seo?.url ?? (e?.id ? `https://www.immotop.lu/annonces/${e.id}/` : '');
    if (!e || !p || loyer === null || !url || e.contract !== 'rent') continue;
    annonces.push({
      loyer,
      surface: nombre(p.surface),
      chambres: nombre(p.bedRoomsNumber),
      type: String(p.typology?.name ?? e.typology?.name ?? ''),
      localite: String(p.location?.city ?? ''),
      pays: String(p.location?.nation?.id ?? 'LU').toUpperCase(),
      url,
    });
  }
  return { annonces, page: Number(q.currentPage ?? 1), pages: Number(q.maxPages ?? 1), total: Number(q.totalAds ?? q.count ?? annonces.length) };
}
