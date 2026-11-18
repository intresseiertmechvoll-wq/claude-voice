/**
 * Aucun test ne doit sortir sur Internet : le fetch global (utilisé par défaut pour le géoportail)
 * échoue tout de suite, comme un géoportail en panne. Les tests du géoportail passent leur propre geoFetch.
 */
import { vi } from 'vitest';

vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
  throw new TypeError(`réseau coupé pendant les tests : ${String(input instanceof Request ? input.url : input)}`);
});
