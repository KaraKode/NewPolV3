/**
 * Configuration centrale du système Polaris V3.
 *
 * ============================================================================
 *  TOUTES les données chiffrées issues du livre vivent dans ce fichier.
 *  La logique (jets, fiches, DataModels) n'en contient aucune : pour corriger
 *  une règle, il suffit d'éditer ici.
 *
 *  Source principale : la feuille de personnage officielle Polaris 3e édition
 *  (Black Book Éditions, 2016). Les blocs qu'elle atteste portent la mention
 *  « Source : feuille officielle ».
 *
 *  Les blocs marqués « ⚠️ À VÉRIFIER » restent provisoires : la feuille en
 *  montre l'existence mais pas les valeurs. Ils permettent au système de
 *  tourner et doivent être remplacés par les données du livre.
 * ============================================================================
 */

export const POLARIS = {};

/** Identifiant du système, centralisé pour construire les chemins. */
POLARIS.ID = "polaris-v3";

/** Racine des templates, pour éviter de répéter le chemin partout. */
POLARIS.TEMPLATES = `systems/${POLARIS.ID}/templates`;

/* -------------------------------------------- */
/*  Attributs                                   */
/* -------------------------------------------- */

/**
 * Les neuf attributs, dans l'ordre des colonnes de la feuille officielle.
 * Source : feuille officielle — FOR CON COO ADA PER INT VOL PRE CHANCE.
 */
POLARIS.attributs = {
  for: { label: "POLARIS.Attribut.for.long", abbr: "POLARIS.Attribut.for.abbr" },
  con: { label: "POLARIS.Attribut.con.long", abbr: "POLARIS.Attribut.con.abbr" },
  coo: { label: "POLARIS.Attribut.coo.long", abbr: "POLARIS.Attribut.coo.abbr" },
  ada: { label: "POLARIS.Attribut.ada.long", abbr: "POLARIS.Attribut.ada.abbr" },
  per: { label: "POLARIS.Attribut.per.long", abbr: "POLARIS.Attribut.per.abbr" },
  int: { label: "POLARIS.Attribut.int.long", abbr: "POLARIS.Attribut.int.abbr" },
  vol: { label: "POLARIS.Attribut.vol.long", abbr: "POLARIS.Attribut.vol.abbr" },
  pre: { label: "POLARIS.Attribut.pre.long", abbr: "POLARIS.Attribut.pre.abbr" },
  chc: { label: "POLARIS.Attribut.chc.long", abbr: "POLARIS.Attribut.chc.abbr" }
};

/**
 * Décomposition d'un attribut sur la feuille officielle. Le niveau actuel est
 * la somme des trois premières lignes ; l'aptitude naturelle en dérive.
 * Source : feuille officielle — lignes « Niveau de base », « Modif. Type
 * génétique », « Modif. Points de Création », « Niveau actuel ».
 */
POLARIS.composantesAttribut = ["base", "modifType", "modifCreation"];

/** Bornes de saisie des composantes d'un attribut. */
POLARIS.bornesAttribut = { min: -20, max: 40 };

/* -------------------------------------------- */
/*  Aptitude naturelle                          */
/* -------------------------------------------- */

/**
 * Table de conversion « niveau actuel d'attribut → aptitude naturelle ».
 *
 * C'est le cœur du système : la base de chaque compétence vaut la somme des
 * aptitudes naturelles de ses deux attributs. Noter qu'elle est SIGNÉE — un
 * attribut faible pénalise activement, il ne se contente pas de ne rien
 * apporter.
 *
 * Source : livre de base, transmise par l'auteur du système.
 *
 * ⚠️ À VÉRIFIER — deux bords manquent :
 *   - en dessous de 3 (la table commence à 3) ;
 *   - au-dessus de 25 (« 25 = 6 » : palier fermé, ou ouvert vers le haut ?).
 * Hors table, `aptitudeNaturelle` borne sur l'extrémité la plus proche, ce qui
 * est prudent mais reste une supposition.
 */
POLARIS.tableAptitudeNaturelle = [
  { min: 3,  max: 3,  aptitude: -4 },
  { min: 4,  max: 4,  aptitude: -3 },
  { min: 5,  max: 5,  aptitude: -2 },
  { min: 6,  max: 7,  aptitude: -1 },
  { min: 8,  max: 9,  aptitude: 0 },
  { min: 10, max: 12, aptitude: 1 },
  { min: 13, max: 15, aptitude: 2 },
  { min: 16, max: 18, aptitude: 3 },
  { min: 19, max: 21, aptitude: 4 },
  { min: 22, max: 24, aptitude: 5 },
  { min: 25, max: 25, aptitude: 6 }
];

/**
 * Convertit un niveau d'attribut en aptitude naturelle.
 * @param {number} valeur  Le niveau actuel de l'attribut.
 * @returns {number}       L'aptitude naturelle correspondante.
 */
POLARIS.aptitudeNaturelle = function (valeur) {
  const v = Number(valeur) || 0;
  const table = POLARIS.tableAptitudeNaturelle;

  // Pas de table renseignée : formule provisoire, pour ne pas bloquer le système.
  if (!table?.length) return Math.floor(v / 2);

  const tranche = table.find((t) => v >= t.min && v <= t.max);
  if (tranche) return tranche.aptitude;

  // Hors table : on borne. Renvoyer 0 serait bien pire qu'une approximation —
  // un attribut de 1 vaudrait alors autant qu'un attribut de 8.
  return v < table[0].min ? table[0].aptitude : table.at(-1).aptitude;
};

/**
 * Échelle qualitative d'un niveau d'attribut, telle que la nomme le livre.
 * Sert à qualifier une valeur en toutes lettres sur la fiche et l'assistant.
 *
 * Source : livre de base, transmise par l'auteur du système.
 * ⚠️ À VÉRIFIER — la borne haute de « très faible » a été déduite : la source
 * indiquait « 3- », et 5 est la seule valeur qui ferme le trou avant « faible ».
 */
POLARIS.echelleAttribut = [
  { min: 1,  max: 2,        label: "POLARIS.EchelleAttribut.insignifiant" },
  { min: 3,  max: 5,        label: "POLARIS.EchelleAttribut.tresFaible" },
  { min: 6,  max: 8,        label: "POLARIS.EchelleAttribut.faible" },
  { min: 9,  max: 12,       label: "POLARIS.EchelleAttribut.moyen" },
  { min: 13, max: 15,       label: "POLARIS.EchelleAttribut.fort" },
  { min: 16, max: 18,       label: "POLARIS.EchelleAttribut.tresFort" },
  { min: 19, max: 20,       label: "POLARIS.EchelleAttribut.exceptionnel" },
  { min: 21, max: Infinity, label: "POLARIS.EchelleAttribut.surhumain" }
];

/**
 * Qualifie un niveau d'attribut.
 * @param {number} valeur
 * @returns {string|null}  Clé de traduction, ou null hors échelle.
 */
POLARIS.descriptionAttribut = function (valeur) {
  const v = Number(valeur) || 0;
  return POLARIS.echelleAttribut.find((t) => v >= t.min && v <= t.max)?.label ?? null;
};

/* -------------------------------------------- */
/*  État civil et description                   */
/* -------------------------------------------- */

/**
 * Champs de texte libre de la feuille officielle, dans leur ordre d'impression.
 * Ces listes pilotent l'affichage : y ajouter une clé suffit à faire apparaître
 * le champ, à condition de l'avoir aussi déclarée dans le DataModel et traduite.
 * Source : feuille officielle — blocs de la première page.
 */
POLARIS.champsIdentite = [
  "origineGeographique",
  "origineSociale",
  "formationBase",
  "etudesSuperieures"
];

POLARIS.champsDescription = ["taille", "poids", "peau", "corpulence", "cheveux", "yeux"];

/** Source : feuille officielle — « Droitier / Gaucher / Ambidextre ». */
POLARIS.lateralites = {
  droitier: "POLARIS.Lateralite.droitier",
  gaucher: "POLARIS.Lateralite.gaucher",
  ambidextre: "POLARIS.Lateralite.ambidextre"
};

/* -------------------------------------------- */
/*  Compétences                                 */
/* -------------------------------------------- */

/**
 * Catégories de compétences, utilisées pour regrouper l'affichage sur la fiche.
 * ⚠️ À VÉRIFIER — la feuille officielle présente les compétences en deux
 * colonnes libres, sans intitulé de catégorie. Ce regroupement est un confort
 * d'affichage propre au système, pas une donnée du livre.
 */
