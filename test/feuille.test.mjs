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
/*  Liste des compétences                       */
/* -------------------------------------------- */

console.log("\n— Compétences —");

const competences = POLARIS.competences;

// 83 viennent de la table page 184, plus les huit véhicules de la famille
// Pilotage détaillés page 195.
verifier("213 compétences déclarées", Object.keys(competences).length, 213);
verifier(
  "dont 83 issues de la table page 184",
  Object.values(competences).filter((d) => !d.parent).length,
  83
);
verifier("onze catégories", Object.keys(POLARIS.categoriesCompetence).length, 11);

// Chaque compétence appartient à une catégorie déclarée, sans quoi elle
// disparaîtrait silencieusement de la fiche.
const categoriesInconnues = Object.entries(competences)
  .filter(([, d]) => !POLARIS.categoriesCompetence[d.categorie])
  .map(([cle]) => cle);
verifier("aucune catégorie orpheline", categoriesInconnues, []);

// Les attributs cités doivent exister. Une paire peut être nulle — le livre
// écrit « variables » pour les familles dont l'arme ou la discipline décide.
const attributsInvalides = Object.entries(competences)
  .filter(([, d]) => d.attributs && (d.attributs.length !== 2 || d.attributs.some((a) => !POLARIS.attributs[a])))
  .map(([cle]) => cle);
verifier("tous les couples d'attributs sont valides", attributsInvalides, []);

// Transcription de la table page 184, ligne par ligne, sur un échantillon
// couvrant les onze catégories et les cas particuliers.
const couples = {
  acrobatieEquilibre: ["coo", "coo"],
  athletisme: ["for", "coo"],
  endurance: ["con", "vol"],
  manoeuvresSousMarines: ["for", "coo"],
  respirationFoe: ["con", "vol"],
  armesLourdesContact: ["for", "for"],
  artsMartiaux: ["coo", "ada"],
  combatMainsNues: ["for", "coo"],
  armesDePoing: ["coo", "per"],
  tirDePrecision: ["per", "vol"],
  entregentSeduction: ["pre", "pre"],
  eloquencePersuasion: ["int", "pre"],
  hybride: ["con", "coo"],
  maitriseEffetPolaris: ["vol", "vol"],
  maitriseEchoPolaris: ["int", "vol"],
  bureaucratie: ["int", "int"],
  commerceTrafic: ["int", "pre"],
  jeu: ["int", "vol"],
  tactique: ["int", "ada"],
  deguisementImitation: ["ada", "pre"],
  evasion: ["coo", "vol"],
  pickpocket: ["coo", "ada"],
  langageDesSignes: ["coo", "per"],
  manoeuvreArmures: ["coo", "ada"],
  telepilotage: ["int", "ada"],
  observation: ["per", "vol"],
  connaissanceMilieu: ["int", "ada"],
  survie: ["ada", "vol"],
  analyseSonscans: ["int", "ada"],
  dressage: ["vol", "pre"],
  explosifs: ["int", "vol"],
  premiersSoins: ["int", "ada"],
  pieges: ["int", "per"],
  artArtisanat: ["int", "per"]
};

for (const [cle, attendu] of Object.entries(couples)) {
  verifier(`${cle} → ${attendu.join("/").toUpperCase()}`, competences[cle]?.attributs, attendu);
}

// Les familles du livre — écrites « [...] » — n'ont pas de couple fixe ou
// exigent une spécialisation. Leur base ne peut pas se calculer seule.
const famillesAttendues = [
  "armesSpecialesContact", "armesSpecialesTir", "artsMartiaux", "expressionArtistique",
  "controleMutations", "pouvoirsEffetPolaris", "commerceTrafic", "connaissanceNations",
  "sciencesSpecialisees", "tactique", "langageDesSignes", "langagesSpecialises",
  "languesEtrangeres", "languesAnciennes", "manoeuvreArmures", "pilotage",
  "connaissanceMilieu", "artArtisanat", "genieTechnique", "mecanique"
];
const familles = Object.entries(competences).filter(([, d]) => d.famille).map(([c]) => c);
verifier("les familles du livre sont marquées", familles.sort(), famillesAttendues.sort());

// « Variables » dans la table : l'arme ou la discipline décide des attributs.
// Cinq familles sont dans ce cas. Trois d'entre elles ont depuis été
// instanciées, et leurs membres ont bien reçu un couple — sauf les armes
// spéciales de contact, pour lesquelles le livre s'en remet au meneur
// (« selon l'arme, FOR/COO ou COO/COO la plupart du temps »).
const sansAttributs = Object.entries(competences).filter(([, d]) => !d.attributs).map(([c]) => c);

const famillesVariables = sansAttributs.filter((c) => competences[c].famille).sort();
verifier(
  "cinq familles à attributs variables",
  famillesVariables,
  ["armesSpecialesContact", "armesSpecialesTir", "controleMutations", "expressionArtistique", "pilotage"]
);

