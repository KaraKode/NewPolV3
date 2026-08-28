import { POLARIS } from "../config.mjs";

/**
 * Moteur de résolution de Polaris V3.
 *
 * Rappel de la mécanique, dite « en lecture directe » :
 *   - on lance 1d20 en visant le résultat le plus haut possible SANS dépasser
 *     ses chances de réussite ;
 *   - la marge de réussite est le résultat du dé lui-même, pas l'écart à la cible ;
 *   - tomber pile sur la cible est une réussite critique ;
 *   - un 20 naturel est un échec critique, sauf lorsque les chances atteignent
 *     20 ou plus : ce 20 devient alors une réussite critique.
 */

/**
 * @typedef {object} ResultatJet
 * @property {number}  de              Le résultat brut du d20.
 * @property {number}  chances         Les chances de réussite finales visées.
 * @property {boolean} reussite        Vrai si l'action est réussie.
 * @property {boolean} critique        Vrai en cas de réussite critique.
 * @property {boolean} echecCritique   Vrai en cas d'échec critique.
 * @property {number}  marge           Marge de réussite (0 en cas d'échec).
 * @property {number}  modificateurMarge  Modificateur que cette marge produit,
 *                                     lu dans la table des marges (0 à 9).
 * @property {string}  issue           Clé d'issue : critique | reussite | echec | echecCritique.
 */

/**
 * Interprète un résultat de dé au regard de chances de réussite.
 *
 * Fonction pure : aucune dépendance à Foundry, ce qui la rend directement
 * testable et permet de rejouer un jet sans relancer de dé.
 *
 * @param {number} de       Résultat du d20 (1 à 20).
 * @param {number} chances  Chances de réussite finales, modificateurs inclus.
 * @param {number} [maitrise=0]  Niveau de maîtrise, ajouté à la marge sur un critique.
 * @returns {ResultatJet}
 */
export function evaluerJet(de, chances, maitrise = 0) {
  return convertirMarge(evaluerIssue(de, chances, maitrise));
}

/**
 * Complète un résultat de jet du modificateur que sa marge produit, lu dans la
 * table des marges de réussite et d'échec de la feuille officielle.
 * @param {ResultatJet} resultat
 * @returns {ResultatJet}
 */
function convertirMarge(resultat) {
  return { ...resultat, modificateurMarge: POLARIS.modificateurDeMarge(resultat.marge) };
}

/**
 * Cœur de l'interprétation, sans la conversion de marge.
 * @returns {ResultatJet}
 */
function evaluerIssue(de, chances, maitrise = 0) {
  const faceMax = POLARIS.resolution.faceMax;
  const seuilImmunite = POLARIS.resolution.seuilImmuniteEchecCritique;

  const base = { de, chances, reussite: false, critique: false, echecCritique: false, marge: 0 };

  // Le 20 naturel : échec critique, sauf chances suffisamment hautes.
  if (de === faceMax) {
    if (chances >= seuilImmunite) {
      return { ...base, reussite: true, critique: true, marge: de + maitrise, issue: "critique" };
    }
    return { ...base, echecCritique: true, issue: "echecCritique" };
  }

  // Dépasser ses chances est un échec simple.
  if (de > chances) return { ...base, issue: "echec" };

  // Tomber pile sur ses chances est une réussite critique.
  if (de === chances) {
    return { ...base, reussite: true, critique: true, marge: de + maitrise, issue: "critique" };
  }

  // Réussite ordinaire : la marge est la valeur du dé.
  return { ...base, reussite: true, marge: de, issue: "reussite" };
}

/**
 * Calcule les chances de réussite d'une compétence pour un acteur.
 *
 * Chances = valeur globale de la compétence + malus de blessure + modificateurs,
 * la globale valant elle-même « aptitude naturelle des deux attributs + maîtrise »
 * (colonnes Base / Maît. / Glob. de la feuille officielle).
 *
 * Le malus de blessure est ajouté ici plutôt que dans la valeur globale : la
 * fiche continue ainsi d'afficher la valeur de la feuille papier, et le jet
 * seul tient compte de l'état de santé.
 *
 * @param {Actor}  acteur          L'acteur qui agit.
 * @param {string} cleCompetence   Clé dans POLARIS.competences.
 * @param {number} [modificateur=0]  Somme des modificateurs (difficulté, situation).
 * @returns {{chances: number, base: number, maitrise: number, malusBlessure: number, detail: object[]}}
 */
