/**
 * Tests des données transcrites depuis la feuille de personnage officielle
 * (Polaris 3e édition, Black Book Éditions).
 *
 * Exécution en Node pur :   node test/feuille.test.mjs
 *
 * Ces tests ne vérifient pas du code : ils verrouillent une TRANSCRIPTION. Leur
 * rôle est qu'une modification de `config.mjs` qui s'écarterait de la feuille
 * papier se signale immédiatement. Si la feuille et le livre divergent, corriger
 * la config ET le cas de test ensemble, en notant la source retenue.
 */

import { POLARIS } from "../module/config.mjs";
import { lireLocalisation } from "../module/dice/polaris-roll.mjs";

let echecs = 0;

/** Compare une valeur obtenue à celle attendue et journalise le verdict. */
function verifier(description, obtenu, attendu) {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!ok) echecs++;
  console.log(
    `${ok ? "PASS " : "ECHEC"}  ${description}` +
      (ok ? "" : `  — obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`)
  );
}

/* -------------------------------------------- */
/*  Table des marges                            */
/* -------------------------------------------- */

console.log("\n— Table des marges de réussite et d'échec —");

// Bornes de chaque tranche imprimée sur la feuille, plus un point intérieur.
const marges = [
  [1, 0], [2, 0],
  [3, 1], [4, 1],
  [5, 2], [6, 2],
  [7, 3], [8, 3], [9, 3],
  [10, 4], [12, 4],
  [13, 5], [14, 5],
  [15, 6], [19, 6],
  [20, 7], [24, 7],
  [25, 8], [34, 8],
  [35, 9], [100, 9]
];

for (const [marge, attendu] of marges) {
  verifier(`marge ${marge} → ±${attendu}`, POLARIS.modificateurDeMarge(marge), attendu);
}

// Une marge nulle n'est pas sur la table : aucun modificateur.
verifier("marge 0 → ±0", POLARIS.modificateurDeMarge(0), 0);

// La table s'exprime en ±, donc une marge d'échec se lit en valeur absolue.
verifier("marge -13 → ±5 (valeur absolue)", POLARIS.modificateurDeMarge(-13), 5);

/* -------------------------------------------- */
/*  Tables de localisation                      */
/* -------------------------------------------- */

console.log("\n— Localisations —");

// Transcription des deux lignes de la feuille, colonne par colonne.
const localisations = {
  contact: {
    tete: [1, 4], corps: [5, 10], brasDroit: [11, 13],
    brasGauche: [14, 16], jambeDroite: [17, 18], jambeGauche: [19, 20]
  },
  distance: {
    tete: [1, 2], corps: [3, 8], brasDroit: [9, 11],
    brasGauche: [12, 14], jambeDroite: [15, 17], jambeGauche: [18, 20]
  }
};

for (const [table, zones] of Object.entries(localisations)) {
  for (const [zone, [min, max]] of Object.entries(zones)) {
    verifier(`${table} : ${min} → ${zone}`, lireLocalisation(min, table), zone);
    verifier(`${table} : ${max} → ${zone}`, lireLocalisation(max, table), zone);
  }

  // Aucun trou ni recouvrement : les 20 faces tombent toutes sur une zone.
  const couverture = new Set();
  for (let de = 1; de <= 20; de++) {
    const zone = lireLocalisation(de, table);
    if (!zone) {
      console.log(`ECHEC  ${table} : le résultat ${de} ne touche aucune zone`);
      echecs++;
    }
    couverture.add(zone);
  }
  verifier(
    `${table} : les six zones sont atteignables`,
    couverture.size,
    Object.keys(POLARIS.localisations).length
  );
}

// Le contact et le tir ne partagent pas la même répartition : c'est tout
// l'intérêt d'avoir deux tables. Un 4 touche la tête au contact, le corps au tir.
verifier("un 4 touche la tête au contact", lireLocalisation(4, "contact"), "tete");
verifier("un 4 touche le corps à distance", lireLocalisation(4, "distance"), "corps");

/* -------------------------------------------- */
/*  Gravités de blessure                        */
/* -------------------------------------------- */

console.log("\n— Blessures —");

