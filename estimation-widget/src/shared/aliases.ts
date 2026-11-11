/**
 * Autres noms reconnus par la recherche de commune → nom officiel.
 * Noms allemands et luxembourgeois des communes, quartiers de Luxembourg-Ville,
 * localités qui font partie d'une commune (Tétange → Kayl…).
 * À compléter au besoin : clé = nom tel qu'on le tape, valeur = nom de data/cantons.json.
 */
const LUX_QUARTIERS = [
  'Luxembourg-Ville', 'Luxembourg Ville', 'Luxembourg City', 'Ville de Luxembourg', 'Stadt Luxemburg', 'Luxemburg', 'Lëtzebuerg',
  'Kirchberg', 'Bonnevoie', 'Belair', 'Limpertsberg', 'Gasperich', 'Cloche d’Or', 'Merl', 'Hollerich', 'Cents', 'Hamm', 'Pulvermühl',
  'Neudorf', 'Weimerskirch', 'Eich', 'Dommeldange', 'Beggen', 'Mühlenbach', 'Rollingergrund', 'Cessange', 'Gare', 'Ville-Haute',
  'Grund', 'Clausen', 'Pfaffenthal', 'Kalchesbrück', 'Weimershof', 'Neudorf-Weimershof', 'Bonnevoie-Nord', 'Bonnevoie-Sud', 'Verlorenkost',
];

export const ALIASES: Record<string, string> = {
  ...Object.fromEntries(LUX_QUARTIERS.map((q) => [q, 'Luxembourg'])),
  // Sud (canton d'Esch)
  Düdelingen: 'Dudelange', Diddeleng: 'Dudelange', Budersberg: 'Dudelange', Burange: 'Dudelange',
  Bettemburg: 'Bettembourg', Beetebuerg: 'Bettembourg', Noertzange: 'Bettembourg', Huncherange: 'Bettembourg', Fennange: 'Bettembourg', Abweiler: 'Bettembourg',
  'Esch an der Alzette': 'Esch-sur-Alzette', 'Esch/Alzette': 'Esch-sur-Alzette', 'Esch-Uelzecht': 'Esch-sur-Alzette', Esch: 'Esch-sur-Alzette',
  Differdingen: 'Differdange', Déifferdeng: 'Differdange', Oberkorn: 'Differdange', Niederkorn: 'Differdange', Lasauvage: 'Differdange', Fousbann: 'Differdange',
  Petingen: 'Pétange', Péiteng: 'Pétange', Rodange: 'Pétange', Lamadelaine: 'Pétange',
  Rümelingen: 'Rumelange', Rëmeleng: 'Rumelange',
  Schifflingen: 'Schifflange', Schëffleng: 'Schifflange',
  Keel: 'Kayl', Tétange: 'Kayl', Téiteng: 'Kayl',
  Monnerich: 'Mondercange', Monnerech: 'Mondercange', Pontpierre: 'Mondercange', Foetz: 'Mondercange',
  Sassenheim: 'Sanem', Suessem: 'Sanem', Belvaux: 'Sanem', Soleuvre: 'Sanem', Ehlerange: 'Sanem',
  Frisingen: 'Frisange', Fréiseng: 'Frisange', Aspelt: 'Frisange', Hellange: 'Frisange',
  Leudelingen: 'Leudelange', Leideleng: 'Leudelange',
  Réiser: 'Roeser', Crauthem: 'Roeser', Berchem: 'Roeser', Peppange: 'Roeser', Livange: 'Roeser', Bivange: 'Roeser',
  Bascharage: 'Käerjeng', Niederkerschen: 'Käerjeng', Hautcharage: 'Käerjeng', Clemency: 'Käerjeng', Fingig: 'Käerjeng', Linger: 'Käerjeng',
  // Centre
  Howald: 'Hesperange', Hesper: 'Hesperange', Itzig: 'Hesperange', Fentange: 'Hesperange', Alzingen: 'Hesperange',
  Bartreng: 'Bertrange', Stroossen: 'Strassen', Walfer: 'Walferdange', Steesel: 'Steinsel', Senningerberg: 'Niederanven', Senningen: 'Niederanven',
  Nidderaanwen: 'Niederanven', Schëtter: 'Schuttrange', Munsbach: 'Schuttrange', Conter: 'Contern', Mamer: 'Mamer', Capellen: 'Mamer',
  Stengefort: 'Steinfort', Kielen: 'Kehlen', Koplescht: 'Kopstal', Bridel: 'Kopstal', Lëntzweiler: 'Lorentzweiler', Lëntgen: 'Lintgen',
  Miersch: 'Mersch', 'Colmer-Bierg': 'Colmar-Berg', Jonglënster: 'Junglinster',
  // Est et nord
  'Bad Mondorf': 'Mondorf-les-Bains', Mondorf: 'Mondorf-les-Bains', Munneref: 'Mondorf-les-Bains', Remerschen: 'Schengen',
  Réimech: 'Remich', Gréiwemaacher: 'Grevenmacher', Iechternach: 'Echternach',
  Ettelbrück: 'Ettelbruck', Ettelbréck: 'Ettelbruck', Dikrech: 'Diekirch', Wolz: 'Wiltz', Wilz: 'Wiltz', Klierf: 'Clervaux', Veianen: 'Vianden',
  Réiden: 'Redange-sur-Attert', Redange: 'Redange-sur-Attert',
};