export function calculerChances(acteur, cleCompetence, modificateur = 0) {
  const definition = POLARIS.competences[cleCompetence];
  if (!definition) throw new Error(`Polaris | Compétence inconnue : ${cleCompetence}`);

  const attributs = acteur.system.attributs ?? {};
  const maitrise = acteur.system.competences?.[cleCompetence]?.maitrise ?? 0;
  const malusBlessure = acteur.system.sante?.malus ?? 0;

  const detail = (definition.attributs ?? []).map((cle) => {
    const actuel = attributs[cle]?.actuel ?? 0;
    return {
      cle,
      label: POLARIS.attributs[cle]?.abbr ?? cle,
      actuel,
      aptitude: POLARIS.aptitudeNaturelle(actuel)
    };
  });

  const base = detail.reduce((total, a) => total + a.aptitude, 0);

  return {
    chances: base + maitrise + malusBlessure + modificateur,
    base,
    maitrise,
    malusBlessure,
    detail
  };
}

/**
 * Effectue un jet de compétence complet et publie la carte de résultat.
 *
 * @param {object}  options
 * @param {Actor}   options.acteur         L'acteur qui agit.
 * @param {string}  options.cleCompetence  Clé dans POLARIS.competences.
 * @param {number}  [options.modificateur] Modificateur total appliqué aux chances.
 * @param {string}  [options.libelleDifficulte] Libellé de difficulté à afficher.
 * @returns {Promise<{roll: Roll, resultat: ResultatJet}>}
 */
export async function lancerCompetence({ acteur, cleCompetence, modificateur = 0, libelleDifficulte = "" }) {
  const { chances, base, maitrise, malusBlessure, detail } = calculerChances(
    acteur,
    cleCompetence,
    modificateur
  );

  const roll = new Roll(POLARIS.resolution.de);
  await roll.evaluate();

  const resultat = evaluerJet(roll.total, chances, maitrise);

  const contenu = await foundry.applications.handlebars.renderTemplate(
    `${POLARIS.TEMPLATES}/chat/jet-competence.hbs`,
    {
      nomCompetence: game.i18n.localize(POLARIS.competences[cleCompetence].label),
      libelleDifficulte,
      modificateur,
      base,
      maitrise,
      malusBlessure,
      detail,
      resultat,
      issueLabel: game.i18n.localize(`POLARIS.Issue.${resultat.issue}`)
    }
  );

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: acteur }),
    content: contenu,
    rolls: [roll],
    sound: CONFIG.sounds.dice
  });

  return { roll, resultat };
}

/**
 * Lit un résultat de dé dans une table de localisation.
 *
 * Fonction pure, donc testable hors de Foundry. Le contact et le tir n'ont pas
 * la même répartition : une arme de contact touche la tête sur 1-4, une arme de
 * tir seulement sur 1-2.
 *
 * @param {number} de       Résultat du dé de localisation.
 * @param {string} [table]  Clé dans POLARIS.tablesLocalisation.
 * @returns {string|null}   Clé de localisation, ou null hors des intervalles.
 */
export function lireLocalisation(de, table = POLARIS.tableLocalisationParDefaut) {
  const intervalles = POLARIS.tablesLocalisation[table]?.intervalles;
  if (!intervalles) throw new Error(`Polaris | Table de localisation inconnue : ${table}`);

  const entree = Object.entries(intervalles).find(([, [min, max]]) => de >= min && de <= max);
  return entree?.[0] ?? null;
}

/**
 * Détermine la localisation touchée par une blessure.
 * @param {object} [options]
 * @param {string} [options.table]  Clé dans POLARIS.tablesLocalisation.
 * @returns {Promise<{roll: Roll, cle: string|null, label: string}>}
 */
export async function lancerLocalisation({ table = POLARIS.tableLocalisationParDefaut } = {}) {
  const roll = new Roll(POLARIS.deLocalisation);
  await roll.evaluate();

  const cle = lireLocalisation(roll.total, table);
  return {
    roll,
    cle,
    label: cle ? game.i18n.localize(POLARIS.localisations[cle].label) : "—"
  };
}