POLARIS.categoriesCompetence = {
  physique: "POLARIS.CategorieCompetence.physique",
  combat: "POLARIS.CategorieCompetence.combat",
  sociale: "POLARIS.CategorieCompetence.sociale",
  technique: "POLARIS.CategorieCompetence.technique",
  savoir: "POLARIS.CategorieCompetence.savoir"
};

/**
 * Marqueurs de compétence de la feuille officielle, repris en légende de page 1 :
 *   •   compétence limitative
 *   PN  compétence à progression naturelle
 *   (X) compétence réservée
 *   †   compétence à pré-requis (optionnel)
 * Source : feuille officielle.
 */
POLARIS.marqueursCompetence = {
  limitative: { symbole: "•", label: "POLARIS.MarqueurCompetence.limitative" },
  progressionNaturelle: { symbole: "PN", label: "POLARIS.MarqueurCompetence.progressionNaturelle" },
  reservee: { symbole: "(X)", label: "POLARIS.MarqueurCompetence.reservee" },
  prerequis: { symbole: "†", label: "POLARIS.MarqueurCompetence.prerequis" }
};

/**
 * ⚠️ À VÉRIFIER / INCOMPLET — Liste officielle des compétences.
 *
 * La feuille officielle laisse les lignes de compétences vierges : elle ne
 * permet donc pas de reconstituer la liste. Les entrées ci-dessous sont un
 * squelette destiné à rendre le système testable, PAS la liste du livre, et
 * leurs couples d'attributs sont des suppositions.
 *
 * Format d'une entrée :
 *   cle: {
 *     label: "clé de traduction (à ajouter dans lang/fr.json et lang/en.json)",
 *     attributs: ["attr1", "attr2"],   // les aptitudes naturelles additionnées
 *     categorie: "clé de POLARIS.categoriesCompetence",
 *     speciale: true,                  // voir ci-dessous, défaut : false
 *     marqueurs: ["clé de POLARIS.marqueursCompetence"]   // optionnel
 *   }
 *
 * `speciale` distingue les deux natures de compétence :
 *   - GÉNÉRIQUE (défaut) : tout personnage la possède, elle figure d'office sur
 *     la fiche même à maîtrise nulle ;
 *   - SPÉCIALE : elle s'ACHÈTE avec des points de compétence à la création, et
 *     n'apparaît sur la fiche que si le personnage l'a effectivement acquise.
 * L'assistant de création s'appuie sur ce drapeau pour séparer ses deux écrans.
 *
 * Ajouter une compétence ne demande qu'une entrée ici plus sa traduction : la
 * fiche, les jets et les cartes de chat suivent automatiquement.
 */
POLARIS.competences = {
  acrobatie:    { label: "POLARIS.Competence.acrobatie",    attributs: ["coo", "ada"], categorie: "physique" },
  athletisme:   { label: "POLARIS.Competence.athletisme",   attributs: ["for", "con"], categorie: "physique" },
  endurance:    { label: "POLARIS.Competence.endurance",    attributs: ["con", "vol"], categorie: "physique" },
  escalade:     { label: "POLARIS.Competence.escalade",     attributs: ["for", "coo"], categorie: "physique" },
  respiration:  { label: "POLARIS.Competence.respiration",  attributs: ["con", "vol"], categorie: "physique" },
  manoeuvres:   { label: "POLARIS.Competence.manoeuvres",   attributs: ["coo", "ada"], categorie: "physique" },

  contact:      { label: "POLARIS.Competence.contact",      attributs: ["for", "coo"], categorie: "combat" },
  tir:          { label: "POLARIS.Competence.tir",          attributs: ["per", "coo"], categorie: "combat" },
  artsMartiaux: { label: "POLARIS.Competence.artsMartiaux", attributs: ["coo", "ada"], categorie: "combat" },

  persuasion:   { label: "POLARIS.Competence.persuasion",   attributs: ["pre", "int"], categorie: "sociale" },
  intimidation: { label: "POLARIS.Competence.intimidation", attributs: ["pre", "vol"], categorie: "sociale" },

  vigilance:    { label: "POLARIS.Competence.vigilance",    attributs: ["per", "int"], categorie: "technique" }
};

/** Bornes de saisie du niveau de maîtrise d'une compétence. */
POLARIS.bornesMaitrise = { min: 0, max: 20 };

/** Les clés des compétences génériques, que tout personnage possède d'office. */
POLARIS.competencesGeneriques = () =>
  Object.keys(POLARIS.competences).filter((cle) => !POLARIS.competences[cle].speciale);

/** Les clés des compétences spéciales, à acheter avec des points de compétence. */
POLARIS.competencesSpeciales = () =>
  Object.keys(POLARIS.competences).filter((cle) => POLARIS.competences[cle].speciale);

/* -------------------------------------------- */
/*  Attributs secondaires                       */
/* -------------------------------------------- */

/**
 * Tables de conversion des attributs secondaires.
 *
 * ATTENTION — chaque secondaire a SA PROPRE table : les résistances naturelles,
 * la résistance aux dommages et le modificateur de dommages au contact ne
 * suivent PAS `tableAptitudeNaturelle`, et ne se suivent pas non plus entre
 * elles. Confondre ces tables fausserait silencieusement toute la fiche.
 *
 * Format d'une table :
 *   {
 *     tranches: [{ min, max, valeur }, …],
 *     // Prolongement au-delà de la dernière tranche, quand le livre énonce une
 *     // règle plutôt qu'une liste (« +1 tous les 2 niveaux »).
 *     extrapolation: { min, valeur, pas, parNiveaux } | null
 *   }
 *
 * Une table à `null` n'est pas encore renseignée : la valeur brute passe alors
 * telle quelle et la fiche le signale.
 */
POLARIS.tablesConversion = {
  /**
   * Résistances naturelles — poison, maladie, radiations et drogues.
   * Source : livre de base, transmis par l'auteur du système.
   *
   * Noter le sens : plus l'attribut est élevé, plus la valeur est BASSE. Un
   * personnage robuste tend vers le négatif, un personnage fragile vers +6.
   */
  resistancesNaturelles: {
    tranches: [
      { min: 1,  max: 2,  valeur: 6 },
      { min: 3,  max: 4,  valeur: 4 },
      { min: 5,  max: 6,  valeur: 2 },
      { min: 7,  max: 8,  valeur: 1 },
      { min: 9,  max: 11, valeur: 0 },
      { min: 12, max: 13, valeur: -1 },
      { min: 14, max: 15, valeur: -2 },
      { min: 16, max: 17, valeur: -3 },
      { min: 18, max: 19, valeur: -4 },
      { min: 20, max: 21, valeur: -5 }
    ],
    // « 22 et au-delà : -1 tous les 2 niveaux », donc 22-23 → -6, 24-25 → -7…
    extrapolation: { min: 22, valeur: -6, pas: -1, parNiveaux: 2 }
  },

  /**
   * Résistance aux dommages, lue sur la SOMME de la Force et de la Constitution.
   * Source : livre de base, transmis par l'auteur du système.
   *
   * ⚠️ CORRECTION SUPPOSÉE — la source donnait « -25 = -1 » sans borne basse.
   * Toutes les tranches de cette table faisant exactement quatre niveaux, elle
   * est lue 22-25. À confirmer.
   */
  resistanceDommages: {
    tranches: [
      // La table démarre à 2 : c'est le minimum d'une somme de deux attributs.
      { min: 2,  max: 5,  valeur: 6 },
      { min: 6,  max: 9,  valeur: 4 },
      { min: 10, max: 13, valeur: 2 },
      { min: 14, max: 17, valeur: 1 },
      { min: 18, max: 21, valeur: 0 },
      { min: 22, max: 25, valeur: -1 },
      { min: 26, max: 29, valeur: -2 },
      { min: 30, max: 33, valeur: -3 },
      { min: 34, max: 37, valeur: -4 },
      { min: 38, max: 41, valeur: -5 }
    ],
    // « 42 et au-delà : -1 tous les 4 niveaux », donc 42-45 → -6, 46-49 → -7…
    extrapolation: { min: 42, valeur: -6, pas: -1, parNiveaux: 4 }
  },

  /**
   * Modificateur de dommages au contact, lu sur la FORCE.
   * Source : livre de base, transmis par l'auteur du système.
   *
   * Les deux premières tranches avaient été mal transcrites (« 1-2 = -1,
   * 3-4 = -4 », non monotone) puis rectifiées par l'auteur en -6 et -4. La table
   * suit ainsi la même forme que les résistances, au signe près : les extrêmes
   * s'écartent par paliers de 2 avant de progresser de 1 en 1.
   */
  modifDommages: {
    tranches: [
      { min: 1,  max: 2,  valeur: -6 },
      { min: 3,  max: 4,  valeur: -4 },
      { min: 5,  max: 6,  valeur: -2 },
      { min: 7,  max: 8,  valeur: -1 },
      { min: 9,  max: 11, valeur: 0 },
      { min: 12, max: 13, valeur: 1 },
      { min: 14, max: 15, valeur: 2 },
      { min: 16, max: 17, valeur: 3 },
      { min: 18, max: 19, valeur: 4 },
      { min: 20, max: 21, valeur: 5 }
    ],
    // « 22 et au-delà : +1 tous les 2 niveaux », donc 22-23 → +6, 24-25 → +7…
    extrapolation: { min: 22, valeur: 6, pas: 1, parNiveaux: 2 }
  }
};

