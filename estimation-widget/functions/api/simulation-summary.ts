import type { Env } from '../../src/server/handler';
import { handleSimulationSummary } from '../../src/server/simulate';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleSimulationSummary(request, env);
