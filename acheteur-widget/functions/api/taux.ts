import { defaultDeps, type Env } from '../../src/server/handler';
import { handleTaux } from '../../src/server/taux';

/** Taux moyens du mois (BCL via BCE), pour la mensualité d'exemple. Aucune donnée personnelle. */
export const onRequestGet: PagesFunction<Env> = () => handleTaux(defaultDeps());
