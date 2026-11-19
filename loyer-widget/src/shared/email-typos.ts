/**
 * Fautes de frappe courantes dans les adresses e-mail. Utilisé dans le formulaire (suggestion au
 * visiteur) et dans l'e-mail du lead (avertissement à Jason si le visiteur n'a pas corrigé).
 */
const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.fr': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'pt.l': 'pt.lu', 'pt.lux': 'pt.lu',
};

/** Adresse corrigée si la fin ressemble à une faute de frappe connue, sinon null */
export function suggestionEmail(value: string): string | null {
  const at = value.lastIndexOf('@');
  if (at <= 0) return null;
  const domaine = value.slice(at + 1).toLowerCase();
  // Fautes de frappe courantes sur la fin de l'adresse : « .con », « .cmo », « .comm », « .lux »
  const fin = domaine.replace(/\.(con|cmo|ocm|comm|vom|xom)$/, '.com').replace(/\.(lux|lu\.)$/, '.lu');
  const fix = EMAIL_TYPOS[fin] ?? (fin !== domaine ? fin : undefined);
  return fix ? value.slice(0, at + 1) + fix : null;
}