// Seuils de dégâts imprimés entre parenthèses sur chaque ligne.
const gravites = [
  [0, null], [4, null],
  [5, "legere"], [9, "legere"],
  [10, "moyenne"], [14, "moyenne"],
  [15, "grave"], [19, "grave"],
  [20, "critique"], [24, "critique"],
  [25, "mortelle"], [29, "mortelle"],
  [30, "destruction"], [99, "destruction"]
];

for (const [degats, attendu] of gravites) {
  verifier(`${degats} dégâts → ${attendu ?? "aucune blessure"}`, POLARIS.graviteBlessure(degats), attendu);
}

// La feuille imprime « Mort » plutôt qu'une case pour la tête et le corps sur la
// dernière ligne : ces cases n'existent donc pas dans la grille.
verifier("aucune case de destruction pour la tête", POLARIS.casesBlessure.destruction.tete, 0);
verifier("aucune case de destruction pour le corps", POLARIS.casesBlessure.destruction.corps, 0);

// Le corps encaisse une case légère de plus que les autres zones.
verifier("4 cases légères au corps", POLARIS.casesBlessure.legere.corps, 4);
verifier("3 cases légères à la tête", POLARIS.casesBlessure.legere.tete, 3);

// Malus généraux de la colonne de droite.
const malus = { legere: -1, moyenne: -3, grave: -5, critique: -10, mortelle: -15, destruction: -30 };
for (const [gravite, attendu] of Object.entries(malus)) {
  verifier(`malus général « ${gravite} » = ${attendu}`, POLARIS.gravitesBlessure[gravite].malus, attendu);
}

// Malus propres à une case, qui priment sur celui de leur ligne.
verifier("une blessure critique aux membres ne pénalise pas", POLARIS.malusBlessure.critique.brasDroit, 0);
verifier("une blessure critique à la tête pénalise de -10", POLARIS.malusBlessure.critique.tete, -10);
verifier("une blessure grave au corps ne pénalise pas", POLARIS.malusBlessure.grave.corps, 0);

/* -------------------------------------------- */
/*  Aptitude naturelle                          */
/* -------------------------------------------- */

console.log("\n— Aptitude naturelle —");

// Transcription intégrale de la table du livre, valeur par valeur : c'est le
// cœur du système, chaque palier mérite son cas.
const aptitudes = [
  [3, -4],
  [4, -3],
  [5, -2],
  [6, -1], [7, -1],
  [8, 0], [9, 0],
  [10, 1], [11, 1], [12, 1],
  [13, 2], [14, 2], [15, 2],
  [16, 3], [17, 3], [18, 3],
  [19, 4], [20, 4], [21, 4],
  [22, 5], [23, 5], [24, 5],
  [25, 6]
];

for (const [niveau, attendu] of aptitudes) {
  verifier(`attribut ${niveau} → aptitude ${attendu}`, POLARIS.aptitudeNaturelle(niveau), attendu);
}

// La table est signée : un attribut faible pénalise, il n'est pas neutre.
// C'est ce qui rend un retour à 0 hors table particulièrement dangereux.
verifier("l'aptitude devient négative sous 8", POLARIS.aptitudeNaturelle(5) < 0, true);
verifier("l'aptitude est nulle à 8", POLARIS.aptitudeNaturelle(8), 0);

// ⚠️ Hors table : bornage, faute de données. Ces deux cas encodent une
// SUPPOSITION, pas une règle — à corriger dès que les bords sont connus.
verifier("sous la table, on borne sur -4", POLARIS.aptitudeNaturelle(1), -4);
verifier("au-dessus de la table, on borne sur 6", POLARIS.aptitudeNaturelle(30), 6);

// Monotonie : l'aptitude ne doit jamais décroître quand l'attribut croît.
let precedente = -Infinity;
let monotone = true;
for (let n = 3; n <= 25; n++) {
  const a = POLARIS.aptitudeNaturelle(n);
  if (a < precedente) monotone = false;
  precedente = a;
}
verifier("l'aptitude croît avec l'attribut", monotone, true);

/* -------------------------------------------- */
/*  Échelle qualitative                         */
/* -------------------------------------------- */

console.log("\n— Échelle des attributs —");