const membresVariables = sansAttributs.filter((c) => competences[c].parent).sort();
verifier(
  "seules les armes spéciales de contact restent sans couple",
  membresVariables,
  ["armeSpecialeChaine", "armeSpecialeFilet", "armeSpecialeFouet", "armeSpecialeGrappin", "armeSpecialeLasso"]
);

// Les autres familles variables ont bien donné un couple à chacun des leurs.
for (const famille of ["pilotage", "expressionArtistique", "armesSpecialesTir"]) {
  const membres = Object.entries(competences).filter(([, d]) => d.parent === famille);
  verifier(
    `${famille} : chaque membre a son couple d'attributs`,
    membres.filter(([, d]) => !d.attributs).map(([c]) => c),
    []
  );
}

// Le « (-3) » du livre est un niveau de maîtrise de départ : les premiers
// niveaux achetés servent à le résorber avant tout progrès positif.
verifier("Éducation/Culture générale démarre à -3", competences.educationCultureGenerale.maitriseDepart, -3);
verifier("Informatique démarre à -3", competences.informatique.maitriseDepart, -3);
verifier("Athlétisme démarre à 0", competences.athletisme.maitriseDepart ?? 0, 0);

// Une compétence réservée (X) démarre elle aussi à -3 une fois apprise.
const reservees = Object.entries(competences).filter(([, d]) => (d.marqueurs ?? []).includes("reservee"));
verifier(
  "toute compétence réservée démarre à -3",
  reservees.filter(([, d]) => d.maitriseDepart !== -3).map(([c]) => c),
  []
);

// Les compétences spéciales du livre sont celles qui n'apparaissent qu'une fois
// acquises : la catégorie et le drapeau doivent coïncider.
const speciales = Object.entries(competences).filter(([, d]) => d.speciale).map(([c]) => c);
const categorieSpeciale = Object.entries(competences)
  .filter(([, d]) => d.categorie === "competencesSpeciales")
  .map(([c]) => c);
verifier("catégorie et drapeau « spéciale » coïncident", speciales.sort(), categorieSpeciale.sort());
verifier("dix compétences spéciales", speciales.length, 10);

// Tous les marqueurs cités doivent exister.
const marqueursInvalides = Object.entries(competences)
  .flatMap(([cle, d]) => (d.marqueurs ?? []).filter((m) => !POLARIS.marqueursCompetence[m]).map(() => cle));
verifier("aucun marqueur inventé", marqueursInvalides, []);

/* -------------------------------------------- */
/*  Effet mécanique des marqueurs               */
/* -------------------------------------------- */

console.log("\n— Marqueurs —");

// Chaque marqueur déclare son symbole, son libellé, et surtout s'il AGIT.
// Sans ce dernier drapeau, la fiche laisserait croire à un effet inexistant.
const marqueursMalFormes = Object.entries(POLARIS.marqueursCompetence)
  .filter(([, m]) => !m.symbole || !m.label || typeof m.applique !== "boolean")
  .map(([c]) => c);
verifier("chaque marqueur déclare symbole, libellé et effet", marqueursMalFormes, []);

// Deux marqueurs agissent, deux attendent encore leur règle du livre. Ce test
// est un rappel, pas un verrou : quand la règle arrive, on bascule le drapeau
// ET ce cas.
const appliques = Object.entries(POLARIS.marqueursCompetence)
  .filter(([, m]) => m.applique)
  .map(([c]) => c)
  .sort();
verifier("réservée et pré-requis agissent", appliques, ["prerequis", "reservee"]);

// Les symboles se lisent en légende : deux marqueurs identiques y seraient
// indiscernables.
const symboles = Object.values(POLARIS.marqueursCompetence).map((m) => m.symbole);
verifier("les symboles sont distincts", symboles.length, new Set(symboles).size);

/* --- Niveau de départ et plancher de saisie --- */

// Le plancher de stockage doit accueillir le plus bas niveau de départ du
// livre : sinon la compétence entre sur la fiche écrêtée à zéro, sans que rien
// ne le signale.
const departsCatalogue = Object.values(competences).map((d) => d.maitriseDepart ?? 0);
verifier(
  "le plancher de maîtrise accueille le plus bas niveau de départ",
  POLARIS.bornesMaitrise.min <= Math.min(...departsCatalogue),
  true
);
verifier("aucun niveau de départ ne dépasse le plafond", Math.max(...departsCatalogue) <= POLARIS.bornesMaitrise.max, true);

// Les niveaux de départ procurés par une source — mutation ou type génétique —
// doivent tenir dans les mêmes bornes : ce sont eux qui atterrissent sur la
// fiche à la création.
const departsSources = [
  ...Object.values(POLARIS.creation.capacitesSpeciales).map((c) => c.competence),
  ...Object.values(POLARIS.creation.typesGenetiques).map((t) => t.competence)
]
  .filter((c) => c && c.maitriseDepart !== undefined)
  .map((c) => c.maitriseDepart);
