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

import fs from "node:fs";
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
/*  Intégrité des fichiers de langue            */
/* -------------------------------------------- */

console.log("\n— Fichiers de langue —");

// Foundry passe le fichier de langue dans `expandObject` : les clés pointées
// deviennent un objet imbriqué. Une clé ne peut donc pas être À LA FOIS une
// feuille et le parent d'une autre — « X » et « X.description » se battent pour
// la même place, et Foundry REJETTE ALORS LE FICHIER ENTIER : plus une seule
// traduction n'est chargée, dans toute l'interface.
for (const fichier of ["lang/fr.json", "lang/en.json"]) {
  const traductions = JSON.parse(fs.readFileSync(fichier, "utf8"));
  const cles = Object.keys(traductions);

  const collisions = cles.filter((cle) => cles.some((autre) => autre.startsWith(`${cle}.`)));
  verifier(`${fichier} : aucune clé à la fois feuille et parent`, collisions, []);

  const nonChaines = Object.entries(traductions).filter(([, v]) => typeof v !== "string");
  verifier(`${fichier} : toutes les valeurs sont des chaînes`, nonChaines.map(([k]) => k), []);
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

// Seuils de choc. L'inconscience se déduit de l'étourdissement, pas des
// attributs : elle reçoit les totaux déjà calculés en second argument.
const secondaire = (cle, totaux = {}) => POLARIS.attributsSecondaires[cle].formule(niveaux, totaux);

// (FOR 10 + CON 11 + VOL 12) / 3 = 11
verifier("Seuil d'étourdissement (FOR+CON+VOL)/3", secondaire("seuilEtourdissement"), 11);
verifier(
  "Seuil d'inconscience = étourdissement + 10",
  secondaire("seuilInconscience", { seuilEtourdissement: 11 }),
  21
);

// Le point important : l'inconscience suit l'étourdissement MODIFIÉ. Un bonus
// de +3 sur l'étourdissement doit repousser l'inconscience d'autant.
verifier(
  "un bonus sur l'étourdissement repousse l'inconscience",
  secondaire("seuilInconscience", { seuilEtourdissement: 14 }),
  24
);

// L'étourdissement doit être déclaré AVANT l'inconscience, sans quoi cette
// dernière lirait une valeur encore absente.
const ordre = Object.keys(POLARIS.attributsSecondaires);
verifier(
  "l'étourdissement est calculé avant l'inconscience",
  ordre.indexOf("seuilEtourdissement") < ordre.indexOf("seuilInconscience"),
  true
);

// Le modificateur de dommages lit la Force brute, sa table fait le reste.
verifier("modif. de dommages : formule = Force brute", secondaire("modifDommages"), niveaux.for);

// Les huit secondaires ont désormais tous leur formule : aucun ne reste en
// saisie manuelle. Ce test signalera toute régression sur ce point.
verifier(
  "les huit secondaires ont une formule",
  Object.values(POLARIS.attributsSecondaires).every((d) => typeof d.formule === "function"),
  true
);

/* -------------------------------------------- */
/*  Modificateur de dommages au contact         */
/* -------------------------------------------- */

console.log("\n— Modificateur de dommages (contact) —");

const modDom = (force) => POLARIS.convertir("modifDommages", force);

// Transcription de la table, bornes de chaque tranche. Les deux premières
// valeurs ont été rectifiées par l'auteur après une transcription fautive :
// la table s'écarte par paliers de 2 aux extrêmes, comme les résistances.
const dommages = [
  [1, -6], [2, -6],
  [3, -4], [4, -4],
  [5, -2], [6, -2],
  [7, -1], [8, -1],
  [9, 0], [11, 0],
  [12, 1], [13, 1],
  [14, 2], [15, 2],
  [16, 3], [17, 3],
  [18, 4], [19, 4],
  [20, 5], [21, 5]
];

for (const [force, attendu] of dommages) {
  verifier(`Force ${force} → ${attendu >= 0 ? "+" : ""}${attendu}`, modDom(force), attendu);
}

// « 22 et au-delà : +1 tous les 2 niveaux ».
verifier("Force 22 → +6", modDom(22), 6);
verifier("Force 23 → +6", modDom(23), 6);
verifier("Force 24 → +7", modDom(24), 7);
verifier("Force 25 → +7", modDom(25), 7);
verifier("Force 30 → +10", modDom(30), 10);

// La table doit être monotone : c'est ce qui a révélé la coquille de la source
// (« 1-2 = -1, 3-4 = -4 » aurait rendu un Force 3 plus faible qu'un Force 1).
let monotoneDommages = true;
for (let f = 2; f <= 40; f++) {
  if (modDom(f) < modDom(f - 1)) monotoneDommages = false;
}
verifier("le modificateur ne décroît jamais quand la Force monte", monotoneDommages, true);

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
/*  Résistances naturelles                      */
/* -------------------------------------------- */

console.log("\n— Résistances naturelles —");

const resNat = (v) => POLARIS.convertir("resistancesNaturelles", v);

const naturelles = [
  [1, 6], [2, 6],
  [3, 4], [4, 4],
  [5, 2], [6, 2],
  [7, 1], [8, 1],
  [9, 0], [11, 0],
  [12, -1], [13, -1],
  [14, -2], [15, -2],
  [16, -3], [17, -3],
  [18, -4], [19, -4],
  [20, -5], [21, -5]
];

for (const [valeur, attendu] of naturelles) {
  verifier(`niveau ${valeur} → ${attendu}`, resNat(valeur), attendu);
}

// « 22 et au-delà : -1 tous les 2 niveaux ».
verifier("niveau 22 → -6", resNat(22), -6);
verifier("niveau 23 → -6", resNat(23), -6);
verifier("niveau 24 → -7", resNat(24), -7);
verifier("niveau 40 → -15", resNat(40), -15);

// Sens de la table : plus l'attribut monte, plus la valeur baisse. C'est
// l'inverse du modificateur de dommages, d'où ce test qui fige la direction.
let decroissante = true;
for (let v = 2; v <= 40; v++) if (resNat(v) > resNat(v - 1)) decroissante = false;
verifier("la résistance naturelle décroît quand l'attribut monte", decroissante, true);

// Les deux résistances naturelles partagent la table mais pas la formule :
// maladie/poison/radiations lit la Constitution seule, les drogues (CON+VOL)/2.
verifier("maladie, poison, radiations = Constitution", secondaire("resistanceMaladie"), niveaux.con);
verifier("drogues = (CON+VOL)/2", secondaire("resistanceDrogue"), 11);

/* -------------------------------------------- */
/*  Résistance aux dommages                     */
/* -------------------------------------------- */

console.log("\n— Résistance aux dommages —");

const resDom = (v) => POLARIS.convertir("resistanceDommages", v);

// Table à tranches de quatre niveaux, lue sur FOR + CON.
const dommagesRes = [
  [2, 6], [5, 6],
  [6, 4], [9, 4],
  [10, 2], [13, 2],
  [14, 1], [17, 1],
  [18, 0], [21, 0],
  [22, -1], [25, -1],
  [26, -2], [29, -2],
  [30, -3], [33, -3],
  [34, -4], [37, -4],
  [38, -5], [41, -5]
];

for (const [somme, attendu] of dommagesRes) {
  verifier(`FOR+CON ${somme} → ${attendu}`, resDom(somme), attendu);
}

// « 42 et au-delà : -1 tous les 4 niveaux ».
verifier("FOR+CON 42 → -6", resDom(42), -6);
verifier("FOR+CON 45 → -6", resDom(45), -6);
verifier("FOR+CON 46 → -7", resDom(46), -7);
verifier("FOR+CON 50 → -8", resDom(50), -8);

// Toutes les tranches font exactement quatre niveaux — c'est ce qui a permis de
// lire « -25 » comme « 22-25 » dans la source.
const tranchesResDom = POLARIS.tablesConversion.resistanceDommages.tranches;
verifier(
  "toutes les tranches couvrent quatre niveaux",
  tranchesResDom.every((t) => t.max - t.min === 3),
  true
);
verifier("aucun trou entre les tranches", tranchesResDom.every((t, i) => i === 0 || t.min === tranchesResDom[i - 1].max + 1), true);

// La formule somme les deux attributs : une moyenne ne pourrait jamais
// atteindre les tranches hautes de la table.
verifier("résistance aux dommages = FOR + CON", secondaire("resistanceDommages"), niveaux.for + niveaux.con);

/* -------------------------------------------- */
/*  Souffle                                     */
/* -------------------------------------------- */

console.log("\n— Souffle —");

verifier("Souffle (CON+VOL)/2", secondaire("souffle"), 11);
// Confirmé sans conversion : c'est un nombre de tours, pas un modificateur.
verifier("le Souffle ne passe par aucune table", POLARIS.attributsSecondaires.souffle.table, null);
verifier(
  "le Souffle s'exprime en tours de combat",
  POLARIS.attributsSecondaires.souffle.unite,
  "POLARIS.Unite.toursCombat"
);

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

// Les types génétiques ont leur propre section de tests plus bas ; on ne
// vérifie ici que leur présence aux côtés des archétypes.
verifier("quatre types génétiques", Object.keys(POLARIS.creation.typesGenetiques).length, 4);

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
/*  Types génétiques                            */
/* -------------------------------------------- */

console.log("\n— Types génétiques —");

const typesGen = POLARIS.creation.typesGenetiques;

verifier("quatre types génétiques", Object.keys(typesGen).length, 4);
verifier("l'humain normal est gratuit", typesGen.humainNormal.cout, 0);
verifier("l'humain normal ne modifie aucun attribut", Object.keys(typesGen.humainNormal.modificateurs).length, 0);

// Les trois hybrides coûtent 5 PC, le techno-hybride déserteur 4.
for (const cle of ["hybrideNaturel", "genoHybride", "technoHybride"]) {
  verifier(`« ${cle} » coûte 5 PC`, typesGen[cle].cout, 5);
}
verifier("le techno-hybride déserteur coûte 4 PC", typesGen.technoHybride.coutAlternatif.cout, 4);

// Modificateurs d'attributs, transcrits type par type.
verifier(
  "hybride naturel : FOR+1 CON+2 COO+2 ADA+1 INT-2",
  typesGen.hybrideNaturel.modificateurs,
  { for: 1, con: 2, coo: 2, ada: 1, int: -2 }
);
verifier(
  "géno-hybride : FOR+1 CON+1 COO+2 PRE-2",
  typesGen.genoHybride.modificateurs,
  { for: 1, con: 1, coo: 2, pre: -2 }
);
verifier(
  "techno-hybride : FOR+2 CON+3 ADA-2 VOL+3 PRE-6",
  typesGen.technoHybride.modificateurs,
  { for: 2, con: 3, ada: -2, vol: 3, pre: -6 }
);

// Le seul plancher du livre : la Présence d'un techno-hybride.
verifier("la Présence du techno-hybride ne descend pas sous 3", typesGen.technoHybride.minimums.pre, 3);

// La compétence Hybride est procurée par les trois typesGen, à des niveaux
// de départ différents — c'est ce qui impose de porter cette donnée sur la
// source et non sur la compétence.
verifier("l'hybride naturel démarre Hybride à +3", typesGen.hybrideNaturel.competence.maitriseDepart, 3);
verifier("le géno-hybride démarre Hybride à 0", typesGen.genoHybride.competence.maitriseDepart, 0);
verifier("le techno-hybride démarre Hybride à 0", typesGen.technoHybride.competence.maitriseDepart, 0);
verifier("l'humain normal ne procure aucune compétence", typesGen.humainNormal.competence, null);

// Aucun des typesGen ne plafonne la compétence, contrairement à la mutation
// Amphibie : c'est la source la plus favorable qui doit l'emporter.
for (const cle of ["hybrideNaturel", "genoHybride", "technoHybride"]) {
  verifier(`« ${cle} » ne plafonne pas la compétence Hybride`, typesGen[cle].competence.maitriseMax, null);
}

// Profondeurs maximales, base plus tant par niveau global d'Hybride.
verifier("hybride naturel : 1000 m + 1000/niveau", typesGen.hybrideNaturel.profondeurMax, { base: 1000, parNiveau: 1000 });
verifier("géno-hybride : 1500 m + 750/niveau", typesGen.genoHybride.profondeurMax, { base: 1500, parNiveau: 750 });
verifier("techno-hybride : 3000 m + 750/niveau", typesGen.technoHybride.profondeurMax, { base: 3000, parNiveau: 750 });
verifier("plancher de 100 m sans niveau d'Hybride", POLARIS.profondeurSansHybride, 100);

// Portées de la perception sous-marine, en mètres par point de Perception.
verifier("perception sous-marine du naturel : 10 m", typesGen.hybrideNaturel.perceptionSousMarine, 10);
verifier("perception sous-marine du géno : 5 m", typesGen.genoHybride.perceptionSousMarine, 5);
verifier("perception sous-marine du techno : 2 m", typesGen.technoHybride.perceptionSousMarine, 2);

/* -------------------------------------------- */
/*  Âges de la création                         */
/* -------------------------------------------- */

console.log("\n— Âges —");

const age = POLARIS.creation.age;

verifier("l'apprentissage commence à 12 ans", age.debutApprentissage, 12);
verifier("un métier s'exerce à partir de 16 ans", age.ageMinimumMetier, 16);
verifier("l'âge sûr est 17 ans", age.methodes.fixe.age, 17);
verifier("l'âge tiré est 14 + 1d4", [age.methodes.tirage.base, age.methodes.tirage.de], [14, "1d4"]);

// Les années d'apprentissage se comptent depuis 12 ans.
verifier("à 17 ans : 5 années d'apprentissage", POLARIS.creation.anneesApprentissage(17), 5);
verifier("à 15 ans : 3 années", POLARIS.creation.anneesApprentissage(15), 3);
verifier("à 12 ans : aucune", POLARIS.creation.anneesApprentissage(12), 0);
verifier("sous 12 ans, jamais de négatif", POLARIS.creation.anneesApprentissage(9), 0);

// Le pari du tirage : 14+1d4 donne 15 à 18 ans. Le plus mauvais résultat rend
// le personnage trop jeune pour un métier, le meilleur le rend plus âgé que
// l'âge sûr. C'est ce qui fait du choix un vrai arbitrage.
const bornesTirage = [age.methodes.tirage.base + 1, age.methodes.tirage.base + 4];
verifier("le tirage couvre 15 à 18 ans", bornesTirage, [15, 18]);
verifier("le plus mauvais tirage interdit le métier", POLARIS.creation.peutExercerUnMetier(15), false);
verifier("un 2 au dé suffit pour un métier", POLARIS.creation.peutExercerUnMetier(16), true);
verifier("le meilleur tirage dépasse l'âge sûr", bornesTirage[1] > age.methodes.fixe.age, true);
verifier("l'âge sûr permet toujours un métier", POLARIS.creation.peutExercerUnMetier(age.methodes.fixe.age), true);

/* -------------------------------------------- */
/*  Origines géographiques                      */
/* -------------------------------------------- */

console.log("\n— Origines géographiques —");

const fichierOrigines = JSON.parse(fs.readFileSync("data/origines.json", "utf8"));
const geo = POLARIS.indexerOrigines(fichierOrigines.geographiques);

verifier("aucune entrée écartée", geo.erreurs, []);
verifier("quatre origines géographiques", geo.origines.length, 4);
verifier("elles se tirent au 1d10", fichierOrigines._deGeographiques, "1d10");

// Le 1d10 doit être couvert sans trou ni recouvrement : les fourchettes ne sont
// pas équiprobables, mais elles doivent être exhaustives.
POLARIS.creation.originesGeographiques = geo.origines;
const couvertureGeo = new Array(11).fill(0);
for (const o of geo.origines) {
  for (let n = o.tirage[0]; n <= o.tirage[1]; n++) couvertureGeo[n]++;
}
const trousGeo = [];
const doublesGeo = [];
for (let n = 1; n <= 10; n++) {
  if (!couvertureGeo[n]) trousGeo.push(n);
  if (couvertureGeo[n] > 1) doublesGeo.push(n);
}
verifier("le 1d10 est couvert sans trou", trousGeo, []);
verifier("aucun résultat ne désigne deux origines", doublesGeo, []);

// Transcription des fourchettes, qui portent la démographie du monde.
verifier("1 → navide nomade", POLARIS.origineTiree("originesGeographiques", 1)?.id, "navide-nomade");
verifier("2 → petite station", POLARIS.origineTiree("originesGeographiques", 2)?.id, "petite-station");
verifier("7 → petite station", POLARIS.origineTiree("originesGeographiques", 7)?.id, "petite-station");
verifier("8 → station moyenne", POLARIS.origineTiree("originesGeographiques", 8)?.id, "station-moyenne");
verifier("10 → grande cité", POLARIS.origineTiree("originesGeographiques", 10)?.id, "grande-cite");

// La petite station couvre six résultats sur dix : c'est l'origine la plus
// courante, et de loin.
const petite = geo.origines.find((o) => o.id === "petite-station");
verifier("la petite station couvre 6 chances sur 10", petite.tirage[1] - petite.tirage[0] + 1, 6);

// Elle est aussi la seule à laisser un choix au joueur.
verifier("la petite station offre un choix", petite.choix.length, 1);
verifier("ce choix porte sur 2 niveaux", petite.choix[0].niveau, 2);
verifier("entre deux options", petite.choix[0].options.length, 2);

// Une même compétence peut être accordée deux fois avec des spécialisations
// distinctes : le navide nomade pilote un navire léger ET des scooters.
const navide = geo.origines.find((o) => o.id === "navide-nomade");
const pilotages = navide.competences.filter((c) => c.cle === "pilotage");
verifier("le navide accorde deux pilotages distincts", pilotages.length, 2);
verifier(
  "avec des spécialisations différentes",
  new Set(pilotages.map((p) => p.specialisation)).size,
  2
);

// Les compétences citées sans être déclarées sont recensées, pas inventées.
verifier(
  "des compétences restent à déclarer",
  POLARIS.competencesAConfirmer.size > 0,
  true
);
verifier(
  "et toutes sont signalées comme inconnues",
  geo.origines.every((o) =>
    o.competences.every((c) => c.inconnue === !POLARIS.competences[c.cle])
  ),
  true
);

/* -------------------------------------------- */
/*  Mutations                                   */
/* -------------------------------------------- */

console.log("\n— Mutations —");

// Le signe du coût dépend du genre : c'est toute la règle, et l'endroit où une
// inversion passerait le plus facilement inaperçue.
verifier("une mutation avantageuse coûte", POLARIS.coutMutation("avantageuse", 3), 3);
verifier("une mutation neutre est gratuite", POLARIS.coutMutation("neutre", 3), 0);
verifier("une mutation désavantageuse rapporte", POLARIS.coutMutation("desavantageuse", 3), -3);

// Le coût est saisi en valeur absolue : un signe entré par erreur ne doit pas
// inverser l'effet du genre.
verifier("un coût négatif ne renverse pas le genre", POLARIS.coutMutation("avantageuse", -3), 3);
verifier("un coût négatif ne renverse pas non plus le rapport", POLARIS.coutMutation("desavantageuse", -3), -3);

// Genre inconnu ou coût absent : neutre par défaut, jamais d'exception.
verifier("un genre inconnu ne coûte rien", POLARIS.coutMutation("inexistant", 5), 0);
verifier("un coût absent ne coûte rien", POLARIS.coutMutation("avantageuse", null), 0);

verifier("trois genres de mutation", Object.keys(POLARIS.genresMutation).length, 3);

// Une mutation avantageuse TIRÉE AU SORT est gratuite : la table du livre
// marque sa colonne d'un astérisque, « seulement si la mutation est choisie ».
// La colonne des désavantages n'en porte pas.
verifier("un avantage tiré au sort est gratuit", POLARIS.coutMutation("avantageuse", 3, true), 0);
verifier("un désavantage tiré au sort rapporte quand même", POLARIS.coutMutation("desavantageuse", 3, true), -3);
verifier("un avantage choisi se paie", POLARIS.coutMutation("avantageuse", 3, false), 3);
verifier("le neutre reste gratuit dans les deux cas", POLARIS.coutMutation("neutre", 3, true), 0);

/* -------------------------------------------- */
/*  Catalogue des capacités spéciales           */
/* -------------------------------------------- */

console.log("\n— Catalogue des capacités spéciales —");

// Le fichier étant rempli à la main, le validateur doit écarter proprement
// chaque forme d'erreur au lieu de laisser passer une donnée douteuse.
const brut = {
  capacites: [
    { id: "bonne", nom: "Vision nocturne", type: "mutation", genre: "avantageuse", cout: 3 },
    { nom: "Sans identifiant" },
    { id: "sans-nom" },
    { id: "bonne", nom: "Doublon" },
    { id: "genre-faux", nom: "Genre inventé", genre: "merveilleuse" },
    { id: "type-faux", nom: "Type inventé", type: "sortilege" },
    { id: "cout-negatif", nom: "Coût mal signé", genre: "desavantageuse", cout: -4 },
    { id: "minimal", nom: "Sans rien d'autre" }
  ]
};

const { capacites, erreurs } = POLARIS.indexerCapacites(brut);

verifier("trois entrées valides retenues", Object.keys(capacites).length, 3);
verifier("cinq entrées écartées", erreurs.length, 5);
verifier("l'entrée correcte est indexée par son id", capacites.bonne.nom, "Vision nocturne");

// Le genre porte le signe : un coût saisi négatif ne doit pas produire une
// double négation qui transformerait un handicap en avantage.
verifier("un coût négatif est ramené en valeur absolue", capacites["cout-negatif"].cout, 4);
verifier(
  "et son genre le rend bien négatif",
  POLARIS.coutMutation(capacites["cout-negatif"].genre, capacites["cout-negatif"].cout),
  -4
);

// Valeurs par défaut d'une entrée minimale.
verifier("type par défaut : mutation", capacites.minimal.type, "mutation");
verifier("genre par défaut : neutre", capacites.minimal.genre, "neutre");
verifier("coût par défaut : zéro", capacites.minimal.cout, 0);

// Un catalogue absent ou vide ne doit jamais lever d'exception.
verifier("un catalogue vide ne casse rien", Object.keys(POLARIS.indexerCapacites({}).capacites).length, 0);
verifier("un catalogue nul non plus", Object.keys(POLARIS.indexerCapacites(null).capacites).length, 0);

/* -------------------------------------------- */
/*  Compétences apportées par une capacité      */
/* -------------------------------------------- */

console.log("\n— Compétences liées aux capacités —");

// Une compétence fautive ne doit invalider QUE la compétence : mieux vaut une
// mutation sans compétence qu'une mutation absente du catalogue.
const avecCompetences = POLARIS.indexerCapacites({
  capacites: [
    {
      id: "amphibie",
      nom: "Amphibie",
      genre: "avantageuse",
      cout: 2,
      competence: { cle: "hybride", nom: "Hybride", attributs: ["con", "coo"], modificateur: -3, maitriseMax: 0 }
    },
    { id: "cle-sale", nom: "Clé avec espace", competence: { cle: "ma competence", attributs: ["con", "coo"] } },
    { id: "un-seul", nom: "Un seul attribut", competence: { cle: "bancale", attributs: ["con"] } },
    { id: "attr-faux", nom: "Attribut inventé", competence: { cle: "fantaisie", attributs: ["con", "zzz"] } },
    { id: "sans-cle", nom: "Compétence sans clé", competence: { attributs: ["con", "coo"] } }
  ]
});

verifier("les cinq capacités sont retenues", Object.keys(avecCompetences.capacites).length, 5);
verifier("quatre compétences écartées", avecCompetences.erreurs.length, 4);
verifier("la compétence valide est conservée", avecCompetences.capacites.amphibie.competence.cle, "hybride");
verifier(
  "une compétence fautive n'emporte pas sa capacité",
  avecCompetences.capacites["cle-sale"].competence,
  null
);

// Un plafond de 0 est une vraie valeur, pas une absence de plafond.
verifier("le plafond de maîtrise à 0 est conservé", avecCompetences.capacites.amphibie.competence.maitriseMax, 0);

// L'enregistrement verse les compétences dans la liste générale, marquées
// spéciales — donc invisibles tant que la capacité n'est pas portée.
const ajoutees = POLARIS.enregistrerCompetencesDeCapacites(avecCompetences.capacites);
verifier("une seule compétence enregistrée", ajoutees.length, 1);
verifier("elle est marquée spéciale", POLARIS.competences.hybride.speciale, true);
verifier("elle garde son modificateur", POLARIS.competences.hybride.modificateur, -3);
verifier("elle retient sa capacité d'origine", POLARIS.competences.hybride.capaciteId, "amphibie");

// Un second passage ne doit rien dupliquer ni écraser.
verifier("un rappel n'ajoute rien", POLARIS.enregistrerCompetencesDeCapacites(avecCompetences.capacites).length, 0);

// Une compétence déjà déclarée dans la config prime sur le catalogue.
const conflit = POLARIS.indexerCapacites({
  capacites: [{ id: "faux-tir", nom: "Faux tir", competence: { cle: "tir", attributs: ["con", "con"] } }]
});
POLARIS.enregistrerCompetencesDeCapacites(conflit.capacites);
verifier("le catalogue n'écrase pas une compétence du livre", POLARIS.competences.tir.attributs, ["per", "coo"]);

/* -------------------------------------------- */
/*  Le fichier livré                            */
/* -------------------------------------------- */

console.log("\n— Fichier capacites-speciales.json —");

const fichier = JSON.parse(fs.readFileSync("data/capacites-speciales.json", "utf8"));
const livre = POLARIS.indexerCapacites(fichier);

verifier("le fichier livré contient une liste", Array.isArray(fichier.capacites), true);
verifier("aucune entrée du fichier n'est écartée", livre.erreurs, []);
verifier(
  "toutes les entrées du fichier sont retenues",
  Object.keys(livre.capacites).length,
  fichier.capacites.length
);
verifier(
  "l'exemple du fichier passerait la validation",
  POLARIS.indexerCapacites({ capacites: [fichier._exemple] }).erreurs,
  []
);

// La table des mutations du livre se tire au 1D100 : elle doit couvrir les
// cent résultats sans trou, sinon un tirage aléatoire tomberait dans le vide.
const couverture = new Array(101).fill(0);
for (const capacite of Object.values(livre.capacites)) {
  if (!capacite.tirage) continue;
  for (let n = capacite.tirage[0]; n <= capacite.tirage[1]; n++) couverture[n]++;
}
const trousTirage = [];
for (let n = 1; n <= 100; n++) if (!couverture[n]) trousTirage.push(n);
verifier("la table 1D100 des mutations ne laisse aucun trou", trousTirage, []);

// Le « -3 » écrit entre parenthèses dans le livre — « Empathie (VOL/PRE, -3) »
// — est un NIVEAU DE DÉPART, pas un modificateur permanent sur la base.
const departsAttendus = {
  "adaptation-exterieure": -3,
  amphibie: -3,
  empathie: -3,
  metamorphe: -3,
  radiation: -3
};

for (const [id, depart] of Object.entries(departsAttendus)) {
  verifier(`« ${id} » démarre sa compétence à ${depart}`, livre.capacites[id]?.competence?.maitriseDepart, depart);
}

// Aucune compétence n'utilise de modificateur permanent : le livre n'en
// donne aucun à ce jour, et confondre les deux fausserait la base affichée.
verifier(
  "aucun modificateur permanent dans le catalogue",
  Object.values(livre.capacites).every((c) => !c.competence || c.competence.modificateur === 0),
  true
);

// Les capacités que le livre dit donner accès à une compétence spéciale.
const donnentUneCompetence = {
  "adaptation-exterieure": "adaptationExterieure",
  amphibie: "hybride",
  contagion: "contagion",
  empathie: "empathie",
  "instabilite-moleculaire": "controleMoleculaire",
  metamorphe: "metamorphose",
  purulence: "purulence",
  queue: "agiliteCaudale",
  radiation: "radiations",
  sonar: "sonar",
  "avantage-polaris": "maitriseEffetPolaris"
};

for (const [id, cle] of Object.entries(donnentUneCompetence)) {
  verifier(`« ${id} » donne accès à « ${cle} »`, livre.capacites[id]?.competence?.cle, cle);
}

// Et aucune autre : une compétence apparue par erreur se signalerait ici.
const avecCompetence = Object.values(livre.capacites).filter((c) => c.competence).length;
verifier(
  "aucune compétence en trop",
  avecCompetence,
  Object.keys(donnentUneCompetence).length
);

// Deux capacités ne peuvent pas revendiquer la même clé de compétence : la
// seconde serait silencieusement ignorée à l'enregistrement.
const clesCompetence = Object.values(livre.capacites)
  .filter((c) => c.competence)
  .map((c) => c.competence.cle);
verifier("les clés de compétence sont uniques", new Set(clesCompetence).size, clesCompetence.length);

// Le tirage doit aboutir pour CHACUN des cent résultats. On simule le catalogue
// chargé, puis on déroule la résolution complète : 1D100, puis sous-dé quand
// plusieurs capacités partagent la fourchette.
POLARIS.creation.capacitesSpeciales = livre.capacites;

const tiragesMorts = [];
const sousTablesIncompletes = [];

for (let de = 1; de <= 100; de++) {
  const candidats = POLARIS.candidatsMutation(de);

  if (!candidats.length) { tiragesMorts.push(de); continue; }
  if (candidats.length === 1) continue;

  // Plusieurs candidats : chacun doit être atteignable par une face distincte,
  // sinon une mutation du livre serait impossible à obtenir au hasard.
  const faces = candidats.map((c) => c.sousTirage);
  const atteignables = faces.every((f) => Number.isInteger(f));
  const distinctes = new Set(faces).size === faces.length;

  if (!atteignables || !distinctes) sousTablesIncompletes.push(`${de} (${candidats.length} candidats)`);
}

verifier("les cent résultats désignent une mutation", tiragesMorts, []);
verifier("chaque sous-table départage ses candidats", sousTablesIncompletes, []);

// Une face de sous-table sans candidat correspond au « relancer » du livre :
// la résolution doit rendre null, pas une mutation au hasard.
const resistances = POLARIS.candidatsMutation(78);
verifier("six résistances naturelles sur 76-80", resistances.length, 6);
verifier("la face 3 désigne les drogues", POLARIS.departagerMutation(resistances, 3)?.id, "resistance-drogues");

const organes = POLARIS.candidatsMutation(57);
verifier("cinq organes manquants sur 57-58", organes.length, 5);
verifier("la face 6 ne désigne rien : on relance", POLARIS.departagerMutation(organes, 6), null);

// Le genre porte le signe, donc aucun coût saisi ne doit être négatif.
verifier(
  "aucun coût négatif dans le fichier",
  Object.values(livre.capacites).every((c) => c.cout >= 0),
  true
);

// Une capacité neutre est gratuite : lui donner un coût serait trompeur.
verifier(
  "les capacités neutres ne coûtent rien",
  Object.values(livre.capacites)
    .filter((c) => c.genre === "neutre")
    .every((c) => POLARIS.coutMutation(c.genre, c.cout) === 0),
  true
);
verifier(
  "seul le neutre a un signe nul",
  Object.values(POLARIS.genresMutation).filter((g) => g.signeCout === 0).length,
  1
);

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
