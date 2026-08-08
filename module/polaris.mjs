import { POLARIS } from "./config.mjs";
import * as models from "./data/_module.mjs";
import { PolarisActor } from "./documents/actor.mjs";
import { PolarisItem } from "./documents/item.mjs";
import { PolarisActorSheet } from "./sheets/actor-sheet.mjs";
import { PolarisItemSheet } from "./sheets/item-sheet.mjs";
import { PolarisCreationWizard, ouvrirCreationPersonnage } from "./apps/creation-wizard.mjs";
import {
  evaluerJet,
  calculerChances,
  lancerCompetence,
  lancerLocalisation,
  lireLocalisation
} from "./dice/polaris-roll.mjs";

/* -------------------------------------------- */
/*  Initialisation                              */
/* -------------------------------------------- */

Hooks.once("init", function () {
  console.log("Polaris V3 | Initialisation du système");

  // API accessible depuis les macros et la console.
  game.polaris = {
    PolarisActor,
    PolarisItem,
    evaluerJet,
    calculerChances,
    lancerCompetence,
    lancerLocalisation,
    lireLocalisation,
    PolarisCreationWizard,
    creerPersonnage: ouvrirCreationPersonnage,
    config: POLARIS
  };

  CONFIG.POLARIS = POLARIS;

  // Documents et modèles de données.
  CONFIG.Actor.documentClass = PolarisActor;
  CONFIG.Actor.dataModels = {
    personnage: models.PolarisPersonnage,
    pnj: models.PolarisPnj
  };

  CONFIG.Item.documentClass = PolarisItem;
  CONFIG.Item.dataModels = {
    arme: models.PolarisArme,
    protection: models.PolarisProtection,
    equipement: models.PolarisEquipement,
    trait: models.PolarisTrait
  };

  // L'initiative n'est pas un jet : on démarre la piste à sa Réaction.
  // Source : feuille officielle — « INITIATIVE / Niveau de départ = Réaction ».
  CONFIG.Combat.initiative = { formula: `@${POLARIS.initiative.secondaireDeDepart}`, decimals: 0 };

  enregistrerFiches();
  enregistrerHelpers();

  return prechargerTemplates();
});

/* -------------------------------------------- */
/*  Réglages de monde                           */
/* -------------------------------------------- */

/**
 * L'ambiance est un réglage de monde et non de client : elle fixe la Chance de
 * tous les personnages, elle ne peut donc pas varier d'un joueur à l'autre.
 *
 * L'enregistrement a lieu sur `i18nInit` et NON sur `init` : les libellés des
 * choix sont composés ici même, en y insérant les chiffres de la config, et
 * `game.i18n` n'est pas encore chargé au moment du `init` — les intitulés y
 * resteraient à l'état de clés brutes. Foundry traduit bien `name` et `hint`
 * tout seul à l'affichage, mais pas le contenu de `choices`.
 */
Hooks.once("i18nInit", function () {
  game.settings.register(POLARIS.ID, POLARIS.REGLAGE_AMBIANCE, {
    name: "POLARIS.Reglage.ambiance.nom",
    hint: "POLARIS.Reglage.ambiance.aide",
    scope: "world",
    config: true,
    type: String,
    default: POLARIS.ambianceParDefaut,
    // Les chiffres viennent de la config, la phrase de la traduction : le
    // meneur voit ce que son choix implique sans avoir à ouvrir le livre.
    choices: Object.fromEntries(
      Object.entries(POLARIS.ambiances).map(([cle, def]) => [
        cle,
        game.i18n.format("POLARIS.Reglage.ambiance.choix", {
          ton: game.i18n.localize(def.label),
          chance: def.chance,
          points: def.pointsAttributs
        })
      ])
    )
  });
});

/* -------------------------------------------- */
/*  Enregistrement des fiches                   */
/* -------------------------------------------- */

/**
 * Remplace les fiches par défaut de Foundry par celles du système.
 *
 * En V13 les collections vivent sous `foundry.documents.collections` et les
 * anciennes fiches Application V1 sous `foundry.appv1`. On retombe sur les
 * globales si ces espaces de noms venaient à manquer.
 */
function enregistrerFiches() {
  const collections = foundry.documents?.collections ?? {};
  const Acteurs = collections.Actors ?? globalThis.Actors;
  const Objets = collections.Items ?? globalThis.Items;

  const FicheActeurV1 = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet;
  const FicheItemV1 = foundry.appv1?.sheets?.ItemSheet ?? globalThis.ItemSheet;

  if (FicheActeurV1) Acteurs.unregisterSheet("core", FicheActeurV1);
  Acteurs.registerSheet(POLARIS.ID, PolarisActorSheet, {
    types: ["personnage", "pnj"],
    makeDefault: true,
    label: "POLARIS.Fiche.acteur"
  });

  if (FicheItemV1) Objets.unregisterSheet("core", FicheItemV1);
  Objets.registerSheet(POLARIS.ID, PolarisItemSheet, {
    types: ["arme", "protection", "equipement", "trait"],
    makeDefault: true,
    label: "POLARIS.Fiche.item"
  });
}

