import type { Env } from '../../src/server/handler';
import { handleSimulate } from '../../src/server/simulate';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleSimulate(request, env);
