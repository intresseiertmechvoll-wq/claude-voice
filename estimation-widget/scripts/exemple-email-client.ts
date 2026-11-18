/** Génère docs/exemple-email-client.{html,txt} (bien fictif) pour voir l'e-mail reçu par le visiteur */
import { writeFileSync } from 'node:fs';
import config from '../config.json';
import data from '../data/communes.json';
import params from '../params.json';
import { estimate, type Params } from '../src/shared/engine';
import { clientEmail } from '../src/shared/email-client';
import type { Dataset } from '../src/shared/types';
import { validateSubmission } from '../src/shared/validation';
import { body } from '../tests/helpers';

const v = validateSubmission(body());
if (!v.ok) throw new Error('exemple invalide');
const est = estimate(v.value.answers, data as unknown as Dataset, params as Params);
const m = clientEmail(v.value, est, { agent: config.agent, phone: config.phone, contactUrl: config.contactUrl.fr, privacyUrl: config.privacyUrl.fr, date: new Date() });
writeFileSync(new URL('../docs/exemple-email-client.html', import.meta.url), m.html);
writeFileSync(new URL('../docs/exemple-email-client.txt', import.meta.url), `Objet : ${m.subject}\n\n${m.text}\n`);
console.log(m.subject);