/**
 * Applique une table de conversion à une valeur brute.
 * @param {string} cleTable  Clé dans POLARIS.tablesConversion.
 * @param {number} valeur    Valeur brute issue de la formule.
 * @returns {number}         La valeur convertie, ou la valeur brute si la table
 *                           n'est pas encore renseignée.
 */
POLARIS.convertir = function (cleTable, valeur) {
  const table = POLARIS.tablesConversion[cleTable];
  const v = Number(valeur) || 0;

  const tranches = Array.isArray(table) ? table : table?.tranches;
  if (!tranches?.length) return v;

  const tranche = tranches.find((t) => v >= t.min && v <= t.max);
  if (tranche) return tranche.valeur;

  // Au-delà de la dernière tranche, le livre peut énoncer une progression
  // continue plutôt que de poursuivre la liste.
  const extra = Array.isArray(table) ? null : table.extrapolation;
  if (extra && v >= extra.min) {
    return extra.valeur + Math.floor((v - extra.min) / extra.parNiveaux) * extra.pas;
  }

  // Hors table et sans règle de prolongement : on borne sur l'extrémité.
  return v < tranches[0].min ? tranches[0].valeur : tranches.at(-1).valeur;
};

/**
 * Attributs secondaires, calculés à partir des NIVEAUX ACTUELS d'attributs
 * (et non de leurs aptitudes naturelles), comme l'indique la feuille.
 *
 * `formule` reçoit la table des niveaux actuels, indexée par clé d'attribut, et
 * rend une valeur BRUTE. `table` désigne ensuite, s'il y a lieu, la table de
 * conversion à lui appliquer.
 *
 * Source : feuille officielle pour Réaction, Drogue, Maladie et Souffle, dont
 * les formules sont imprimées entre parenthèses.
 * ⚠️ À VÉRIFIER : Choc (seuils d'étourdissement et d'inconscience), modificateur
 * de dommages au contact et résistance aux dommages figurent sur la feuille
 * mais SANS formule — ils restent en saisie manuelle jusqu'à ce qu'on l'ait.
 */
POLARIS.attributsSecondaires = {
  seuilEtourdissement: {
    label: "POLARIS.Secondaire.seuilEtourdissement",
    groupe: "choc",
    // Source : livre de base — « (FOR+CON+VOL)/3 ».
    formule: (a) => Math.floor((a.for + a.con + a.vol) / 3),
    table: null
  },
  seuilInconscience: {
    label: "POLARIS.Secondaire.seuilInconscience",
    groupe: "choc",
    /**
     * Source : livre de base — « seuil d'étourdissement (modifié par
     * d'éventuels bonus ou pénalités) + 10 ».
     *
     * Le calcul part donc du TOTAL du seuil d'étourdissement, bonus compris, et
     * non de sa valeur brute : un personnage dont l'étourdissement est amélioré
     * voit son inconscience reculer d'autant. D'où le second argument, qui
     * expose les secondaires déjà calculés — et l'ordre de déclaration, qui doit
     * placer l'étourdissement avant l'inconscience.
     */
    formule: (a, s) => s.seuilEtourdissement + POLARIS.ecartInconscience,
    table: null
  },
  modifDommages: {
    label: "POLARIS.Secondaire.modifDommages",
    // Lu directement sur la Force, via sa propre table.
    // Source : livre de base.
    formule: (a) => a.for,
    table: "modifDommages"
  },
  reaction: {
    label: "POLARIS.Secondaire.reaction",
    // Source : feuille officielle et livre de base — « Réaction (ADA+PER)/2 ».
    formule: (a) => Math.floor((a.ada + a.per) / 2),
    table: null
  },
  resistanceDommages: {
    label: "POLARIS.Secondaire.resistanceDommages",
    // Source : livre de base — dépend de la Force ET de la Constitution.
    // ⚠️ La SOMME est retenue : les tranches de la table montent jusqu'à 42 et
    // au-delà, ce qu'une moyenne de deux attributs ne pourrait jamais atteindre.
    formule: (a) => a.for + a.con,
    table: "resistanceDommages"
  },
  resistanceDrogue: {
    label: "POLARIS.Secondaire.resistanceDrogue",
    groupe: "resistancesNaturelles",
    // Source : feuille officielle — « Drogue (CON+VOL)/2 ».
    formule: (a) => Math.floor((a.con + a.vol) / 2),
    table: "resistancesNaturelles"
  },
  resistanceMaladie: {
    label: "POLARIS.Secondaire.resistanceMaladie",
    groupe: "resistancesNaturelles",
    // Source : feuille officielle — « Maladie, poison & Radiation (CON) ».
    formule: (a) => a.con,
    table: "resistancesNaturelles"
  },
  souffle: {
    label: "POLARIS.Secondaire.souffle",
    // Source : feuille officielle et livre de base — « Souffle (CON+VOL)/2 ».
    formule: (a) => Math.floor((a.con + a.vol) / 2),
    // Confirmé sans table : le résultat est un nombre de tours, pas un
    // modificateur. C'est le seul secondaire qui s'exprime dans une unité.
    table: null,
    unite: "POLARIS.Unite.toursCombat"
  }
};

/**
 * Écart entre le seuil d'étourdissement et celui d'inconscience.
 * Source : livre de base — « seuil d'étourdissement + 10 ».
 */
POLARIS.ecartInconscience = 10;

/**
 * ⚠️ À VÉRIFIER — l'arrondi des formules en /2 et /3 n'est précisé nulle part.
 * L'inférieur est retenu ici ; changer `Math.floor` en `Math.round` ci-dessus
 * suffit à basculer si le livre en décide autrement.
 */

/* -------------------------------------------- */
/*  Initiative                                  */
/* -------------------------------------------- */

/**
 * L'initiative n'est pas un jet : c'est une piste graduée sur laquelle on
 * démarre à sa Réaction.
 * Source : feuille officielle — « INITIATIVE / Niveau de départ = Réaction »,
 * piste imprimée de 0 à 25.
 */
POLARIS.initiative = {
  secondaireDeDepart: "reaction",
  piste: { min: 0, max: 25 }
};

/* -------------------------------------------- */
/*  Difficultés et marges                       */
/* -------------------------------------------- */

/**
 * Table des marges de réussite et d'échec : une marge se convertit en
 * modificateur, appliqué en positif ou en négatif selon le sens de l'effet.
 * `min` est la borne basse de la tranche, bornes incluses ; la dernière tranche
 * est ouverte vers le haut (35+).
 * Source : feuille officielle — « TABLE DES MARGES DE RÉUSSITE ET D'ÉCHEC ».
 */
POLARIS.tableMarges = [
  { min: 1,  max: 2,             mod: 0 },
  { min: 3,  max: 4,             mod: 1 },
  { min: 5,  max: 6,             mod: 2 },
  { min: 7,  max: 9,             mod: 3 },
  { min: 10, max: 12,            mod: 4 },
  { min: 13, max: 14,            mod: 5 },
  { min: 15, max: 19,            mod: 6 },
  { min: 20, max: 24,            mod: 7 },
  { min: 25, max: 34,            mod: 8 },
  { min: 35, max: Infinity,      mod: 9 }
];

/**
 * Convertit une marge en modificateur via la table ci-dessus.
 * @param {number} marge  Marge de réussite ou d'échec (valeur absolue).
 * @returns {number}      Le modificateur associé, 0 si la marge est nulle.
 */
POLARIS.modificateurDeMarge = function (marge) {
  const m = Math.abs(Number(marge) || 0);
  if (m < 1) return 0;
  return POLARIS.tableMarges.find((t) => m >= t.min && m <= t.max)?.mod ?? 0;
};

