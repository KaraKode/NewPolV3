import { POLARIS } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Assistant de création de personnage joueur.
 *
 * Le déroulé n'est écrit nulle part dans cette classe : les étapes viennent de
 * `POLARIS.creation.etapes`, et chacune se rend avec le template
 * `templates/apps/creation/<cle>.hbs`. Ajouter, retirer ou réordonner une étape
 * est une édition de config.
 *
 * Rien n'est écrit dans le monde tant que la dernière étape n'est pas validée :
 * l'acteur et ses traits sont construits d'un seul coup à la fin, ce qui évite
 * de laisser des personnages à moitié créés si l'assistant est fermé en route.
 */
export class PolarisCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    // `tag: "form"` fait de l'élément racine le formulaire lui-même : la
    // relecture des champs se fait alors sur `this.element`, sans sélecteur.
    tag: "form",
    id: "polaris-creation-wizard",
    classes: ["polaris", "polaris-creation"],
    position: { width: 820, height: 800 },
    window: {
      title: "POLARIS.Creation.titre",
      icon: "fa-solid fa-user-plus",
      resizable: true,
      contentClasses: ["polaris-contenu"]
    },
    // Aucune soumission automatique : la navigation relit le formulaire elle-même.
    form: { submitOnChange: false, closeOnSubmit: false },
    actions: {
      etapePrecedente: this.#surEtapePrecedente,
      etapeSuivante: this.#surEtapeSuivante,
      allerEtape: this.#surAllerEtape,
      ajusterAttribut: this.#surAjusterAttribut,
      ajouterLigne: this.#surAjouterLigne,
      ajouterDepuisCatalogue: this.#surAjouterDepuisCatalogue,
      tirerMutation: this.#surTirerMutation,
      tirerAge: this.#surTirerAge,
      choisirMethodeAge: this.#surChoisirMethodeAge,
      tirerOrigine: this.#surTirerOrigine,
      retirerLigne: this.#surRetirerLigne,
      creerPersonnage: this.#surCreerPersonnage
    }
  };

  static PARTS = {
    corps: {
      template: `${POLARIS.TEMPLATES}/apps/creation/wizard.hbs`,
      scrollable: [".polaris-creation-corps"]
    }
  };

  /* -------------------------------------------- */

  constructor(options = {}) {
    super(options);
    this.etapeCourante = 0;
    this.donnees = this.#donneesVierges(options.donneesInitiales);
    /** Messages de validation, remplis à chaque tentative de progression. */
    this.erreurs = [];
  }

  /**
   * Squelette de personnage, généré depuis la config pour rester d'aplomb avec
   * les attributs et compétences déclarés.
   *
   * Les huit attributs répartissables démarrent au niveau de départ du livre ;
   * la Chance, qui ne s'achète pas, prend d'emblée la valeur de l'ambiance.
   */
  #donneesVierges(initiales = {}) {
    const { niveauDepart, repartissables } = POLARIS.creation.attributs;

    const attributs = {};
    for (const cle of Object.keys(POLARIS.attributs)) {
      attributs[cle] = {
        base: repartissables.includes(cle) ? niveauDepart : POLARIS.chanceDeLAmbiance(),
        modifType: 0
      };
    }

    const competences = {};
    for (const cle of POLARIS.competencesSpeciales()) competences[cle] = 0;

    return foundry.utils.mergeObject(
      {
        name: "",
        archetype: "",
        typeGenetique: "",
        attributs,
        competences,
        /** Le personnage sait-il manipuler l'effet Polaris ? */
        manipuleEffetPolaris: false,

        // Expérience préliminaire : l'âge de départ commande tout le reste de
        // l'étape, puisque les années d'apprentissage s'en déduisent.
        methodeAge: POLARIS.creation.age.methodeParDefaut,
        ageDepart: POLARIS.creation.age.methodes.fixe.age,
        origineGeographique: "",
        origineSociale: "",
        formationBase: "",
        // Listes libres : le livre n'ayant pas encore été transcrit, chaque
        // ligne est saisie à la main plutôt que choisie dans un catalogue.
        mutations: [],
        metiers: [],
        avantages: [],
        desavantages: []
      },
      initiales,
      { inplace: false }
    );
  }

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const etapes = POLARIS.creation.etapes;

    context.config = POLARIS;
    context.donnees = this.donnees;
    context.erreurs = this.erreurs;
    context.ambiance = POLARIS.reglagesAmbiance();
    context.nomAmbiance = game.i18n.localize(context.ambiance.label);

    context.etapes = etapes.map((etape, index) => ({
      ...etape,
      index,
      numero: index + 1,
      active: index === this.etapeCourante,
      // Une étape franchie reste cliquable : on doit pouvoir revenir corriger.
      franchie: index < this.etapeCourante
    }));

    context.etape = context.etapes[this.etapeCourante];
    context.premiereEtape = this.etapeCourante === 0;
    context.derniereEtape = this.etapeCourante === etapes.length - 1;
    context.templateEtape = `${POLARIS.TEMPLATES}/apps/creation/${context.etape.cle}.hbs`;

    context.typesGenetiques = POLARIS.creation.typesGenetiques;
    context.catalogueTypesVide = foundry.utils.isEmpty(POLARIS.creation.typesGenetiques);
    context.typeChoisi = POLARIS.creation.typesGenetiques[this.donnees.typeGenetique] ?? null;
    // Un coût à `null` n'est pas un coût nul : c'est un chiffre qui manque.
    context.coutTypeInconnu = Boolean(context.typeChoisi) && context.typeChoisi.cout === null;

    context.archetypes = POLARIS.creation.archetypes;
    context.archetypeChoisi = POLARIS.creation.archetypes[this.donnees.archetype] ?? null;
    context.repartitionManquante =
      Boolean(context.archetypeChoisi) && !context.archetypeChoisi.repartition;

    // Expérience préliminaire : tout découle de l'âge de départ.
    context.age = POLARIS.creation.age;
    context.anneesApprentissage = POLARIS.creation.anneesApprentissage(this.donnees.ageDepart);
    context.peutExercerUnMetier = POLARIS.creation.peutExercerUnMetier(this.donnees.ageDepart);
    context.ageParTirage = this.donnees.methodeAge === "tirage";
    context.sectionsOrigine = [
      {
        cle: "geographiques",
        champ: "origineGeographique",
        label: "POLARIS.Champ.origineGeographique",
        entrees: POLARIS.creation.originesGeographiques,
        de: POLARIS.creation.desOrigines.geographiques,
        choisie: this.#origineChoisie("originesGeographiques", this.donnees.origineGeographique)
      },
      {
        cle: "sociales",
        champ: "origineSociale",
        label: "POLARIS.Champ.origineSociale",
        entrees: POLARIS.creation.originesSociales,
        de: POLARIS.creation.desOrigines.sociales,
        choisie: this.#origineChoisie("originesSociales", this.donnees.origineSociale)
      },
      {
        cle: "formations",
        champ: "formationBase",
        label: "POLARIS.Champ.formationBase",
        entrees: POLARIS.creation.formations,
        de: POLARIS.creation.desOrigines.formations,
        choisie: this.#origineChoisie("formations", this.donnees.formationBase)
      }
    ];

    context.attributs = this.#detailAttributs();
    context.mutations = this.#detailMutations();
    context.genresMutation = POLARIS.genresMutation;
    context.catalogue = POLARIS.creation.capacitesSpeciales;
    context.catalogueMutationsVide = foundry.utils.isEmpty(POLARIS.creation.capacitesSpeciales);
    context.effetPolaris = POLARIS.creation.effetPolaris;
    context.coutPolarisInconnu = POLARIS.creation.effetPolaris.cout === null;
    context.budgets = this.#budgets();

    return context;
  }

  /* -------------------------------------------- */
  /*  Calculs                                     */
  /* -------------------------------------------- */

  /**
   * Détail par attribut : niveau, coût déjà consenti, coût du prochain niveau,
   * et valeurs dérivées. Le coût marginal est affiché pour que le joueur voie
   * le barème se durcir avant de dépenser, pas après.
   */
  #detailAttributs() {
    const { niveauDepart, repartissables, niveauMax } = POLARIS.creation.attributs;
    const cout = POLARIS.creation.coutAttribut;

    return Object.keys(POLARIS.attributs).map((cle) => {
      const composantes = this.donnees.attributs[cle];
      const base = Number(composantes.base) || 0;
      const modifType = Number(composantes.modifType) || 0;
      const actuel = base + modifType;
      const echelon = POLARIS.descriptionAttribut(actuel);

      return {
        cle,
        label: game.i18n.localize(POLARIS.attributs[cle].label),
        abbr: game.i18n.localize(POLARIS.attributs[cle].abbr),
        base,
        modifType,
        actuel,
        aptitude: POLARIS.aptitudeNaturelle(actuel),
        qualite: echelon ? game.i18n.localize(echelon) : "",
        repartissable: repartissables.includes(cle),
        coutConsenti: cout(base),
        // Ce que coûterait le niveau suivant, et ce que rendrait le précédent.
        coutProchain: cout(base + 1) - cout(base),
        peutMonter: base < niveauMax,
        peutDescendre: base > niveauDepart
      };
    });
  }

  /**
   * Mutations saisies, avec leur effet réel sur la bourse.
   *
   * `effet` porte le signe : une mutation désavantageuse rend un nombre
   * négatif, puisqu'elle rapporte des points au lieu d'en coûter.
   */
  #detailMutations() {
    return (this.donnees.mutations ?? []).map((mutation, index) => {
      const signe = POLARIS.genresMutation[mutation.genre]?.signeCout ?? 0;
      const gratuiteParTirage = Boolean(mutation.tireeAuSort) && signe > 0;

      return {
        index,
        ...mutation,
        genre: mutation.genre ?? "neutre",
        effet: POLARIS.coutMutation(mutation.genre, mutation.cout, mutation.tireeAuSort),
        gratuiteParTirage,
        // Le neutre est gratuit par définition, et un avantage tiré au sort
        // aussi : dans les deux cas le coût n'a plus à être saisi.
        coutSaisissable: signe !== 0 && !gratuiteParTirage
      };
    });
  }

  /**
   * Les enveloppes de points.
   *
   * Les points de création forment une seule bourse : les attributs et le type
   * génétique y puisent tous les deux. Choisir un géno-hybride, c'est donc
   * accepter d'avoir moins de points pour ses attributs — d'où le détail
   * affiché plutôt qu'un total opaque.
   *
   * Seule cette bourse a un plafond connu, hérité de l'ambiance. Les autres
   * restent ouvertes : on compte la dépense sans jamais l'interdire, faute de
   * connaître les budgets du livre.
   */
  #budgets() {
    const somme = (lignes) => lignes.reduce((total, l) => total + (Number(l.cout) || 0), 0);

    const construire = (budget, depense) => ({
      budget,
      depense,
      restant: budget === null ? null : budget - depense,
      illimite: budget === null,
      depasse: budget !== null && depense > budget
    });

    const depenseAttributs = this.#detailAttributs()
      .filter((a) => a.repartissable)
      .reduce((total, a) => total + a.coutConsenti, 0);

    // Un coût inconnu est compté pour zéro : mieux vaut un total optimiste et
    // signalé qu'un blocage arbitraire.
    const coutType = POLARIS.creation.typesGenetiques[this.donnees.typeGenetique]?.cout ?? 0;

    // Les mutations peuvent CRÉDITER la bourse : une mutation désavantageuse
    // rapporte des points, et ce total est donc légitimement négatif.
    const coutMutations = (this.donnees.mutations ?? []).reduce(
      (total, m) => total + POLARIS.coutMutation(m.genre, m.cout, m.tireeAuSort),
      0
    );

    const coutPolaris = this.donnees.manipuleEffetPolaris
      ? POLARIS.creation.effetPolaris.cout ?? 0
      : 0;

    return {
      pointsCreation: {
        ...construire(
          POLARIS.creation.pointsAttributs(),
          depenseAttributs + coutType + coutMutations + coutPolaris
        ),
        detailAttributs: depenseAttributs,
        detailType: coutType,
        detailMutations: coutMutations,
        detailPolaris: coutPolaris
      },
      experiencePreliminaire: construire(
        POLARIS.creation.points.experiencePreliminaire,
        somme(this.donnees.metiers)
      ),
      avantages: construire(POLARIS.creation.points.avantages, somme(this.donnees.avantages)),
      desavantages: construire(POLARIS.creation.points.desavantages, somme(this.donnees.desavantages))
    };
  }

  /* -------------------------------------------- */
  /*  Formulaire                                  */
  /* -------------------------------------------- */

  /**
   * Recopie l'état du formulaire dans `this.donnees`.
   *
   * Appelé avant toute navigation : c'est ce qui permet de revenir en arrière
   * sans rien perdre de ce qui vient d'être saisi.
   */
  #lireFormulaire() {
    if (!this.element) return;
    const brut = new foundry.applications.ux.FormDataExtended(this.element).object;
    const etendu = foundry.utils.expandObject(brut);

    // Les listes libres arrivent en objets indexés ({0: …, 1: …}) : on les
    // remet à plat en tableaux, sans quoi les ajouts se mélangeraient.
    for (const liste of ["mutations", "metiers", "avantages", "desavantages"]) {
      if (etendu[liste]) etendu[liste] = Object.values(etendu[liste]);
    }

    foundry.utils.mergeObject(this.donnees, etendu);
  }

  /**
   * Applique la répartition proposée par l'archétype choisi.
   *
   * C'est une PROPOSITION : les niveaux restent ajustables ensuite. On n'écrase
   * donc que sur changement explicite d'archétype, jamais à chaque rendu, sans
   * quoi le joueur ne pourrait plus rien retoucher.
   */
  #appliquerArchetype() {
    const repartition = POLARIS.creation.archetypes[this.donnees.archetype]?.repartition;
    if (!repartition) return;

    for (const cle of POLARIS.creation.attributs.repartissables) {
      if (repartition[cle] === undefined) continue;
      this.donnees.attributs[cle].base = repartition[cle];
    }
  }

  /**
   * Reporte sur les attributs les modificateurs du type génétique choisi.
   * Sans catalogue, le joueur les saisit à la main et rien n'est écrasé.
   */
  #appliquerTypeGenetique() {
    const catalogue = POLARIS.creation.typesGenetiques;
    if (foundry.utils.isEmpty(catalogue)) return;

    const choisi = catalogue[this.donnees.typeGenetique];

    for (const cle of Object.keys(this.donnees.attributs)) {
      const modificateur = choisi?.modificateurs?.[cle] ?? 0;
      this.donnees.attributs[cle].modifType = modificateur;

      // Certains types imposent un plancher : la Présence d'un techno-hybride
      // encaisse -6 mais ne peut pas descendre sous 3.
      const plancher = choisi?.minimums?.[cle];
      if (plancher === undefined) continue;

      const actuel = (Number(this.donnees.attributs[cle].base) || 0) + modificateur;
      if (actuel < plancher) {
        this.donnees.attributs[cle].modifType = plancher - (Number(this.donnees.attributs[cle].base) || 0);
      }
    }

  }

  /**
   * Retrouve l'origine retenue dans une section, par son identifiant.
   * @param {string} section  Nom de la liste dans POLARIS.creation.
   * @param {string} id
   * @returns {object|null}
   */
  #origineChoisie(section, id) {
    return (POLARIS.creation[section] ?? []).find((o) => o.id === id) ?? null;
  }

  /**
   * Niveaux de maîtrise auxquels débutent les compétences spéciales acquises.
   *
   * Une même compétence peut être procurée par plusieurs sources à des niveaux
   * différents — Hybride débute à -3 par la mutation Amphibie et à +3 par le
   * type hybride naturel. On retient le plus élevé : cumuler deux origines ne
   * doit jamais desservir le personnage.
   *
   * Ces niveaux ne valent qu'à la création. Une fois le personnage créé, la
   * maîtrise vit sur la fiche et progresse normalement.
   *
   * @returns {Record<string, number>}
   */
  #niveauxDeDepart() {
    const niveaux = {};

    const retenir = (competence) => {
      if (!competence?.cle) return;
      const depart = competence.maitriseDepart ?? 0;
      niveaux[competence.cle] = Math.max(niveaux[competence.cle] ?? -Infinity, depart);
    };

    for (const mutation of this.donnees.mutations ?? []) {
      retenir(POLARIS.creation.capacitesSpeciales[mutation.capaciteId]?.competence);
    }
    retenir(POLARIS.creation.typesGenetiques[this.donnees.typeGenetique]?.competence);

    return niveaux;
  }

  /* -------------------------------------------- */
  /*  Validation                                  */
  /* -------------------------------------------- */

  /**
   * Contrôle l'étape courante.
   *
   * On ne valide que ce dont on est sûr : un nom est indispensable pour créer
   * un acteur, et un budget connu ne doit pas être dépassé. Bloquer sur le
   * reste rendrait l'assistant inutilisable tant que le livre n'est pas saisi.
   *
   * @returns {string[]} Les messages à afficher, vide si l'étape est valide.
   */
  #validerEtape() {
    const cle = POLARIS.creation.etapes[this.etapeCourante]?.cle;
    const budgets = this.#budgets();
    const erreurs = [];

    if (!this.donnees.name?.trim()) {
      erreurs.push(game.i18n.localize("POLARIS.Creation.Erreur.nomRequis"));
    }

    // Chaque étape ne surveille que son enveloppe. Les trois premières partagent
    // la bourse de points de création : attributs, type génétique et mutations
    // y puisent tous — et les mutations désavantageuses la regarnissent.
    const enveloppes = {
      capacitesBase: ["pointsCreation"],
      typeGenetique: ["pointsCreation"],
      capacitesSpeciales: ["pointsCreation"],
      experiencePreliminaire: ["experiencePreliminaire"],
      avantages: ["avantages", "desavantages"]
    };

    // Un métier ne s'exerce qu'à partir de 16 ans : un personnage plus jeune
    // n'a pas pu en tenir un, si séduisant soit-il sur le papier.
    if (cle === "experiencePreliminaire" && !POLARIS.creation.peutExercerUnMetier(this.donnees.ageDepart)) {
      const metiers = (this.donnees.metiers ?? []).filter((m) => m.nom?.trim());
      if (metiers.length) {
        erreurs.push(
          game.i18n.format("POLARIS.Creation.Erreur.metierTropJeune", {
            age: this.donnees.ageDepart,
            minimum: POLARIS.creation.age.ageMinimumMetier
          })
        );
      }
    }

    for (const nom of enveloppes[cle] ?? []) {
      const budget = budgets[nom];
      if (!budget?.depasse) continue;

      erreurs.push(
        game.i18n.format("POLARIS.Creation.Erreur.budgetDepasse", {
          depense: budget.depense,
          budget: budget.budget
        })
      );
    }

    return erreurs;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #surEtapePrecedente() {
    this.#lireFormulaire();
    this.erreurs = [];
    // On recule sans valider : corriger une étape ne doit jamais être entravé.
    this.etapeCourante = Math.max(0, this.etapeCourante - 1);
    this.render();
  }

  static #surEtapeSuivante() {
    this.#lireFormulaire();
    this.#appliquerTypeGenetique();
    this.erreurs = this.#validerEtape();
    if (this.erreurs.length) return this.render();

    this.etapeCourante = Math.min(POLARIS.creation.etapes.length - 1, this.etapeCourante + 1);
    this.render();
  }

  /** Saut direct par la barre de progression, vers une étape déjà franchie. */
  static #surAllerEtape(event, cible) {
    const index = Number(cible.dataset.index);
    if (!Number.isInteger(index) || index > this.etapeCourante) return;

    this.#lireFormulaire();
    this.erreurs = [];
    this.etapeCourante = index;
    this.render();
  }

  /**
   * Monte ou descend un attribut d'un niveau.
   *
   * Passer par des boutons plutôt que par un champ libre garantit que le coût
   * progressif est toujours honoré : on ne peut pas sauter une tranche.
   */
  static #surAjusterAttribut(event, cible) {
    this.#lireFormulaire();

    const { attribut, sens } = cible.dataset;
    const { niveauDepart, niveauMax, repartissables } = POLARIS.creation.attributs;
    if (!repartissables.includes(attribut)) return;

    const actuel = Number(this.donnees.attributs[attribut].base) || 0;
    const vise = actuel + (sens === "monter" ? 1 : -1);

    if (vise < niveauDepart || vise > niveauMax) return;

    this.donnees.attributs[attribut].base = vise;
    this.erreurs = [];
    this.render();
  }

  /** Ajoute une ligne vierge à une liste libre (mutation, métier, avantage…). */
  static #surAjouterLigne(event, cible) {
    this.#lireFormulaire();
    const liste = cible.dataset.liste;

    const ligne = { nom: "", cout: 0, description: "" };
    // Une mutation naît neutre : le genre est un choix, et le neutre est le
    // seul qui ne déplace pas la bourse tant qu'il n'est pas tranché.
    if (liste === "mutations") ligne.genre = "neutre";

    this.donnees[liste] = [...(this.donnees[liste] ?? []), ligne];
    this.render();
  }

  /**
   * Ajoute une capacité tirée du catalogue.
   *
   * La ligne créée reste modifiable comme les autres : le catalogue préremplit,
   * il ne verrouille pas. C'est ce qui permet à une table d'adapter une entrée
   * du livre sans avoir à toucher au fichier JSON.
   */
  static #surAjouterDepuisCatalogue(event, cible) {
    this.#lireFormulaire();

    const capacite = POLARIS.creation.capacitesSpeciales[cible.dataset.capacite];
    if (!capacite) return;

    this.donnees.mutations = [
      ...(this.donnees.mutations ?? []),
      {
        // L'identifiant voyage avec la ligne : c'est lui qui, une fois posé sur
        // le trait, débloquera la compétence associée sur la fiche.
        capaciteId: capacite.id,
        nom: capacite.nom,
        genre: capacite.genre,
        cout: capacite.cout,
        description: capacite.description
      }
    ];
    this.render();
  }

  /**
   * Tire une mutation au hasard sur la table du livre.
   *
   * Un 1D100 désigne une ligne. Quand plusieurs capacités partagent cette ligne
   * — les six résistances naturelles occupent 76-80 —, un second dé les
   * départage, et une face qui ne désigne rien se relance, comme le prévoit le
   * livre. La relance est bornée : une table mal saisie ne doit pas figer
   * l'interface.
   *
   * La mutation obtenue est marquée « tirée au sort », ce qui la rend gratuite
   * si elle est avantageuse.
   */
  static async #surTirerMutation() {
    this.#lireFormulaire();

    if (foundry.utils.isEmpty(POLARIS.creation.capacitesSpeciales)) {
      return ui.notifications.warn(game.i18n.localize("POLARIS.Creation.Avertissement.tableVide"));
    }

    const jets = [];
    let capacite = null;

    for (let essai = 0; essai < 10 && !capacite; essai++) {
      const de100 = new Roll(POLARIS.deTableMutations);
      await de100.evaluate();
      jets.push(de100);

      const candidats = POLARIS.candidatsMutation(de100.total);
      if (!candidats.length) continue;
      if (candidats.length === 1) { capacite = candidats[0]; break; }

      // Table imbriquée : on relance le sous-dé tant qu'il tombe sur une face
      // vide, sans repasser par le 1D100.
      const formule = candidats[0].deSousTirage ?? "1d6";
      for (let sousEssai = 0; sousEssai < 10 && !capacite; sousEssai++) {
        const sousDe = new Roll(formule);
        await sousDe.evaluate();
        jets.push(sousDe);
        capacite = POLARIS.departagerMutation(candidats, sousDe.total);
      }
    }

    if (!capacite) {
      return ui.notifications.warn(game.i18n.localize("POLARIS.Creation.Avertissement.tirageInfructueux"));
    }

    this.donnees.mutations = [
      ...(this.donnees.mutations ?? []),
      {
        capaciteId: capacite.id,
        nom: capacite.nom,
        genre: capacite.genre,
        cout: capacite.cout,
        description: capacite.description,
        tireeAuSort: true
      }
    ];

    // Les dés partent en chat : le tirage doit être vérifiable par la table.
    await ChatMessage.create({
      content: `<p>${game.i18n.format("POLARIS.Creation.Message.mutationTiree", {
        resultats: jets.map((r) => r.total).join(" puis "),
        nom: capacite.nom
      })}</p>`,
      rolls: jets,
      sound: CONFIG.sounds.dice
    });

    this.render();
  }

  /**
   * Bascule entre âge fixe et âge tiré.
   *
   * Revenir à la méthode fixe repose l'âge sûr : sans cela, un joueur déçu de
   * son tirage garderait son résultat en changeant simplement de méthode.
   */
  static #surChoisirMethodeAge(event, cible) {
    this.#lireFormulaire();

    const methode = cible.dataset.methode;
    if (!POLARIS.creation.age.methodes[methode]) return;

    this.donnees.methodeAge = methode;
    if (methode === "fixe") this.donnees.ageDepart = POLARIS.creation.age.methodes.fixe.age;

    this.erreurs = [];
    this.render();
  }

  /**
   * Tire l'âge de départ : 14 + 1D4.
   *
   * Un seul jet, sans reprise — c'est le prix du pari. Le résultat part en chat
   * pour que la table en soit témoin.
   */
  static async #surTirerAge() {
    this.#lireFormulaire();

    const { base, de } = POLARIS.creation.age.methodes.tirage;
    const jet = new Roll(de);
    await jet.evaluate();

    this.donnees.methodeAge = "tirage";
    this.donnees.ageDepart = base + jet.total;

    await ChatMessage.create({
      content: `<p>${game.i18n.format("POLARIS.Creation.Message.ageTire", {
        base,
        de: jet.total,
        age: this.donnees.ageDepart
      })}</p>`,
      rolls: [jet],
      sound: CONFIG.sounds.dice
    });

    this.erreurs = [];
    this.render();
  }

  /**
   * Tire une origine au sort dans sa section.
   *
   * Les fourchettes ne sont pas équiprobables : une petite station occupe 2-7
   * du 1D10, une grande cité le seul 10. Le tirage reflète donc la démographie
   * du monde, ce qu'un choix libre ne fait pas.
   */
  static async #surTirerOrigine(event, cible) {
    this.#lireFormulaire();

    const { section, champ } = cible.dataset;
    const de = POLARIS.creation.desOrigines[section];
    if (!de) return ui.notifications.warn(game.i18n.localize("POLARIS.Creation.Avertissement.sectionSansDe"));

    const jet = new Roll(de);
    await jet.evaluate();

    const origine = POLARIS.origineTiree(section, jet.total);
    if (!origine) {
      return ui.notifications.warn(game.i18n.localize("POLARIS.Creation.Avertissement.tirageInfructueux"));
    }

    this.donnees[champ] = origine.id;

    await ChatMessage.create({
      content: `<p>${game.i18n.format("POLARIS.Creation.Message.origineTiree", {
        de: jet.total,
        nom: origine.nom
      })}</p>`,
      rolls: [jet],
      sound: CONFIG.sounds.dice
    });

    this.erreurs = [];
    this.render();
  }

  static #surRetirerLigne(event, cible) {
    this.#lireFormulaire();
    const { liste, index } = cible.dataset;

    this.donnees[liste] = (this.donnees[liste] ?? []).filter((_, i) => i !== Number(index));
    this.render();
  }

  static async #surCreerPersonnage() {
    this.#lireFormulaire();
    this.#appliquerTypeGenetique();
    this.erreurs = this.#validerEtape();
    if (this.erreurs.length) return this.render();

    const acteur = await Actor.create(this.#construireActeur());
    if (!acteur) return;

    const traits = this.#construireTraits();
    if (traits.length) await acteur.createEmbeddedDocuments("Item", traits);

    await this.close();
    acteur.sheet.render(true);
    ui.notifications.info(game.i18n.format("POLARIS.Creation.Message.cree", { nom: acteur.name }));
  }

  /* -------------------------------------------- */
  /*  Construction du personnage                  */
  /* -------------------------------------------- */

  /** Traduit l'état de l'assistant en données d'acteur. */
  #construireActeur() {
    // Les compétences spéciales débutent au niveau que leur source impose ;
    // les génériques partent de ce qui a été saisi.
    const departs = this.#niveauxDeDepart();

    const competences = {};
    for (const cle of Object.keys(POLARIS.competences)) {
      const speciale = Boolean(POLARIS.competences[cle].speciale);
      const saisie = Number(this.donnees.competences[cle]) || 0;

      // Une spéciale démarre au niveau que sa source impose ; à défaut, et pour
      // toutes les génériques, on retient ce qui a été saisi.
      // (`??` et `||` ne se mélangent pas sans parenthèses : d'où la variable.)
      const maitrise = speciale ? departs[cle] ?? saisie : saisie;

      competences[cle] = {
        maitrise,
        // `acquise` est de toute façon recalculé sur la fiche à partir des
        // traits portés et du type génétique ; on pose ici une valeur cohérente
        // pour que l'acteur soit correct dès l'instant de sa création.
        acquise: speciale ? departs[cle] !== undefined : true
      };
    }

    const attributs = {};
    for (const [cle, composantes] of Object.entries(this.donnees.attributs)) {
      attributs[cle] = {
        base: Number(composantes.base) || 0,
        modifType: Number(composantes.modifType) || 0,
        // Les points de création alimentent le niveau de base dans cet
        // assistant ; la ligne dédiée de la feuille reste libre pour la suite
        // de la carrière du personnage.
        modifCreation: 0
      };
    }

    // On stocke les libellés et non les clés : la fiche affiche du texte libre,
    // et un personnage doit rester lisible même si le catalogue évolue.
    const libelle = (catalogue, choix) => {
      const entree = POLARIS.creation[catalogue]?.[choix];
      return entree ? game.i18n.localize(entree.label) : choix ?? "";
    };

    // Les origines sont des tableaux d'entrées déjà nommées, pas des tables de
    // clés de traduction : elles se résolvent autrement.
    const nomOrigine = (section, id) => this.#origineChoisie(section, id)?.nom ?? id ?? "";

    return {
      name: this.donnees.name.trim(),
      type: "personnage",
      system: {
        attributs,
        competences,
        identite: {
          age: Number(this.donnees.ageDepart) || null,
          origineGeographique: nomOrigine("originesGeographiques", this.donnees.origineGeographique),
          origineSociale: nomOrigine("originesSociales", this.donnees.origineSociale),
          formationBase: nomOrigine("formations", this.donnees.formationBase),
          archetype: libelle("archetypes", this.donnees.archetype),
          typeGenetique: libelle("typesGenetiques", this.donnees.typeGenetique),
          // La clé, en plus du libellé : c'est elle qui fait vivre les règles
          // du type sur la fiche (compétence Hybride, profondeur, perception).
          typeGenetiqueCle: POLARIS.creation.typesGenetiques[this.donnees.typeGenetique]
            ? this.donnees.typeGenetique
            : ""
        },
        notes: { equipement: this.#resumeMetiers() }
      }
    };
  }

  /**
   * Mutations, avantages et désavantages deviennent des Items « trait », le
   * système les gérant déjà ainsi — le type d'objet prévoit d'ailleurs
   * exactement ces quatre genres.
   */
  #construireTraits() {
    const traits = [];

    const ajouter = (nom, genre, cout, description, capaciteId = "") => {
      if (!nom?.trim()) return;
      traits.push({
        name: nom.trim(),
        type: "trait",
        system: {
          genre,
          cout,
          description: description ?? "",
          capaciteId,
          quantite: 0,
          encombrement: 0
        }
      });
    };

    // Les mutations portent leur coût signé : le rapport d'une mutation
    // désavantageuse doit rester lisible sur la fiche. Elles emportent aussi
    // leur identifiant de catalogue, qui débloquera la compétence associée.
    for (const mutation of this.donnees.mutations ?? []) {
      ajouter(
        mutation.nom,
        "mutation",
        POLARIS.coutMutation(mutation.genre, mutation.cout, mutation.tireeAuSort),
        mutation.description,
        mutation.capaciteId ?? ""
      );
    }

    for (const [liste, genre] of [
      ["avantages", "avantage"],
      ["desavantages", "desavantage"]
    ]) {
      for (const ligne of this.donnees[liste] ?? []) {
        ajouter(ligne.nom, genre, Number(ligne.cout) || 0, ligne.description);
      }
    }

    // La capacité à manipuler l'effet Polaris est elle aussi un trait, du genre
    // qui lui est réservé.
    if (this.donnees.manipuleEffetPolaris) {
      ajouter(
        game.i18n.localize(POLARIS.creation.effetPolaris.label),
        "polaris",
        POLARIS.creation.effetPolaris.cout ?? 0
      );
    }

    return traits;
  }

  /**
   * L'expérience préliminaire est consignée en note tant que le livre n'a pas
   * livré sa mécanique : mieux vaut la conserver en clair que la perdre.
   */
  #resumeMetiers() {
    const lignes = (this.donnees.metiers ?? []).filter((m) => m.nom?.trim());
    if (!lignes.length) return "";

    const items = lignes
      .map((m) => `<li>${foundry.utils.escapeHTML(m.nom)} — ${Number(m.cout) || 0}</li>`)
      .join("");

    return `<p><strong>${game.i18n.localize(
      "POLARIS.Creation.Etape.experiencePreliminaire"
    )}</strong></p><ul>${items}</ul>`;
  }

  /* -------------------------------------------- */
  /*  Rendu                                       */
  /* -------------------------------------------- */

  /**
   * Met à jour les totaux à la saisie, sans re-rendre la fenêtre : un rendu
   * complet à chaque frappe ferait perdre le focus du champ en cours.
   */
  _onRender(context, options) {
    super._onRender(context, options);

    this.element.addEventListener("input", (event) => {
      if (!event.target.matches("input[type=number]")) return;
      this.#lireFormulaire();
      this.#rafraichirBudgets();
    });

    // Changer d'archétype ou de type génétique redistribue des valeurs : là, un
    // rendu complet est justifié. L'archétype ne s'applique QU'ICI, sur choix
    // explicite, pour que les niveaux qu'il propose restent retouchables.
    this.element.addEventListener("change", (event) => {
      const declencheur = event.target.closest("[data-recharge]");
      if (!declencheur) return;

      this.#lireFormulaire();

      // Seuls l'archétype et le type génétique redistribuent des valeurs. Les
      // autres déclencheurs — genre d'une mutation, capacité Polaris — ne font
      // que déplacer la bourse, mais imposent un rendu complet parce qu'ils
      // changent la structure de l'écran (champ grisé, ligne recolorée).
      const quoi = declencheur.dataset.recharge;
      if (quoi === "archetype") this.#appliquerArchetype();
      if (quoi === "archetype" || quoi === "typeGenetique") this.#appliquerTypeGenetique();

      this.render();
    });
  }

  /** Recalcule à l'écran les compteurs de points. */
  #rafraichirBudgets() {
    const budgets = this.#budgets();

    for (const cellule of this.element.querySelectorAll("[data-budget]")) {
      const budget = budgets[cellule.dataset.budget];
      if (!budget) continue;

      cellule.textContent = budget.illimite
        ? String(budget.depense)
        : `${budget.depense} / ${budget.budget}`;
      cellule.classList.toggle("polaris-budget-depasse", budget.depasse);
    }
  }
}

/* -------------------------------------------- */

/**
 * Ouvre l'assistant. Point d'entrée unique, appelé par le bouton de la barre
 * latérale comme par une macro (`game.polaris.creerPersonnage()`).
 * @returns {PolarisCreationWizard}
 */
export function ouvrirCreationPersonnage(options = {}) {
  const wizard = new PolarisCreationWizard(options);
  wizard.render(true);
  return wizard;
}