verifier(
  "les niveaux de départ des sources tiennent dans les bornes",
  departsSources.filter((n) => n < POLARIS.bornesMaitrise.min || n > POLARIS.bornesMaitrise.max),
  []
);

/* --- Pré-requis --- */

// Ce qu'un pré-requis compare est un arbitrage à une seule ligne. Le borner ici
// évite qu'une faute de frappe le rende silencieusement inopérant : une valeur
// inconnue ferait lire une propriété inexistante, donc « jamais rempli ».
verifier(
  "la base de comparaison des pré-requis est reconnue",
  ["globale", "maitrise"].includes(POLARIS.basePrerequis),
  true
);

// Un pré-requis doit rester atteignable, sinon la compétence est morte : le
// niveau exigé ne peut pas dépasser le plafond de maîtrise.
const prerequisInatteignables = Object.entries(competences)
  .flatMap(([cle, d]) =>
    (d.prerequis ?? []).filter((p) => p.niveau > POLARIS.bornesMaitrise.max).map(() => cle)
  );
verifier("aucun pré-requis hors d'atteinte", prerequisInatteignables, []);

// Une compétence ne peut pas exiger un niveau dans une compétence abstraite :
// une famille n'a pas de niveau, c'est un porte-manteau.
const prerequisAbstraits = Object.entries(competences)
  .flatMap(([cle, d]) =>
    (d.prerequis ?? []).filter((p) => competences[p.cle]?.abstraite).map(() => cle)
  );
verifier("aucun pré-requis ne vise une famille", prerequisAbstraits, []);

// Une compétence exigée doit être atteignable elle-même : exiger un niveau dans
// une compétence réservée est licite (on l'apprend d'abord), mais exiger une
// compétence SPÉCIALE le serait moins — celles-là ne s'apprennent pas, elles se
// reçoivent d'une mutation. Aucune donnée du livre ne le fait à ce jour.
const prerequisSpeciaux = Object.entries(competences)
  .flatMap(([cle, d]) => (d.prerequis ?? []).filter((p) => competences[p.cle]?.speciale).map(() => cle));
verifier("aucun pré-requis ne vise une compétence spéciale", prerequisSpeciaux, []);

/* --- La fonction pure, exercée sur des personnages fictifs --- */

// `POLARIS.prerequisManquants` ne connaît ni Foundry ni l'acteur : on lui passe
// un « ce personnage sait ceci » et on lit ce qui bloque. C'est le seul morceau
// du mécanisme des marqueurs qui soit vérifiable hors de Foundry.
const savoir = (niveaux) => (cle) => (cle in niveaux ? niveaux[cle] : null);

// La nanotechnologie exige DEUX compétences à 10 : Éducation/Culture générale
// et Physique/Chimie. Un ignorant est donc bloqué sur les deux à la fois — et
// c'est bien les deux qu'il doit voir, pas la première venue.
const bloqueSurNano = POLARIS.prerequisManquants("genieNanotechnologie", savoir({}));
verifier(
  "un ignorant est bloqué sur les deux pré-requis de la nanotechnologie",
  bloqueSurNano.map((p) => p.cle).sort(),
  ["educationCultureGenerale", "sciencesPhysiqueChimie"]
);
verifier("le niveau exigé est rappelé", bloqueSurNano[0].niveau, 10);
verifier("le niveau atteint est nul, pas zéro", bloqueSurNano[0].atteint, null);

// Remplir une exigence sur deux ne débloque rien, et l'exigence restante est
// nommée : c'est ce que le joueur lit sur la fiche.
const savantIncomplet = savoir({ sciencesPhysiqueChimie: 10 });
verifier(
  "une exigence sur deux ne suffit pas",
  POLARIS.prerequisManquants("genieNanotechnologie", savantIncomplet).map((p) => p.cle),
  ["educationCultureGenerale"]
);

// Le niveau juste en dessous ne suffit pas ; le niveau exact suffit.
const presque = savoir({ educationCultureGenerale: 10, sciencesPhysiqueChimie: 9 });
verifier(
  "9 ne suffit pas là où le livre écrit 10",
  POLARIS.prerequisManquants("genieNanotechnologie", presque).map((p) => p.cle),
  ["sciencesPhysiqueChimie"]
);
verifier(
  "le compte exact suffit",
  POLARIS.prerequisManquants(
    "genieNanotechnologie",
    savoir({ educationCultureGenerale: 10, sciencesPhysiqueChimie: 10 })
  ),
  []
);

// Zéro n'est PAS l'absence : un personnage qui possède la compétence à 0 est
// bloqué par le seuil, pas par l'ignorance. La nuance décide de ce qu'affiche
// la fiche.
const aZero = POLARIS.prerequisManquants(
  "genieNanotechnologie",
  savoir({ educationCultureGenerale: 10, sciencesPhysiqueChimie: 0 })
);
verifier("posséder la compétence à 0 se distingue de ne pas l'avoir", aZero[0].atteint, 0);