/**
 * ⚠️ À VÉRIFIER — Modificateurs de difficulté proposés dans la fenêtre de jet.
 * La feuille n'en donne pas la liste ; l'échelle retenue est calquée sur celle
 * de la table des marges. Le modificateur s'ajoute aux chances de réussite.
 */
POLARIS.difficultes = {
  tresFacile: { label: "POLARIS.Difficulte.tresFacile", mod: 6 },
  facile:     { label: "POLARIS.Difficulte.facile",     mod: 3 },
  normale:    { label: "POLARIS.Difficulte.normale",    mod: 0 },
  difficile:  { label: "POLARIS.Difficulte.difficile",  mod: -3 },
  tresDure:   { label: "POLARIS.Difficulte.tresDure",   mod: -6 },
  extreme:    { label: "POLARIS.Difficulte.extreme",    mod: -9 }
};

/** Difficulté présélectionnée à l'ouverture de la fenêtre de jet. */
POLARIS.difficulteParDefaut = "normale";

/* -------------------------------------------- */
/*  Localisations                               */
/* -------------------------------------------- */

/** Dé utilisé pour déterminer la localisation d'une blessure. */
POLARIS.deLocalisation = "1d20";

/**
 * Les six zones du corps, dans l'ordre des colonnes de la table des blessures.
 * Source : feuille officielle — Tête, Corps, Bras d., Bras g., Jambe d., Jambe g.
 */
POLARIS.localisations = {
  tete:        { label: "POLARIS.Localisation.tete" },
  corps:       { label: "POLARIS.Localisation.corps" },
  brasDroit:   { label: "POLARIS.Localisation.brasDroit",   membre: true },
  brasGauche:  { label: "POLARIS.Localisation.brasGauche",  membre: true },
  jambeDroite: { label: "POLARIS.Localisation.jambeDroite", membre: true },
  jambeGauche: { label: "POLARIS.Localisation.jambeGauche", membre: true }
};

/**
 * Tables de localisation : le tir et le contact ne touchent pas aux mêmes
 * endroits. `intervalle` est la fourchette du d20, bornes incluses.
 * Source : feuille officielle — deux lignes « Localisation (contact) » et
 * « Localisation (distance) » au-dessus de la table des blessures.
 */
POLARIS.tablesLocalisation = {
  contact: {
    label: "POLARIS.TableLocalisation.contact",
    intervalles: {
      tete:        [1, 4],
      corps:       [5, 10],
      brasDroit:   [11, 13],
      brasGauche:  [14, 16],
      jambeDroite: [17, 18],
      jambeGauche: [19, 20]
    }
  },
  distance: {
    label: "POLARIS.TableLocalisation.distance",
    intervalles: {
      tete:        [1, 2],
      corps:       [3, 8],
      brasDroit:   [9, 11],
      brasGauche:  [12, 14],
      jambeDroite: [15, 17],
      jambeGauche: [18, 20]
    }
  }
};

/** Table de localisation utilisée quand l'appelant n'en précise pas. */
POLARIS.tableLocalisationParDefaut = "contact";

/* -------------------------------------------- */
/*  Blessures                                   */
/* -------------------------------------------- */

/**
 * Gravités de blessure. La santé de Polaris n'est pas une jauge de points mais
 * une grille de cases : les dégâts encaissés désignent une gravité par leur
 * seuil, et on coche une case dans la colonne de la localisation touchée.
 *
 * `seuil`  : dégâts à partir desquels la blessure est de cette gravité.
 * `malus`  : malus général appliqué tant qu'une case de cette ligne est cochée.
 * `actionImpossible` : la ligne interdit toute action (deux dernières gravités).
 *
 * Source : feuille officielle — table BLESSURES, colonne « Malus ».
 */
POLARIS.gravitesBlessure = {
  legere:    { label: "POLARIS.Blessure.legere",    seuil: 5,  malus: -1 },
  moyenne:   { label: "POLARIS.Blessure.moyenne",   seuil: 10, malus: -3 },
  grave:     { label: "POLARIS.Blessure.grave",     seuil: 15, malus: -5 },
  critique:  { label: "POLARIS.Blessure.critique",  seuil: 20, malus: -10 },
  mortelle:  { label: "POLARIS.Blessure.mortelle",  seuil: 25, malus: -15, actionImpossible: true },
  destruction: { label: "POLARIS.Blessure.destruction", seuil: 30, malus: -30, actionImpossible: true }
};

/**
 * Nombre de cases par gravité et par localisation.
 * Source : feuille officielle — comptage des cases imprimées.
 *
 * ⚠️ À VÉRIFIER — sur la ligne « Mortelles (25) », le nombre de cases des bras
 * est difficile à départager à l'impression. La symétrie gauche/droite est
 * supposée ici (1 case de chaque côté) ; à confirmer dans le livre.
 */
POLARIS.casesBlessure = {
  legere:      { tete: 3, corps: 4, brasDroit: 3, brasGauche: 3, jambeDroite: 3, jambeGauche: 3 },
  moyenne:     { tete: 3, corps: 3, brasDroit: 3, brasGauche: 3, jambeDroite: 3, jambeGauche: 3 },
  grave:       { tete: 2, corps: 3, brasDroit: 2, brasGauche: 2, jambeDroite: 2, jambeGauche: 2 },
  critique:    { tete: 2, corps: 2, brasDroit: 2, brasGauche: 2, jambeDroite: 2, jambeGauche: 2 },
  mortelle:    { tete: 1, corps: 2, brasDroit: 1, brasGauche: 1, jambeDroite: 1, jambeGauche: 1 },
  destruction: { tete: 0, corps: 0, brasDroit: 1, brasGauche: 1, jambeDroite: 1, jambeGauche: 1 }
};

/**
 * Malus propres à une case, lorsqu'ils diffèrent du malus général de la ligne.
 * Une localisation absente de la table retombe sur `gravitesBlessure[…].malus`.
 * Source : feuille officielle — valeurs imprimées à côté des cases concernées.
 */
POLARIS.malusBlessure = {
  grave:       { tete: -5, corps: 0 },
  critique:    { tete: -10, corps: -5, brasDroit: 0, brasGauche: 0, jambeDroite: 0, jambeGauche: 0 },
  mortelle:    { tete: -15, corps: -10, brasDroit: -5, brasGauche: -5, jambeDroite: -5, jambeGauche: -5 },
  destruction: { brasDroit: -10, brasGauche: -10, jambeDroite: -10, jambeGauche: -10 }
};

/**
 * Localisations pour lesquelles la gravité `destruction` est fatale plutôt que
 * mutilante : la feuille y imprime « Mort » au lieu d'une case.
 * Source : feuille officielle — ligne « Mort/Membre détruit (30) ».
 */
POLARIS.localisationsFatales = ["tete", "corps"];

/**
 * ⚠️ À VÉRIFIER — Les malus de blessure se cumulent-ils, ou seule la blessure
 * la plus handicapante compte-t-elle ?
 *
 * La feuille imprime un malus par ligne sans dire comment plusieurs blessures
 * se combinent. `true` additionne le malus de chaque case cochée ; `false` ne
 * retient que le pire. Les deux valeurs sont calculées dans tous les cas et
 * consultables sous `system.sante.malusCumule` et `system.sante.malusPire` :
 * ce réglage décide seulement lequel des deux alimente `system.sante.malus`.
 */
POLARIS.cumulMalusBlessures = true;

/**
 * Détermine la gravité d'une blessure à partir des dégâts encaissés.
 * @param {number} degats  Dégâts après protection.
 * @returns {string|null}  Clé dans POLARIS.gravitesBlessure, ou null si aucune blessure.
 */
POLARIS.graviteBlessure = function (degats) {
  const d = Number(degats) || 0;
  let resultat = null;
  for (const [cle, gravite] of Object.entries(POLARIS.gravitesBlessure)) {
    if (d >= gravite.seuil) resultat = cle;
  }
  return resultat;
};

/* -------------------------------------------- */
/*  Déplacements                                */
/* -------------------------------------------- */

/**
 * Allures de déplacement, au sol et sous l'eau.
 * Source : feuille officielle — table DÉPLACEMENTS (existence des lignes et
 * colonnes).
 * ⚠️ À VÉRIFIER — les valeurs et leur mode de calcul ne figurent pas sur la
 * feuille : les champs sont saisis à la main tant que la formule est inconnue.
 */
POLARIS.milieuxDeplacement = {
  sol: "POLARIS.Deplacement.sol",
  eau: "POLARIS.Deplacement.eau"
};