const echelons = [
  [1, "insignifiant"], [2, "insignifiant"],
  [3, "tresFaible"], [5, "tresFaible"],
  [6, "faible"], [8, "faible"],
  [9, "moyen"], [12, "moyen"],
  [13, "fort"], [15, "fort"],
  [16, "tresFort"], [18, "tresFort"],
  [19, "exceptionnel"], [20, "exceptionnel"],
  [21, "surhumain"], [40, "surhumain"]
];

for (const [niveau, echelon] of echelons) {
  verifier(
    `attribut ${niveau} → ${echelon}`,
    POLARIS.descriptionAttribut(niveau),
    `POLARIS.EchelleAttribut.${echelon}`
  );
}

// L'échelle ne doit laisser aucun trou entre 1 et 30.
let trous = 0;
for (let n = 1; n <= 30; n++) if (!POLARIS.descriptionAttribut(n)) trous++;
verifier("aucun niveau sans qualification", trous, 0);

/* -------------------------------------------- */
/*  Tables de conversion des secondaires        */
/* -------------------------------------------- */

console.log("\n— Tables de conversion —");

// Les secondaires n'utilisent PAS la table des aptitudes naturelles. Ce test
// existe pour empêcher qu'on les y branche par commodité un jour de fatigue.
const tablesAttendues = {
  modifDommages: "modifDommages",
  resistanceDommages: "resistanceDommages",
  resistanceDrogue: "resistancesNaturelles",
  resistanceMaladie: "resistancesNaturelles"
};

for (const [secondaire, table] of Object.entries(tablesAttendues)) {
  verifier(
    `« ${secondaire} » passe par la table « ${table} »`,
    POLARIS.attributsSecondaires[secondaire].table,
    table
  );
}

// Tant qu'une table est vide, la valeur brute passe sans être altérée.
for (const cle of Object.keys(POLARIS.tablesConversion)) {
  if (POLARIS.tablesConversion[cle]) continue;
  verifier(`table « ${cle} » vide : valeur brute conservée`, POLARIS.convertir(cle, 7), 7);
}

/* -------------------------------------------- */
/*  Attributs secondaires                       */
/* -------------------------------------------- */

console.log("\n— Attributs secondaires —");

// Jeu d'attributs de référence, choisi pour produire des sommes impaires et
// exposer ainsi la convention d'arrondi.
const niveaux = { for: 10, con: 11, coo: 8, ada: 7, per: 6, int: 9, vol: 12, pre: 5, chc: 4 };

// Formules imprimées sur la feuille, arrondi à l'inférieur (⚠️ non confirmé).
verifier("Réaction (ADA+PER)/2", POLARIS.attributsSecondaires.reaction.formule(niveaux), 6);
verifier("Drogue (CON+VOL)/2", POLARIS.attributsSecondaires.resistanceDrogue.formule(niveaux), 11);
verifier("Souffle (CON+VOL)/2", POLARIS.attributsSecondaires.souffle.formule(niveaux), 11);
verifier("Maladie, poison & radiation (CON)", POLARIS.attributsSecondaires.resistanceMaladie.formule(niveaux), 11);

// Les secondaires sans formule sur la feuille restent en saisie manuelle.
for (const cle of ["seuilEtourdissement", "seuilInconscience", "modifDommages", "resistanceDommages"]) {
  verifier(`« ${cle} » sans formule, saisi à la main`, POLARIS.attributsSecondaires[cle].formule, null);
}

// L'initiative démarre à la Réaction, elle ne se lance pas.
verifier("l'initiative démarre à la Réaction", POLARIS.initiative.secondaireDeDepart, "reaction");

/* -------------------------------------------- */
/*  Coût des attributs à la création            */
/* -------------------------------------------- */

console.log("\n— Achat des attributs —");

const cout = POLARIS.creation.coutAttribut;

verifier("un attribut démarre à 7", POLARIS.creation.attributs.niveauDepart, 7);
verifier("rester à 7 est gratuit", cout(7), 0);

// Tranche à 1 point : de 8 à 15.
verifier("monter à 8 coûte 1", cout(8), 1);
verifier("monter à 15 coûte 8", cout(15), 8);