/* -------------------------------------------- */
/*  Templates                                   */
/* -------------------------------------------- */

function prechargerTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    `${POLARIS.TEMPLATES}/actor/entete.hbs`,
    `${POLARIS.TEMPLATES}/actor/attributs.hbs`,
    `${POLARIS.TEMPLATES}/actor/competences.hbs`,
    `${POLARIS.TEMPLATES}/actor/sante.hbs`,
    `${POLARIS.TEMPLATES}/actor/equipement.hbs`,
    `${POLARIS.TEMPLATES}/actor/biographie.hbs`,
    `${POLARIS.TEMPLATES}/item/entete.hbs`,
    `${POLARIS.TEMPLATES}/item/details.hbs`,
    `${POLARIS.TEMPLATES}/shared/navigation.hbs`,
    `${POLARIS.TEMPLATES}/chat/jet-competence.hbs`,
    `${POLARIS.TEMPLATES}/chat/item.hbs`,
    `${POLARIS.TEMPLATES}/apps/roll-dialog.hbs`,

    // La coquille de l'assistant et un template par étape. Les étapes sont
    // rendues par partiel dynamique : elles DOIVENT être préchargées ici, sans
    // quoi Handlebars ne connaîtra pas leur nom au moment du rendu.
    `${POLARIS.TEMPLATES}/apps/creation/wizard.hbs`,
    ...POLARIS.creation.etapes.map((etape) => `${POLARIS.TEMPLATES}/apps/creation/${etape.cle}.hbs`)
  ]);
}

/* -------------------------------------------- */
/*  Helpers Handlebars                          */
/* -------------------------------------------- */

function enregistrerHelpers() {
  /** Affiche un nombre signé : 3 devient « +3 », -2 reste « -2 », 0 devient « ±0 ». */
  Handlebars.registerHelper("polarisSigne", (valeur) => {
    const n = Number(valeur) || 0;
    if (n > 0) return `+${n}`;
    if (n < 0) return String(n);
    return "±0";
  });

  /** Concatène des chaînes, utile pour bâtir un chemin de champ de formulaire. */
  Handlebars.registerHelper("polarisConcat", (...args) => {
    args.pop(); // le dernier argument est l'objet d'options Handlebars
    return args.join("");
  });

  /**
   * Série d'entiers de 1 à n, pour dessiner les cases de blessure : la grille de
   * santé compte un nombre de cases différent par gravité et par localisation.
   */
  Handlebars.registerHelper("polarisSerie", (n) => {
    const total = Math.max(0, Number(n) || 0);
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  /** Vrai si a est inférieur ou égal à b — sert à cocher les n premières cases. */
  Handlebars.registerHelper("polarisJusqua", (a, b) => Number(a) <= Number(b));

  // Foundry fournit `eq` et `not` depuis la V12, mais on ne les écrase pas et on
  // les ajoute seulement s'ils manquent, pour rester robuste aux versions.
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }
  if (!Handlebars.helpers.not) {
    Handlebars.registerHelper("not", (valeur) => !valeur);
  }
}

/* -------------------------------------------- */
/*  Prêt                                        */
/* -------------------------------------------- */

/* -------------------------------------------- */
/*  Accès à l'assistant de création             */
/* -------------------------------------------- */

/**
 * Ajoute un bouton « Créer un personnage » en tête de l'onglet Acteurs.
 *
 * Le hook reçoit un HTMLElement en V13 mais un objet jQuery dans les versions
 * antérieures : on ramène les deux au même dénominateur pour rester robuste.
 */
Hooks.on("renderActorDirectory", (app, element) => {
  const racine = element instanceof HTMLElement ? element : element?.[0];
  if (!racine || !game.user.can("ACTOR_CREATE")) return;

  // Le rendu de la barre latérale se rejoue souvent : sans cette garde, les
  // boutons s'empileraient.
  if (racine.querySelector("[data-polaris-creation]")) return;

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.dataset.polarisCreation = "";
  bouton.classList.add("polaris-bouton-creation");
  bouton.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${game.i18n.localize(
    "POLARIS.Creation.bouton"
  )}`;
  bouton.addEventListener("click", () => ouvrirCreationPersonnage());

  const entete = racine.querySelector(".header-actions") ?? racine.querySelector(".directory-header");
  entete?.prepend(bouton);
});

Hooks.once("ready", function () {
  if (!POLARIS.tableAptitudeNaturelle) {
    console.warn(
      "Polaris V3 | La table des Aptitudes naturelles n'est pas renseignée : " +
        "la formule provisoire (niveau actuel / 2) est utilisée. Voir module/config.mjs."
    );
  }
});