POLARIS.alluresDeplacement = {
  lente: "POLARIS.Allure.lente",
  moyenne: "POLARIS.Allure.moyenne",
  rapide: "POLARIS.Allure.rapide",
  max: "POLARIS.Allure.max"
};

/* -------------------------------------------- */
/*  Armes                                       */
/* -------------------------------------------- */

/**
 * Les deux familles d'armes de la feuille, avec les colonnes propres à chacune.
 * Source : feuille officielle — tables « ARMES (CONTACT) » et « ARMES (TIR) ».
 */
POLARIS.categoriesArme = {
  contact: { label: "POLARIS.CategorieArme.contact", tableLocalisation: "contact" },
  tir:     { label: "POLARIS.CategorieArme.tir",     tableLocalisation: "distance" }
};

/**
 * Paliers de portée d'une arme de tir et modificateur associé aux chances.
 * Source : feuille officielle — en-tête « Portée (+0/-5/-10/-15) ».
 * La distance couverte par chaque palier est propre à l'arme et se saisit sur
 * la fiche d'objet.
 */
POLARIS.porteesTir = {
  courte:  { label: "POLARIS.Portee.courte",  mod: 0 },
  moyenne: { label: "POLARIS.Portee.moyenne", mod: -5 },
  longue:  { label: "POLARIS.Portee.longue",  mod: -10 },
  extreme: { label: "POLARIS.Portee.extreme", mod: -15 }
};

/**
 * ⚠️ À VÉRIFIER — Modes de tir. La feuille prévoit la colonne « Mode de tir »
 * mais n'en énumère pas les valeurs.
 */
POLARIS.modesTir = {
  coupParCoup: { label: "POLARIS.ModeTir.coupParCoup" },
  rafale:      { label: "POLARIS.ModeTir.rafale" },
  automatique: { label: "POLARIS.ModeTir.automatique" }
};

/** Dégâts à mains nues, seule arme préremplie sur la feuille officielle. */
POLARIS.degatsMainsNues = "1d6";

/* -------------------------------------------- */
/*  Création de personnage                      */
/* -------------------------------------------- */

/**
 * Les cinq étapes de la création de personnage.
 * Source : livre de base, transmises par l'auteur du système.
 *
 * L'assistant construit sa barre de progression, sa navigation et sa validation
 * à partir de cette liste. Une étape a besoin d'un template
 * `templates/apps/creation/<cle>.hbs`.
 *
 * Noter qu'aucune étape ne porte l'état civil : la création de Polaris est
 * purement mécanique. Le nom vit donc dans l'en-tête de l'assistant, présent à
 * toutes les étapes, et le reste de l'état civil se remplit sur la fiche.
 */
POLARIS.creation = {};

POLARIS.creation.etapes = [
  { cle: "capacitesBase",          label: "POLARIS.Creation.Etape.capacitesBase",          icone: "fa-solid fa-sliders" },
  { cle: "typeGenetique",          label: "POLARIS.Creation.Etape.typeGenetique",          icone: "fa-solid fa-dna" },
  { cle: "capacitesSpeciales",     label: "POLARIS.Creation.Etape.capacitesSpeciales",     icone: "fa-solid fa-star" },
  { cle: "experiencePreliminaire", label: "POLARIS.Creation.Etape.experiencePreliminaire", icone: "fa-solid fa-briefcase" },
  { cle: "avantages",              label: "POLARIS.Creation.Etape.avantages",              icone: "fa-solid fa-scale-balanced" }
];

/**
 * Ambiance de campagne, choisie par le meneur pour toute la table.
 *
 * Elle ne fait pas que colorer le ton : elle FIXE la Chance des personnages,
 * seul attribut qui ne s'achète pas. Une partie héroïque ne rend pas les
 * personnages plus compétents, elle les rend plus chanceux.
 *
 * Source : livre de base, transmis par l'auteur du système.
 */
POLARIS.ambiances = {
  realiste:      { label: "POLARIS.Ambiance.realiste",      chance: 11, pointsAttributs: 30 },
  intermediaire: { label: "POLARIS.Ambiance.intermediaire", chance: 13, pointsAttributs: 38 },
  heroique:      { label: "POLARIS.Ambiance.heroique",      chance: 15, pointsAttributs: 46 }
};

/** Ambiance retenue si le monde n'en a pas encore choisi. */
POLARIS.ambianceParDefaut = "intermediaire";

/** Clé du réglage de monde portant l'ambiance. */
POLARIS.REGLAGE_AMBIANCE = "ambiance";

/**
 * Ambiance courante du monde.
 *
 * Hors de Foundry — dans les tests — le réglage n'existe pas : on retombe alors
 * sur l'ambiance par défaut plutôt que d'échouer.
 * @returns {string} Clé dans POLARIS.ambiances.
 */
POLARIS.ambianceCourante = function () {
  try {
    return game?.settings?.get(POLARIS.ID, POLARIS.REGLAGE_AMBIANCE) ?? POLARIS.ambianceParDefaut;
  } catch {
    return POLARIS.ambianceParDefaut;
  }
};

/**
 * Réglages de l'ambiance courante, avec repli sur celle par défaut.
 * @returns {{label: string, chance: number, pointsAttributs: number}}
 */
POLARIS.reglagesAmbiance = function () {
  return POLARIS.ambiances[POLARIS.ambianceCourante()] ?? POLARIS.ambiances[POLARIS.ambianceParDefaut];
};

/**
 * Niveau de Chance imposé par l'ambiance courante.
 * @returns {number}
 */
POLARIS.chanceDeLAmbiance = function () {
  return POLARIS.reglagesAmbiance().chance;
};

/**
 * Achat des attributs à la création.
 *
 * Tout attribut démarre à 7, et monter d'un niveau coûte de plus en plus cher :
 * 1 point de 8 à 15, le double de 16 à 18, le triple pour 19 et 20. Un
 * personnage très pointu paie donc lourdement ses derniers niveaux.
 *
 * Source : livre de base, transmis par l'auteur du système.
 */
POLARIS.creation.attributs = {
  niveauDepart: 7,

  /**
   * Les huit attributs sur lesquels se répartissent les points de création.
   * La Chance en est exclue : elle ne s'achète pas, elle découle de l'ambiance
   * de campagne choisie par le meneur (voir POLARIS.ambiances).
   *
   * Source : livre de base, transmis par l'auteur du système.
   */
  repartissables: ["for", "con", "coo", "ada", "per", "int", "vol", "pre"],

  /** Coût d'un niveau, selon la tranche qu'il fait atteindre. */
  couts: [
    { min: 8,  max: 15, cout: 1 },
    { min: 16, max: 18, cout: 2 },
    { min: 19, max: 20, cout: 3 }
  ],

  /** Plafond atteignable à la création. */
  niveauMax: 20
};

/**
 * Coût total pour porter un attribut de son niveau de départ à `niveau`.
 *
 * Le coût est cumulatif niveau par niveau, et non forfaitaire : atteindre 17
 * coûte les huit premiers niveaux à 1, puis 16 et 17 à 2.
 *
 * @param {number} niveau  Niveau visé.
 * @returns {number}       Points de création dépensés.
 */
POLARIS.creation.coutAttribut = function (niveau) {
  const { niveauDepart, couts } = POLARIS.creation.attributs;
  const cible = Number(niveau) || 0;

  let total = 0;
  for (let n = niveauDepart + 1; n <= cible; n++) {
    // ⚠️ À VÉRIFIER — au-delà de la dernière tranche connue, on reconduit son
    // coût plutôt que de rendre les niveaux gratuits.
    const tranche = couts.find((t) => n >= t.min && n <= t.max);
    total += tranche ? tranche.cout : couts.at(-1).cout;
  }
  return total;
};

/**
 * Points de capacités de base accordés par l'ambiance de campagne.
 *
 * Le meneur ne choisit donc pas seulement un ton : il décide de la compétence
 * moyenne de la table. Avec 30 points répartis sur huit attributs partant de 7,
 * un personnage réaliste tourne autour de 10 ou 11 — « moyen » sur l'échelle du
 * livre ; à 46 points, l'héroïque frôle le 13.
 *
 * Source : livre de base, transmis par l'auteur du système.
 * @returns {number}
 */
POLARIS.creation.pointsAttributs = function () {
  return POLARIS.reglagesAmbiance().pointsAttributs;
};

/* -------------------------------------------- */
/*  Origines et formations                      */
/* -------------------------------------------- */

/** Chemin du catalogue des origines, relatif à la racine du système. */
POLARIS.CHEMIN_ORIGINES = `systems/${POLARIS.ID}/data/origines.json`;

