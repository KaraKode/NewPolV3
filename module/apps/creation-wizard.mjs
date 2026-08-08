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
        // Listes libres : le livre n'ayant pas encore été transcrit, chaque
        // ligne est saisie à la main plutôt que choisie dans un catalogue.
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

    context.attributs = this.#detailAttributs();
    context.capacitesSpeciales = this.#detailCapacitesSpeciales();
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
   * Compétences spéciales achetables. Vide tant que le livre n'est pas
   * transcrit — l'écran le dit alors franchement plutôt que d'afficher un
   * tableau creux.
   */
  #detailCapacitesSpeciales() {
    const aptitudes = Object.fromEntries(this.#detailAttributs().map((a) => [a.cle, a.aptitude]));

    return POLARIS.competencesSpeciales().map((cle) => {
      const definition = POLARIS.competences[cle];
      const base = definition.attributs.reduce((total, a) => total + (aptitudes[a] ?? 0), 0);
      const maitrise = Number(this.donnees.competences[cle]) || 0;

      return {
        cle,
        label: game.i18n.localize(definition.label),
        abbrs: definition.attributs.map((a) => game.i18n.localize(POLARIS.attributs[a]?.abbr ?? a)),
        base,
        maitrise,
        globale: base + maitrise,
        acquise: maitrise > 0
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

    const depenseSpeciales = Object.values(this.donnees.competences).reduce(
      (total, m) => total + (Number(m) || 0),
      0
    );

    return {
      pointsCreation: {
        ...construire(POLARIS.creation.pointsAttributs(), depenseAttributs + coutType),
        detailAttributs: depenseAttributs,
        detailType: coutType
      },
      capacitesSpeciales: construire(POLARIS.creation.points.capacitesSpeciales, depenseSpeciales),
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
    for (const liste of ["metiers", "avantages", "desavantages"]) {
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
      this.donnees.attributs[cle].modifType = choisi?.modificateurs?.[cle] ?? 0;
    }
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

    // Chaque étape ne surveille que son enveloppe. Les deux premières partagent
    // la bourse de points de création, le type génétique y puisant aussi.
    const enveloppes = {
      capacitesBase: ["pointsCreation"],
      typeGenetique: ["pointsCreation"],
      capacitesSpeciales: ["capacitesSpeciales"],
      experiencePreliminaire: ["experiencePreliminaire"],
      avantages: ["avantages", "desavantages"]
    };

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

  /** Ajoute une ligne vierge à une liste libre (métier, avantage, désavantage). */
  static #surAjouterLigne(event, cible) {
    this.#lireFormulaire();
    const liste = cible.dataset.liste;

    this.donnees[liste] = [...(this.donnees[liste] ?? []), { nom: "", cout: 0, description: "" }];
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
    const competences = {};
    for (const cle of Object.keys(POLARIS.competences)) {
      const maitrise = Number(this.donnees.competences[cle]) || 0;
      const speciale = Boolean(POLARIS.competences[cle].speciale);

      competences[cle] = {
        maitrise,
        // Une spéciale n'est acquise que si elle a effectivement été achetée.
        acquise: speciale ? maitrise > 0 : true
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

    return {
      name: this.donnees.name.trim(),
      type: "personnage",
      system: {
        attributs,
        competences,
        identite: {
          archetype: libelle("archetypes", this.donnees.archetype),
          typeGenetique: libelle("typesGenetiques", this.donnees.typeGenetique)
        },
        notes: { equipement: this.#resumeMetiers() }
      }
    };
  }

  /**
   * Les avantages et désavantages deviennent des Items « trait », le système
   * les gérant déjà ainsi. Leur coût est repris tel quel.
   */
  #construireTraits() {
    const traits = [];

    for (const [liste, genre] of [
      ["avantages", "avantage"],
      ["desavantages", "desavantage"]
    ]) {
      for (const ligne of this.donnees[liste] ?? []) {
        if (!ligne.nom?.trim()) continue;

        traits.push({
          name: ligne.nom.trim(),
          type: "trait",
          system: {
            genre,
            cout: Number(ligne.cout) || 0,
            description: ligne.description ?? "",
            quantite: 0,
            encombrement: 0
          }
        });
      }
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
      if (declencheur.dataset.recharge === "archetype") this.#appliquerArchetype();
      this.#appliquerTypeGenetique();
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