// Tranche à 2 points : de 16 à 18. Le cumul se poursuit, il ne repart pas.
verifier("monter à 16 coûte 8 + 2 = 10", cout(16), 10);
verifier("monter à 18 coûte 8 + 6 = 14", cout(18), 14);

// Tranche à 3 points : 19 et 20.
verifier("monter à 19 coûte 14 + 3 = 17", cout(19), 17);
verifier("monter à 20 coûte 14 + 6 = 20", cout(20), 20);

// Le coût est stationnaire puis croissant : chaque niveau coûte au moins autant
// que le précédent. C'est ce qui rend un personnage extrême cher à construire.
let croissant = true;
for (let n = 9; n <= 20; n++) {
  if (cout(n) - cout(n - 1) < cout(n - 1) - cout(n - 2)) croissant = false;
}
verifier("le coût marginal ne redescend jamais", croissant, true);

// Descendre sous le niveau de départ ne rend pas de points.
verifier("un niveau inférieur au départ ne coûte rien", cout(5), 0);

/* -------------------------------------------- */
/*  Ambiance et Chance                          */
/* -------------------------------------------- */

console.log("\n— Ambiance de campagne —");

verifier("ambiance réaliste : Chance 11", POLARIS.ambiances.realiste.chance, 11);
verifier("ambiance intermédiaire : Chance 13", POLARIS.ambiances.intermediaire.chance, 13);
verifier("ambiance héroïque : Chance 15", POLARIS.ambiances.heroique.chance, 15);

// Hors de Foundry, l'accesseur doit retomber sur l'ambiance par défaut plutôt
// que d'échouer sur un `game` absent.
verifier("sans monde, on retombe par défaut", POLARIS.ambianceCourante(), POLARIS.ambianceParDefaut);
verifier("la Chance suit l'ambiance", POLARIS.chanceDeLAmbiance(), 13);

// La Chance ne s'achète pas : elle est le seul attribut hors du budget.
const repartissables = POLARIS.creation.attributs.repartissables;
verifier("huit attributs répartissables", repartissables.length, 8);
verifier("la Chance est hors budget", repartissables.includes("chc"), false);
verifier(
  "les huit autres attributs le sont tous",
  Object.keys(POLARIS.attributs).filter((c) => c !== "chc").every((c) => repartissables.includes(c)),
  true
);

/* -------------------------------------------- */
/*  Catalogues de création                      */
/* -------------------------------------------- */

console.log("\n— Archétypes et types génétiques —");

const archetypes = Object.keys(POLARIS.creation.archetypes);
verifier("huit archétypes", archetypes.length, 8);
verifier("l'archétype par défaut existe", archetypes.includes("defaut"), true);

const types = Object.keys(POLARIS.creation.typesGenetiques);
verifier("quatre types génétiques", types.length, 4);

// Seul l'humain normal est gratuit ; c'est le seul coût que l'on connaisse.
verifier("l'humain normal est gratuit", POLARIS.creation.typesGenetiques.humainNormal.cout, 0);
verifier(
  "les trois autres types ont un coût encore inconnu",
  types.filter((t) => t !== "humainNormal").every((t) => POLARIS.creation.typesGenetiques[t].cout === null),
  true
);

// Les cinq étapes doivent toutes disposer de leur template.
verifier("cinq étapes de création", POLARIS.creation.etapes.length, 5);
verifier(
  "chaque étape a une clé exploitable comme nom de fichier",
  POLARIS.creation.etapes.every((e) => /^[a-zA-Z]+$/.test(e.cle)),
  true
);

// Le budget de points suit l'ambiance, et rien d'autre.
verifier("budget par défaut : 38 points", POLARIS.creation.pointsAttributs(), 38);

/* -------------------------------------------- */
/*  Portées                                     */
/* -------------------------------------------- */

console.log("\n— Portées —");

// En-tête « Portée (+0/-5/-10/-15) » de la table des armes de tir.
verifier(
  "les quatre paliers de portée",
  Object.values(POLARIS.porteesTir).map((p) => p.mod),
  [0, -5, -10, -15]
);

/* -------------------------------------------- */

console.log(echecs === 0 ? "\nTous les tests passent." : `\n${echecs} test(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