/**
 * Dés de tirage de chaque section, remplis au chargement depuis le fichier.
 * `null` tant que la section n'a pas de dé déclaré : elle ne se tire pas.
 */
POLARIS.creation.desOrigines = { geographiques: null, sociales: null, formations: null };

/**
 * Compétences citées par les origines mais absentes de `POLARIS.competences`.
 *
 * On les recense au lieu de les inventer : leur couple d'attributs conditionne
 * tous leurs chiffres, et une paire devinée fausserait la fiche en silence.
 * Le démarrage les journalise, et l'assistant signale qu'un niveau accordé ne
 * sera pas appliqué.
 */
POLARIS.competencesAConfirmer = new Set();

/**
 * Valide et indexe une section du catalogue des origines.
 *
 * Comme pour les capacités spéciales, une entrée fautive est écartée seule,
 * avec un avertissement nommé : le fichier est rempli à la main.
 *
 * @param {object[]} entrees
 * @returns {{origines: object[], erreurs: string[]}}
 */
POLARIS.indexerOrigines = function (entrees) {
  const origines = [];
  const erreurs = [];
  const vues = new Set();

  const lireCompetence = (c, ou) => {
    if (!c?.cle) { erreurs.push(`${ou} : compétence sans « cle »`); return null; }
    if (!POLARIS.competences[c.cle]) POLARIS.competencesAConfirmer.add(c.cle);

    return {
      cle: c.cle,
      specialisation: c.specialisation ?? "",
      niveau: Number(c.niveau) || 0,
      // Signale à l'écran qu'un niveau accordé restera lettre morte.
      inconnue: !POLARIS.competences[c.cle]
    };
  };

  for (const [rang, entree] of (entrees ?? []).entries()) {
    const ou = `entrée ${rang + 1}`;

    if (!entree?.id) { erreurs.push(`${ou} : « id » manquant`); continue; }
    if (!entree.nom) { erreurs.push(`${ou} (${entree.id}) : « nom » manquant`); continue; }
    if (vues.has(entree.id)) { erreurs.push(`${ou} : « id » en double — ${entree.id}`); continue; }
    vues.add(entree.id);

    const competences = (entree.competences ?? [])
      .map((c) => lireCompetence(c, `${ou} (${entree.id})`))
      .filter(Boolean);

    const choix = (entree.choix ?? [])
      .map((groupe, i) => ({
        niveau: Number(groupe.niveau) || 0,
        options: (groupe.options ?? [])
          .map((o) => lireCompetence(o, `${ou} (${entree.id}), choix ${i + 1}`))
          .filter(Boolean)
      }))
      .filter((groupe) => groupe.options.length >= 2);

    origines.push({
      id: entree.id,
      nom: entree.nom,
      description: entree.description ?? "",
      tirage: Array.isArray(entree.tirage) && entree.tirage.length === 2 ? [...entree.tirage] : null,
      competences,
      choix
    });
  }

  return { origines, erreurs };
};

/**
 * Origine que désigne un résultat de dé dans une section.
 * @param {string} section  geographiques | sociales | formations
 * @param {number} de
 * @returns {object|null}
 */
POLARIS.origineTiree = function (section, de) {
  return (
    (POLARIS.creation[section] ?? []).find(
      (o) => o.tirage && de >= o.tirage[0] && de <= o.tirage[1]
    ) ?? null
  );
};

/**
 * Âges de la création.
 * Source : livre de base, transmis par l'auteur du système.
 *
 * Un enfant est adulte à 12 ans et son apprentissage commence aussitôt : c'est
 * de là que se comptent les années d'expérience préliminaire. Un métier ne peut
 * en revanche être exercé qu'à partir de 16 ans, ce qui fait de l'âge de départ
 * un vrai choix — un personnage jeune aura peu vécu.
 */
POLARIS.creation.age = {
  /** Âge auquel l'apprentissage démarre, et donc origine du décompte. */
  debutApprentissage: 12,

  /** Âge minimal pour exercer un métier. */
  ageMinimumMetier: 16,

  /**
   * Deux méthodes au choix du joueur : un âge sûr, ou un tirage qui peut
   * rapporter une année de plus comme en coûter trois.
   */
  methodes: {
    fixe: { label: "POLARIS.Creation.Age.fixe", age: 17 },
    tirage: { label: "POLARIS.Creation.Age.tirage", base: 14, de: "1d4" }
  },

  methodeParDefaut: "fixe"
};

/**
 * Années d'apprentissage dont dispose un personnage à la création.
 * @param {number} ageDepart
 * @returns {number} Jamais négatif : un âge sous 12 ans ne rend rien.
 */
POLARIS.creation.anneesApprentissage = function (ageDepart) {
  return Math.max(0, (Number(ageDepart) || 0) - POLARIS.creation.age.debutApprentissage);
};

/**
 * Le personnage est-il en âge d'exercer un métier ?
 * @param {number} ageDepart
 * @returns {boolean}
 */
POLARIS.creation.peutExercerUnMetier = function (ageDepart) {
  return (Number(ageDepart) || 0) >= POLARIS.creation.age.ageMinimumMetier;
};

/**
 * ⚠️ À VÉRIFIER — Budgets des enveloppes annexes.
 *
 * Elles ne se confondent pas avec les points de création : les attributs, le
 * type génétique et les mutations puisent tous dans la bourse de PC, tandis que
 * l'expérience préliminaire et les avantages ont leurs propres réserves.
 *
 * `null` signifie « budget inconnu » : l'assistant compte alors la dépense sans
 * jamais l'interdire, et le signale à l'écran plutôt que d'inventer un plafond.
 * Renseigner un nombre active le décompte et bloque l'étape en cas de
 * dépassement.
 *
 * `avantages` et `desavantages` sont deux enveloppes distinctes, l'archétype
 * pouvant abonder l'une et l'autre séparément.
 */
POLARIS.creation.points = {
  experiencePreliminaire: null,
  avantages: null,
  desavantages: null
};

/**
 * ⚠️ À VÉRIFIER / VIDE — Catalogues de création.
 *
 * Ces tables sont volontairement vides : elles attendent les listes du livre.
 * Tant qu'un catalogue est vide, l'assistant bascule le champ correspondant en
 * SAISIE LIBRE, ce qui le rend utilisable immédiatement — mais sans appliquer
 * automatiquement le moindre modificateur.
 *
 * Formats attendus :
 *
 *   typesGenetiques: {
 *     cle: {
 *       label: "clé de traduction ou libellé",
 *       description: "texte affiché sous le choix",
 *       modificateurs: { for: 1, con: -1 }   // appliqués à « Modif. type génétique »
 *     }
 *   }
 *
 *   formations / etudes: {
 *     cle: {
 *       label: "…",
 *       competences: { contact: 2, tir: 1 }  // maîtrises accordées d'office
 *     }
 *   }
 *
 *   originesGeographiques / originesSociales: {
 *     cle: { label: "…", description: "…" }
 *   }
 *
 * L'archétype n'est PAS une simple étiquette : c'est un lot qui abonde
 * plusieurs enveloppes à la fois, d'où sa forme plus riche.
 *
 *   archetypes: {
 *     cle: {
 *       label: "…",
 *       description: "…",
 *       typeGenetique: "clé dans typesGenetiques",  // imposé par l'archétype
 *       points: {                                   // s'ajoutent aux budgets
 *         attributs: 0,
 *         competences: 0,
 *         experiencePreliminaire: 0,
 *         avantages: 0,
 *         desavantages: 0
 *       },
 *       capacitesSpeciales: ["clé de compétence spéciale accordée d'office"]
 *     }
 *   }
 */
/**
 * Les huit archétypes.
 * Source : livre de base, transmis par l'auteur du système.
 *
 * Un archétype ne fait pas que nommer un concept : il PROPOSE une répartition
 * automatique des points de création. C'est un raccourci pour le joueur qui ne
 * veut pas répartir lui-même, pas une contrainte — la répartition reste
 * modifiable ensuite.
 *
 * ⚠️ À VÉRIFIER / À REMPLIR — `repartition` attend les niveaux visés par chaque
 * archétype, sous la forme `{ for: 12, con: 10, coo: 14, … }` (niveaux de base,
 * Chance exclue). Tant qu'elle vaut `null`, l'archétype est proposé mais ne
 * remplit rien, et l'assistant le dit.
 */