// Une compétence sans pré-requis ne bloque jamais.
verifier("Athlétisme n'exige rien", POLARIS.prerequisManquants("athletisme", savoir({})), []);

// Une compétence inconnue de la config ne fait pas tomber la fonction : la
// fiche d'un personnage importé d'une version antérieure ne doit pas planter.
verifier("une clé inconnue ne bloque rien", POLARIS.prerequisManquants("nExistePas", savoir({})), []);

// Plusieurs exigences : toutes celles qui manquent sont rapportées, pas
// seulement la première — le joueur doit voir tout ce qu'il lui reste à faire.
const aPlusieurs = Object.entries(competences).find(([, d]) => (d.prerequis ?? []).length > 1);
if (aPlusieurs) {
  verifier(
    `${aPlusieurs[0]} : toutes les exigences manquantes sont rapportées`,
    POLARIS.prerequisManquants(aPlusieurs[0], savoir({})).length,
    aPlusieurs[1].prerequis.length
  );
} else {
  console.log("NOTE   aucune compétence du livre n'a plus d'un pré-requis à ce jour");
}

// La chaîne complète : Éducation ouvre Physique/Chimie, qui ouvre la
// nanotechnologie. Remplir le maillon du milieu ne suffit pas à ouvrir les deux.
verifier(
  "Physique/Chimie reste fermée sans Éducation",
  POLARIS.prerequisManquants("sciencesPhysiqueChimie", savoir({ sciencesPhysiqueChimie: 10 })).length,
  1
);

// La compétence Hybride est réservée aux hybrides : le livre le dit
// explicitement, et c'est le type génétique qui la procure.
verifier("Hybride est une compétence spéciale", competences.hybride.speciale, true);

/* -------------------------------------------- */
/*  Famille Pilotage                            */
/* -------------------------------------------- */

console.log("\n— Pilotage —");

const pilotagesFamille = Object.entries(POLARIS.competences).filter(([, d]) => d.parent === "pilotage");

verifier("huit véhicules pilotables", pilotagesFamille.length, 8);

// La famille elle-même ne se joue pas : elle n'a pas d'attributs et le livre
// ne lui donne aucune valeur. Elle ne doit pas figurer sur la fiche.
verifier("la famille Pilotage est abstraite", POLARIS.competences.pilotage.abstraite, true);
verifier("et sans couple d'attributs", POLARIS.competences.pilotage.attributs, null);

// Transcription des couples, page 195.
const couplesPilotage = {
  pilotageChasseursSousMarins: ["int", "ada"],
  pilotageChasseursAtmospheriques: ["int", "ada"],
  pilotageNaviresLegers: ["int", "int"],
  pilotageNaviresLourds: ["int", "int"],
  pilotageEnginsSpatiaux: ["int", "int"],
  pilotageVehiculesSouterrains: ["int", "ada"],
  pilotageVehiculesSol: ["per", "ada"],
  pilotageScootersSousMarins: ["per", "ada"]
};

for (const [cle, attendu] of Object.entries(couplesPilotage)) {
  verifier(`${cle} → ${attendu.join("/").toUpperCase()}`, POLARIS.competences[cle]?.attributs, attendu);
}

// Six véhicules sur huit sont réservés : seuls les véhicules de sol et les
// scooters se conduisent sans apprentissage formel.
const libres = pilotagesFamille.filter(([cle]) => !POLARIS.competenceAAcquerir(cle)).map(([c]) => c);
verifier(
  "seuls deux pilotages sont libres",
  libres.sort(),
  ["pilotageScootersSousMarins", "pilotageVehiculesSol"]
);

// Une réservée démarre à -3 une fois apprise, une libre à 0.
verifier("un chasseur sous-marin démarre à -3", POLARIS.competences.pilotageChasseursSousMarins.maitriseDepart, -3);
verifier("un scooter démarre à 0", POLARIS.competences.pilotageScootersSousMarins.maitriseDepart ?? 0, 0);

// Les pré-requis du livre sont saisis, et pointent vers des compétences réelles.
// Les pré-requis pointent vers des compétences qui doivent exister. Le génie
// technique réclamait deux sciences ; elles sont maintenant déclarées, et plus
// aucune référence ne pend dans le vide.
const prerequisNonResolus = [
  ...new Set(
    Object.values(POLARIS.competences)
      .flatMap((d) => d.prerequis ?? [])
      .map((p) => p.cle)
      .filter((cle) => !POLARIS.competences[cle])
  )
].sort();

verifier("tous les pré-requis visent une compétence déclarée", prerequisNonResolus, []);

verifier(
  "les navires lourds exigent les navires légers au niveau 10",
  POLARIS.competences.pilotageNaviresLourds.prerequis,
  [{ cle: "pilotageNaviresLegers", niveau: 10 }]
);
verifier(
  "un chasseur sous-marin exige Athlétisme 10 et Éducation 10",
  POLARIS.competences.pilotageChasseursSousMarins.prerequis.map((p) => p.cle).sort(),
  ["athletisme", "educationCultureGenerale"]
);

// Toute compétence portant le marqueur « pré-requis » devrait finir par en
// déclarer : ce test recense ce qu'il reste à saisir sans faire échouer la suite.
const marqueesSansPrerequis = Object.entries(POLARIS.competences)
  .filter(([, d]) => (d.marqueurs ?? []).includes("prerequis") && !(d.prerequis ?? []).length)
  .map(([c]) => c);
console.log(`NOTE   ${marqueesSansPrerequis.length} compétence(s) à pré-requis dont le détail reste à saisir`);

/* -------------------------------------------- */
/*  Visibilité des compétences sur la fiche     */
/* -------------------------------------------- */

console.log("\n— Visibilité —");

// Sans filtre, la fiche listerait tout le catalogue. Le livre distingue les
// compétences utilisables d'office de celles qu'il faut avoir apprises.
const aAcquerir = Object.keys(POLARIS.competences).filter((c) => POLARIS.competenceAAcquerir(c));

verifier("les spéciales sont à acquérir", POLARIS.competenceAAcquerir("hybride"), true);
verifier("les réservées aussi", POLARIS.competenceAAcquerir("evasion"), true);
verifier("mais pas Athlétisme", POLARIS.competenceAAcquerir("athletisme"), false);
verifier("ni les scooters sous-marins", POLARIS.competenceAAcquerir("pilotageScootersSousMarins"), false);

// Le filtre doit alléger la fiche sans la vider. Les compétences à acquérir
// dépassent désormais les visibles — c'est normal : les trente-et-une langues
// du monde sont toutes réservées, et personne ne les parle toutes.
const visibles = Object.keys(POLARIS.competences).filter(
  (c) => !POLARIS.competences[c].abstraite && !POLARIS.competenceAAcquerir(c)
);
verifier("une cinquantaine de compétences restent visibles", visibles.length >= 50, true);
verifier("le filtre écarte plus de la moitié du catalogue", aAcquerir.length > visibles.length, true);

// Les langues pèsent lourd dans ce qui est masqué : sans le filtre, chaque
// fiche listerait les trente-et-une langues du monde.
const languesMasquees = aAcquerir.filter((c) => POLARIS.competences[c].categorie === "langues");
verifier("les langues représentent l'essentiel du masquage", languesMasquees.length, 33);

/* -------------------------------------------- */
/*  Langages spécifiques                        */
/* -------------------------------------------- */

console.log("\n— Langages spécifiques —");

const langages = Object.entries(POLARIS.competences).filter(
  ([, d]) => d.parent === "langagesSpecialises"
);

verifier("douze langages spécifiques", langages.length, 12);
verifier("la famille est abstraite", POLARIS.competences.langagesSpecialises.abstraite, true);

// Tous héritent des attributs et du caractère de la famille.
verifier(
  "tous en INT/INT",
  langages.every(([, d]) => JSON.stringify(d.attributs) === JSON.stringify(["int", "int"])),
  true
);
verifier(
  "tous limitatifs et à progression naturelle",
  langages.every(([, d]) =>
    d.marqueurs.includes("limitative") && d.marqueurs.includes("progressionNaturelle")
  ),
  true
);

// Le jargon des bas-fonds est le seul que le livre ne réserve pas : il
// s'attrape dans la rue, pas dans une école.
const languesLibres = langages.filter(([cle]) => !POLARIS.competenceAAcquerir(cle)).map(([c]) => c);
verifier("seul le jargon des bas-fonds est libre", languesLibres, ["langageSirs"]);
verifier("et il démarre à 0", POLARIS.competences.langageSirs.maitriseDepart ?? 0, 0);
verifier("un langage réservé démarre à -3", POLARIS.competences.langageInesis.maitriseDepart, -3);

// Les racines transcrites, qui commandent la règle de la moitié du niveau.
const racines = {
  langageAbsolan: ["neoAzuran"],
  langageInesis: ["azuran"],
  langageIthraxien: ["neoAzuran"],
  langageKlan: ["neoAzuran"],
  langageMetalan: ["isitacAzureen"],
  langageNeolan: ["azuran"],
  langageSirs: ["neoAzuran"],
  langageSoleen: ["azuran"]
};
for (const [cle, racine] of Object.entries(racines)) {
  verifier(`${cle} dérive de ${racine.join(" et ")}`, POLARIS.competences[cle].racines, racine);
}

// Quatre langages n'ont aucune racine : le livre écrit « aucune ».
const sansRacine = langages.filter(([, d]) => !(d.racines ?? []).length).map(([c]) => c);
verifier(
  "quatre langages sans racine",
  sansRacine.sort(),
  ["langageEnefid", "langageExon", "langageForeur", "langageLevean"]
);

// Toute racine citée doit être déclarée, sans quoi son libellé manquerait.
const racinesNonDeclarees = Object.entries(POLARIS.competences)
  .filter(([, d]) => (d.racines ?? []).some((r) => !POLARIS.racinesLangues[r]))
  .map(([c]) => c);