POLARIS.creation.archetypes = {
  defaut:          { label: "POLARIS.Archetype.defaut",          repartition: null },
  jeunePremier:    { label: "POLARIS.Archetype.jeunePremier",    repartition: null },
  jeuneHeritier:   { label: "POLARIS.Archetype.jeuneHeritier",   repartition: null },
  hybride:         { label: "POLARIS.Archetype.hybride",         repartition: null },
  phenomene:       { label: "POLARIS.Archetype.phenomene",       repartition: null },
  survivant:       { label: "POLARIS.Archetype.survivant",       repartition: null },
  veteran:         { label: "POLARIS.Archetype.veteran",         repartition: null },
  vieuxLoupDeMer:  { label: "POLARIS.Archetype.vieuxLoupDeMer",  repartition: null }
};

/**
 * Les quatre types génétiques.
 * Source : livre de base, transmis par l'auteur du système.
 *
 * Seul l'humain normal est gratuit. Les trois autres COÛTENT des points de
 * création, modifient les attributs et apportent des avantages et désavantages
 * qui leur sont propres : être autre chose qu'un humain se paie.
 *
 * ⚠️ À VÉRIFIER / À REMPLIR — `cout`, `modificateurs`, `avantages` et
 * `desavantages` attendent les données du livre. Un `cout` à `null` est compté
 * comme nul par l'assistant, qui signale que le chiffre manque.
 */
POLARIS.creation.typesGenetiques = {
  humainNormal: {
    label: "POLARIS.TypeGenetique.humainNormal.nom",
    // Le type par défaut, et le seul gratuit.
    cout: 0,
    modificateurs: {},
    competence: null,
    profondeurMax: null,
    conditions: [],
    description: "POLARIS.TypeGenetique.humainNormal.description"
  },

  hybrideNaturel: {
    label: "POLARIS.TypeGenetique.hybrideNaturel.nom",
    cout: 5,
    modificateurs: { for: 1, con: 2, coo: 2, ada: 1, int: -2 },
    // Seul type à posséder la compétence Hybride d'emblée à +3.
    competence: { cle: "hybride", maitriseDepart: 3, maitriseMax: null },
    // 1 000 m, plus 1 000 m par niveau global d'Hybride.
    profondeurMax: { base: 1000, parNiveau: 1000 },
    // Portée de la perception sous-marine, en mètres par point de Perception.
    perceptionSousMarine: 10,
    conditions: [],
    description: "POLARIS.TypeGenetique.hybrideNaturel.description"
  },

  genoHybride: {
    label: "POLARIS.TypeGenetique.genoHybride.nom",
    cout: 5,
    modificateurs: { for: 1, con: 1, coo: 2, pre: -2 },
    competence: { cle: "hybride", maitriseDepart: 0, maitriseMax: null },
    // 1 500 m, plus 750 m par niveau global d'Hybride.
    profondeurMax: { base: 1500, parNiveau: 750 },
    perceptionSousMarine: 5,
    conditions: ["POLARIS.TypeGenetique.genoHybride.condition"],
    description: "POLARIS.TypeGenetique.genoHybride.description"
  },

  technoHybride: {
    label: "POLARIS.TypeGenetique.technoHybride.nom",
    cout: 5,
    /**
     * ⚠️ Le livre annonce « 5 PC, 4 PC pour les déserteurs » : le coût dépend
     * d'un choix de fiction, pas d'une donnée. `coutAlternatif` porte le second
     * tarif ; l'assistant ne l'applique pas encore automatiquement.
     */
    coutAlternatif: { cout: 4, label: "POLARIS.TypeGenetique.technoHybride.deserteur" },
    // Présence -6, avec un plancher : elle ne peut pas descendre sous 3.
    modificateurs: { for: 2, con: 3, ada: -2, vol: 3, pre: -6 },
    minimums: { pre: 3 },
    competence: { cle: "hybride", maitriseDepart: 0, maitriseMax: null },
    // 3 000 m, plus 750 m par niveau global d'Hybride.
    profondeurMax: { base: 3000, parNiveau: 750 },
    perceptionSousMarine: 2,
    conditions: [
      "POLARIS.TypeGenetique.technoHybride.condition1",
      "POLARIS.TypeGenetique.technoHybride.condition2",
      "POLARIS.TypeGenetique.technoHybride.condition3"
    ],
    description: "POLARIS.TypeGenetique.technoHybride.description"
  }
};

/**
 * Plancher, avant tout hybride, sous lequel un hybride ne peut pas plonger tant
 * que son niveau global d'Hybride n'atteint pas 1.
 * Source : livre de base — « ne peut plonger à plus de 100 m tant qu'il n'a pas
 * développé son niveau global en compétence Hybride au niveau 1 ».
 */
POLARIS.profondeurSansHybride = 100;
/**
 * Origines et formations, remplies au démarrage depuis `data/origines.json`.
 * Ce sont des TABLEAUX d'entrées indexées, et non des tables clé/valeur : elles
 * se tirent au dé, donc leur ordre et leurs fourchettes comptent.
 */
POLARIS.creation.originesGeographiques = [];
POLARIS.creation.originesSociales = [];
POLARIS.creation.formations = [];

/** ⚠️ À VÉRIFIER / VIDE — les études supérieures attendent leurs données. */
POLARIS.creation.etudes = {};

/* -------------------------------------------- */
/*  Capacités spéciales : mutations et Polaris  */
/* -------------------------------------------- */

/**
 * Genres de mutation, et leur effet sur la bourse de points de création.
 * Source : livre de base, transmis par l'auteur du système.
 *
 * Une mutation désavantageuse ne coûte pas : elle RAPPORTE. C'est le seul
 * poste de la création qui puisse agrandir la bourse, et le moyen prévu pour
 * s'offrir un personnage plus doué en acceptant une tare.
 *
 * `signeCout` s'applique à un coût saisi en valeur absolue : +1 le décompte,
 * -1 le crédite, 0 l'annule.
 */
POLARIS.genresMutation = {
  avantageuse:    { label: "POLARIS.GenreMutation.avantageuse",    signeCout: 1 },
  neutre:         { label: "POLARIS.GenreMutation.neutre",         signeCout: 0 },
  desavantageuse: { label: "POLARIS.GenreMutation.desavantageuse", signeCout: -1 }
};

/**
 * Coût en points de création d'une mutation, signe compris.
 *
 * Une mutation AVANTAGEUSE OBTENUE AU HASARD est gratuite : la table du livre
 * marque sa colonne d'un astérisque, « seulement si la mutation est choisie par
 * le joueur ». La colonne des désavantages, elle, n'en porte pas — une tare
 * tirée au sort rapporte donc ses points comme si elle avait été choisie.
 * C'est ce qui rend le tirage attrayant : on gagne des avantages gratuits, mais
 * on ne décide pas lesquels.
 *
 * @param {string}  genre         Clé dans POLARIS.genresMutation.
 * @param {number}  cout          Coût saisi, en valeur absolue.
 * @param {boolean} [tireeAuSort] Vrai si la mutation vient d'un jet.
 * @returns {number}  Positif si la mutation se paie, négatif si elle rapporte.
 */
POLARIS.coutMutation = function (genre, cout, tireeAuSort = false) {
  const signe = POLARIS.genresMutation[genre]?.signeCout ?? 0;
  if (tireeAuSort && signe > 0) return 0;
  return signe * Math.abs(Number(cout) || 0);
};

/** Dé de la table des mutations. Source : livre de base — table au 1D100. */
POLARIS.deTableMutations = "1d100";

/**
 * Capacités que désigne un résultat sur la table des mutations.
 *
 * Plusieurs entrées partagent parfois une même fourchette : les six résistances
 * naturelles occupent toutes 76-80, départagées ensuite par un 1D6.
 *
 * @param {number} de100
 * @returns {object[]} Les capacités candidates, éventuellement plusieurs.
 */
POLARIS.candidatsMutation = function (de100) {
  return Object.values(POLARIS.creation.capacitesSpeciales).filter(
    (c) => c.tirage && de100 >= c.tirage[0] && de100 <= c.tirage[1]
  );
};

/**
 * Départage des candidats par le résultat de la table imbriquée.
 * @param {object[]} candidats
 * @param {number}   sousDe
 * @returns {object|null}  `null` quand la face ne désigne rien : le livre dit
 *                         alors « relancer ».
 */
POLARIS.departagerMutation = function (candidats, sousDe) {
  return candidats.find((c) => c.sousTirage === sousDe) ?? null;
};

/**
 * Catalogue des capacités spéciales — mutations, effet Polaris, compétences
 * spéciales achetables.
 *
 * Rempli au démarrage depuis `data/capacites-speciales.json`, pas écrit ici :
 * un catalogue destiné à grossir n'a rien à faire dans un fichier de logique,
 * et il doit rester modifiable sans toucher au code. La règle « aucun chiffre
 * hors de la config » vaut toujours — ce fichier de données EST de la config.
 *
 * Structure après chargement, indexée par `id` :
 *   { id, nom, type, genre, cout, description }
 */