verifier("toutes les racines sont déclarées", racinesNonDeclarees, []);

// La règle de la langue racine : moitié du niveau sur une langue dérivée.
verifier("une langue dérivée se lit à la moitié du niveau", POLARIS.divisionLangueRacine, 2);

// Les descriptions vivent à part, mais doivent couvrir tout le monde.
const fichierLangages = JSON.parse(fs.readFileSync("data/langages.json", "utf8"));
const sansDescription = langages
  .filter(([cle]) => !fichierLangages.descriptions[cle])
  .map(([c]) => c);
verifier("chaque langage a sa description", sansDescription, []);

/* -------------------------------------------- */
/*  Langues étrangères et anciennes             */
/* -------------------------------------------- */

console.log("\n— Langues du monde —");

const etrangeres = Object.entries(POLARIS.competences).filter(([, d]) => d.parent === "languesEtrangeres");
const anciennes = Object.entries(POLARIS.competences).filter(([, d]) => d.parent === "languesAnciennes");

verifier("quinze langues étrangères", etrangeres.length, 15);
verifier("quatre langues anciennes", anciennes.length, 4);
verifier("la famille des étrangères est abstraite", POLARIS.competences.languesEtrangeres.abstraite, true);
verifier("celle des anciennes aussi", POLARIS.competences.languesAnciennes.abstraite, true);

// Toutes réservées : aucune langue étrangère ne se parle sans l'avoir apprise.
verifier(
  "toutes les langues du monde sont réservées",
  [...etrangeres, ...anciennes].filter(([cle]) => !POLARIS.competenceAAcquerir(cle)).map(([c]) => c),
  []
);

// Transcription d'un échantillon couvrant les cas de racine.
verifier("le néo-azuran descend de l'azuran", POLARIS.competences.langueNeoAzuran.racines, ["azuran"]);
verifier("l'olosak d'Hégémonie aussi", POLARIS.competences.langueOlosak.racines, ["azuran"]);
verifier("le léxzion vient de l'arkonien", POLARIS.competences.langueLexzion.racines, ["arkonien"]);
verifier("l'azuran ancien vient de l'azuréen", POLARIS.competences.langueAzuran.racines, ["azureen"]);
verifier("l'azuréen des langues de l'ancien temps", POLARIS.competences.langueAzureen.racines, ["ancienTemps"]);
verifier("le gatéen du latin", POLARIS.competences.langueGateen.racines, ["latin"]);

// Le trashan est la seule langue à deux racines : c'est pour lui que le champ
// est un tableau plutôt qu'une chaîne.
verifier("le trashan a deux racines", POLARIS.competences.langueTrashan.racines, ["arkonien", "ancienTemps"]);
const plusieursRacines = Object.entries(POLARIS.competences)
  .filter(([, d]) => (d.racines ?? []).length > 1)
  .map(([c]) => c);
verifier("et il est le seul", plusieursRacines, ["langueTrashan"]);

// « Inconnue » n'est pas « aucune » : le livre distingue une langue dont
// l'origine s'est perdue d'une langue qui ne descend de rien.
const origineOubliee = Object.entries(POLARIS.competences)
  .filter(([, d]) => (d.racines ?? []).includes("inconnue"))
  .map(([c]) => c);
verifier(
  "quatre langues à l'origine oubliée",
  origineOubliee.sort(),
  ["langueAmaneun", "langueArkonien", "langueLesarach", "langueTernaset"]
);

// Toutes les langues du monde ont leur description.
const fichierLangues = JSON.parse(fs.readFileSync("data/langages.json", "utf8"));
verifier(
  "chaque langue a sa description",
  [...etrangeres, ...anciennes].filter(([cle]) => !fichierLangues.descriptions[cle]).map(([c]) => c),
  []
);
verifier("trente-et-une descriptions en tout", Object.keys(fichierLangues.descriptions).length, 31);

/* -------------------------------------------- */
/*  Génie technique                             */
/* -------------------------------------------- */

console.log("\n— Génie technique —");

const genies = Object.entries(POLARIS.competences).filter(([, d]) => d.parent === "genieTechnique");

verifier("neuf disciplines de génie", genies.length, 9);
verifier("la famille est abstraite", POLARIS.competences.genieTechnique.abstraite, true);

// Toutes réservées, toutes en INT/INT.
verifier(
  "toutes réservées et en INT/INT",
  genies.every(
    ([cle, d]) =>
      POLARIS.competenceAAcquerir(cle) && JSON.stringify(d.attributs) === JSON.stringify(["int", "int"])
  ),
  true
);

// La famille impose Éducation/Culture générale 10 : chaque membre en hérite.
verifier(
  "toutes exigent Éducation/Culture générale 10",
  genies.every(([, d]) =>
    d.prerequis.some((p) => p.cle === "educationCultureGenerale" && p.niveau === 10)
  ),
  true
);

// Les pré-requis propres, transcrits page 191.
const prerequisGenie = {
  genieArchitectureCivile: [],
  genieArchitectureNavale: [],
  genieBionique: ["sciencesBiologiePhysiologie"],
  genieBiotechnologie: ["sciencesBiologiePhysiologie"],
  genieElectroniqueInformatique: ["electronique", "informatique"],
  genieLogiciels: ["informatique"],
  genieNanotechnologie: ["sciencesPhysiqueChimie"],
  genieRobotique: ["electronique", "informatique"],
  genieTelecommunications: ["electronique", "informatique"]
};

for (const [cle, propres] of Object.entries(prerequisGenie)) {
  const cites = POLARIS.competences[cle].prerequis
    .map((p) => p.cle)
    .filter((c) => c !== "educationCultureGenerale")
    .sort();
  verifier(`${cle} : ${propres.length ? propres.join(" + ") : "rien de plus"}`, cites, [...propres].sort());
}

// Les deux architectures sont les seules à n'exiger que le pré-requis familial.
const sansPrerequisPropre = genies
  .filter(([, d]) => d.prerequis.length === 1)
  .map(([c]) => c)
  .sort();
verifier(
  "seules les deux architectures s'en tiennent au pré-requis familial",
  sansPrerequisPropre,
  ["genieArchitectureCivile", "genieArchitectureNavale"]
);

// Descriptions.
const fichierCompetences = JSON.parse(fs.readFileSync("data/competences.json", "utf8"));
verifier(
  "chaque discipline a sa description",
  genies.filter(([cle]) => !fichierCompetences.descriptions[cle]).map(([c]) => c),
  []
);

/* -------------------------------------------- */
/*  Instanciation des familles                  */
/* -------------------------------------------- */

console.log("\n— Familles instanciées —");

const parFamille = {};
for (const [cle, d] of Object.entries(POLARIS.competences)) {
  if (d.parent) (parFamille[d.parent] ??= []).push(cle);
}

const effectifs = {
  artsMartiaux: 3,
  armesSpecialesContact: 5,
  armesSpecialesTir: 3,
  expressionArtistique: 4,
  commerceTrafic: 7,
  connaissanceNations: 14,
  sciencesSpecialisees: 21,
  tactique: 4,
  langageDesSignes: 2,
  langagesSpecialises: 12,
  languesEtrangeres: 15,
  languesAnciennes: 4,
  manoeuvreArmures: 4,
  pilotage: 8,
  connaissanceMilieu: 4,
  artArtisanat: 5,
  genieTechnique: 9,
  mecanique: 6
};

for (const [famille, attendu] of Object.entries(effectifs)) {
  verifier(`${famille} : ${attendu} membres`, (parFamille[famille] ?? []).length, attendu);
}

// Toute famille instanciée doit être abstraite : la famille nue ne se joue pas.
const famillesNonAbstraites = Object.keys(parFamille).filter(
  (f) => !POLARIS.competences[f].abstraite
);
verifier("toute famille peuplée est abstraite", famillesNonAbstraites, []);

// Deux familles restent vides, et pour de bonnes raisons.
const famillesVides = Object.entries(POLARIS.competences)
  .filter(([cle, d]) => d.famille && !parFamille[cle])
  .map(([c]) => c)
  .sort();
verifier(
  "seules deux familles restent vides",
  famillesVides,
  ["controleMutations", "pouvoirsEffetPolaris"]
);

// Un membre hérite toujours de la catégorie de sa famille.
const categoriesDivergentes = Object.entries(POLARIS.competences)
  .filter(([, d]) => d.parent && d.categorie !== POLARIS.competences[d.parent].categorie)
  .map(([c]) => c);
verifier("chaque membre hérite de la catégorie de sa famille", categoriesDivergentes, []);

// Aucun membre ne peut être lui-même une famille : la hiérarchie est plate.
const famillesImbriquees = Object.entries(POLARIS.competences)
  .filter(([, d]) => d.parent && d.famille)
  .map(([c]) => c);
verifier("la hiérarchie ne dépasse pas un niveau", famillesImbriquees, []);

// Tout parent cité doit exister et être déclaré comme famille.
const parentsInvalides = Object.entries(POLARIS.competences)
  .filter(([, d]) => d.parent && !POLARIS.competences[d.parent]?.famille)
  .map(([c]) => c);
verifier("tout parent cité est bien une famille", parentsInvalides, []);

/* --- Quelques transcriptions vérifiées au cas par cas --- */

// Les arts martiaux sont limitatifs et démarrent tous à -3.
verifier(
  "les trois arts martiaux démarrent à -3",
  parFamille.artsMartiaux.every((c) => POLARIS.competences[c].maitriseDepart === -3),
  true
);