POLARIS.creation.capacitesSpeciales = {};

/** Chemin du catalogue, relatif à la racine du système. */
POLARIS.CHEMIN_CAPACITES = `systems/${POLARIS.ID}/data/capacites-speciales.json`;

/** Types de capacité spéciale, qui décident de la section où elle s'affiche. */
POLARIS.typesCapacite = {
  mutation: "POLARIS.TypeCapacite.mutation",
  polaris: "POLARIS.TypeCapacite.polaris",
  competence: "POLARIS.TypeCapacite.competence"
};

/**
 * Valide et indexe les entrées brutes du catalogue.
 *
 * Le fichier étant rempli à la main, une entrée fautive est écartée avec un
 * avertissement plutôt que de faire tomber le système : une coquille ne doit
 * pas empêcher de jouer.
 *
 * @param {object} brut  Contenu du JSON.
 * @returns {{capacites: object, erreurs: string[]}}
 */
POLARIS.indexerCapacites = function (brut) {
  const capacites = {};
  const erreurs = [];

  for (const [rang, entree] of (brut?.capacites ?? []).entries()) {
    const ou = `entrée ${rang + 1}`;

    if (!entree?.id) { erreurs.push(`${ou} : « id » manquant`); continue; }
    if (!entree.nom) { erreurs.push(`${ou} (${entree.id}) : « nom » manquant`); continue; }
    if (capacites[entree.id]) { erreurs.push(`${ou} : « id » en double — ${entree.id}`); continue; }

    if (entree.genre && !POLARIS.genresMutation[entree.genre]) {
      erreurs.push(`${ou} (${entree.id}) : genre inconnu — ${entree.genre}`);
      continue;
    }
    if (entree.type && !POLARIS.typesCapacite[entree.type]) {
      erreurs.push(`${ou} (${entree.id}) : type inconnu — ${entree.type}`);
      continue;
    }

    // Compétence associée, facultative. Une entrée fautive ici n'invalide que
    // la compétence, pas la capacité : mieux vaut une mutation sans compétence
    // qu'une mutation absente.
    let competence = null;
    if (entree.competence) {
      const c = entree.competence;

      if (!c.cle) {
        erreurs.push(`${ou} (${entree.id}) : compétence sans « cle », ignorée`);
      } else if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(c.cle)) {
        // La clé sert de nom de champ de formulaire : une espace ou un accent
        // la casserait silencieusement.
        erreurs.push(`${ou} (${entree.id}) : clé de compétence invalide — ${c.cle}`);
      } else if (!Array.isArray(c.attributs) || c.attributs.length !== 2) {
        erreurs.push(`${ou} (${entree.id}) : la compétence attend deux attributs`);
      } else if (c.attributs.some((a) => !POLARIS.attributs[a])) {
        erreurs.push(`${ou} (${entree.id}) : attribut inconnu dans ${c.attributs.join("/")}`);
      } else {
        competence = {
          cle: c.cle,
          nom: c.nom ?? entree.nom,
          attributs: [...c.attributs],
          modificateur: Number(c.modificateur) || 0,
          // Niveau de maîtrise auquel la compétence DÉBUTE quand cette
          // capacité-ci la procure. Il appartient à la source et non à la
          // compétence : la compétence Hybride commence à -3 pour un Amphibie,
          // à +3 pour un hybride naturel et à 0 pour les deux autres hybrides.
          maitriseDepart: Number(c.maitriseDepart) || 0,
          maitriseMax: c.maitriseMax === undefined ? null : c.maitriseMax,
          categorie: POLARIS.categoriesCompetence[c.categorie] ? c.categorie : "physique",
          marqueurs: (c.marqueurs ?? []).filter((m) => POLARIS.marqueursCompetence[m]),
          // Certaines compétences spéciales se développent « à coût doublé ».
          coutDeveloppement: c.coutDeveloppement === "double" ? "double" : "normal"
        };
      }
    }

    capacites[entree.id] = {
      id: entree.id,
      nom: entree.nom,
      type: entree.type ?? "mutation",
      genre: entree.genre ?? "neutre",
      // Le genre porte le signe : un coût saisi négatif serait une double
      // négation, on ne retient donc que la valeur absolue.
      cout: Math.abs(Number(entree.cout) || 0),
      description: entree.description ?? "",
      // Fourchette de la table des mutations au 1D100. Conservée parce que
      // plusieurs mutations (Symbiote, Parasite) en font tirer d'autres au sort.
      tirage: Array.isArray(entree.tirage) && entree.tirage.length === 2 ? [...entree.tirage] : null,
      // Face de la table imbriquée qui désigne cette entrée, quand plusieurs
      // capacités partagent la même fourchette 1D100.
      sousTirage: Number.isInteger(entree.sousTirage) ? entree.sousTirage : null,
      deSousTirage: entree.deSousTirage ?? "1d6",
      competence
    };
  }

  return { capacites, erreurs };
};

/**
 * Déclare dans `POLARIS.competences` les compétences apportées par le catalogue.
 *
 * Ces compétences sont marquées `speciale` : elles existent dans le schéma de
 * tout personnage, mais n'apparaissent sur une fiche que si le personnage porte
 * la capacité qui y donne accès. C'est le mécanisme `acquise` déjà en place.
 *
 * À appeler UNE FOIS, au chargement du catalogue et avant que le premier
 * DataModel ne construise son schéma.
 *
 * @param {object} capacites  Catalogue indexé, tel que rendu par indexerCapacites.
 * @returns {string[]}        Les clés de compétence effectivement ajoutées.
 */
POLARIS.enregistrerCompetencesDeCapacites = function (capacites) {
  const ajoutees = [];

  for (const capacite of Object.values(capacites)) {
    const c = capacite.competence;
    if (!c) continue;

    // Une compétence déjà déclarée dans la config prime : le livre pourrait un
    // jour la lister nommément, et le catalogue ne doit pas l'écraser.
    if (POLARIS.competences[c.cle]) continue;

    POLARIS.competences[c.cle] = {
      label: c.nom,
      attributs: c.attributs,
      categorie: c.categorie,
      speciale: true,
      marqueurs: c.marqueurs,
      modificateur: c.modificateur,
      // Ni `maitriseDepart` ni `maitriseMax` ne sont recopiés ici : ils varient
      // d'une source à l'autre pour une même compétence, et se résolvent donc
      // sur le personnage, en fonction de ce qu'il porte réellement.
      capaciteId: capacite.id
    };
    ajoutees.push(c.cle);
  }

  return ajoutees;
};

/**
 * La capacité à manipuler l'effet Polaris, déclarée à la création.
 *
 * ⚠️ À VÉRIFIER — son coût en points de création n'est pas connu. À `null`, il
 * est compté pour zéro et l'assistant le signale.
 */
POLARIS.creation.effetPolaris = {
  label: "POLARIS.Creation.effetPolaris",
  cout: null
};

/* -------------------------------------------- */
/*  Résolution                                  */
/* -------------------------------------------- */

/**
 * Constantes de la mécanique de résolution, dite « en lecture directe » :
 *  - on lance 1d20 et on vise le résultat le plus haut SANS dépasser la cible ;
 *  - la marge de réussite est le résultat du dé lui-même ;
 *  - tomber pile sur la cible est une réussite critique ;
 *  - un 20 naturel est un échec critique, sauf si la cible atteint 20 ou plus,
 *    auquel cas ce 20 devient une réussite critique.
 */
POLARIS.resolution = {
  de: "1d20",
  faceMax: 20,
  /** Au-delà de ce seuil de chances, le 20 naturel cesse d'être un échec critique. */
  seuilImmuniteEchecCritique: 20
};

/** Types d'Items, pour les menus de création. */
POLARIS.typesItem = {
  arme: "POLARIS.TypeItem.arme",
  protection: "POLARIS.TypeItem.protection",
  equipement: "POLARIS.TypeItem.equipement",
  trait: "POLARIS.TypeItem.trait"
};

/**
 * Genres de trait, repris du cadre « AVANTAGES/DÉSAVANTAGES, MUTATIONS ET
 * POLARIS » de la feuille officielle.
 */
POLARIS.genresTrait = {
  avantage: "POLARIS.Genre.avantage",
  desavantage: "POLARIS.Genre.desavantage",
  mutation: "POLARIS.Genre.mutation",
  polaris: "POLARIS.Genre.polaris"
};