// Les sciences héritent toutes d'Éducation/Culture générale 10, sauf les deux
// versions restreintes de la pharmacologie que le livre dit sans pré-requis.
const sciencesSansEducation = parFamille.sciencesSpecialisees.filter(
  (c) => !(POLARIS.competences[c].prerequis ?? []).some((p) => p.cle === "educationCultureGenerale")
);
verifier(
  "seules poisons et drogues échappent au pré-requis d'Éducation",
  sciencesSansEducation.sort(),
  ["sciencesDrogues", "sciencesPoisons"]
);

// Chaîne de pré-requis : la nanotechnologie exige Physique/Chimie, qui exige
// Éducation. Le graphe doit tenir debout.
verifier(
  "la nanotechnologie exige Physique/Chimie 10",
  POLARIS.competences.genieNanotechnologie.prerequis.some(
    (p) => p.cle === "sciencesPhysiqueChimie" && p.niveau === 10
  ),
  true
);
verifier(
  "et Physique/Chimie exige Éducation 10",
  POLARIS.competences.sciencesPhysiqueChimie.prerequis.some(
    (p) => p.cle === "educationCultureGenerale" && p.niveau === 10
  ),
  true
);

// Aucun cycle dans les pré-requis : une compétence ne peut pas se réclamer
// elle-même, directement ou non.
const cycles = [];
for (const depart of Object.keys(POLARIS.competences)) {
  const vus = new Set();
  const pile = [depart];
  while (pile.length) {
    const cle = pile.pop();
    for (const p of POLARIS.competences[cle]?.prerequis ?? []) {
      if (p.cle === depart) { cycles.push(depart); pile.length = 0; break; }
      if (!vus.has(p.cle)) { vus.add(p.cle); pile.push(p.cle); }
    }
  }
}
verifier("aucun cycle dans les pré-requis", [...new Set(cycles)], []);

// L'expression artistique donne un couple d'attributs par discipline : c'est
// justement ce que « variables » voulait dire au niveau de la famille.
verifier("le chant est en INT/PRE", POLARIS.competences.artChant.attributs, ["int", "pre"]);
verifier("la danse en COO/PRE", POLARIS.competences.artDanse.attributs, ["coo", "pre"]);
verifier("la famille reste sans attributs", POLARIS.competences.expressionArtistique.attributs, null);

// Le niveau de base d'une Connaissance des nations dépend du personnage.
verifier("un personnage connaît sa communauté d'origine à +3", POLARIS.niveauxConnaissanceCommunaute.origine, 3);
verifier("une communauté lointaine à -3", POLARIS.niveauxConnaissanceCommunaute.lointaine, -3);
verifier("une communauté inconnue est réservée", POLARIS.niveauxConnaissanceCommunaute.inconnue, null);
verifier("le Soleil noir est réservé", POLARIS.competenceAAcquerir("connaissanceSoleilNoir"), true);
verifier("l'Hégémonie ne l'est pas", POLARIS.competenceAAcquerir("connaissanceHegemonie"), false);

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

// Toutes les compétences citées par les origines sont désormais déclarées :
// la liste du livre est complète. Le mécanisme de recensement reste en place
// pour la prochaine section transcrite, mais il ne doit plus rien signaler.
verifier(
  "aucune compétence d'origine ne reste inconnue",
  [...POLARIS.competencesAConfirmer],
  []
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

// « Hybride » figure désormais dans la liste officielle : le catalogue ne la
// réenregistre donc pas, et c'est exactement ce qu'on veut — la définition du
// livre prime sur celle d'une mutation.
verifier("aucune compétence réenregistrée", ajoutees.length, 0);
verifier("Hybride vient bien du livre", POLARIS.competences.hybride.attributs, ["con", "coo"]);
verifier("et reste une compétence spéciale", POLARIS.competences.hybride.speciale, true);

// Une compétence inédite, elle, est bien versée dans la liste générale.
const inedite = POLARIS.indexerCapacites({
  capacites: [
    {
      id: "greffon-inedit",
      nom: "Greffon inédit",
      competence: { cle: "greffonInedit", attributs: ["con", "vol"], maitriseDepart: -3 }
    }
  ]
});
verifier("une compétence inédite est enregistrée", POLARIS.enregistrerCompetencesDeCapacites(inedite.capacites), ["greffonInedit"]);
verifier("marquée spéciale", POLARIS.competences.greffonInedit.speciale, true);
verifier("et rattachée à sa capacité", POLARIS.competences.greffonInedit.capaciteId, "greffon-inedit");

// Un second passage ne doit rien dupliquer ni écraser.
verifier("un rappel n'ajoute rien", POLARIS.enregistrerCompetencesDeCapacites(inedite.capacites).length, 0);

// Une compétence déjà déclarée dans la config prime sur le catalogue.
const conflit = POLARIS.indexerCapacites({
  capacites: [{ id: "faux-tir", nom: "Faux tir", competence: { cle: "escalade", attributs: ["con", "con"] } }]
});
POLARIS.enregistrerCompetencesDeCapacites(conflit.capacites);
verifier("le catalogue n'écrase pas une compétence du livre", POLARIS.competences.escalade.attributs, ["for", "coo"]);

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
