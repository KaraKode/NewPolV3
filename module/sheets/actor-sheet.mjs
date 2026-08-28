import { POLARIS } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Fiche d'acteur (personnage et PNJ), en ApplicationV2.
 *
 * La fiche est découpée en « parts » Handlebars, une par onglet. Les données de
 * règles ne sont jamais recalculées ici : elles proviennent des DataModels.
 */
export class PolarisActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["polaris", "sheet", "acteur"],
    position: { width: 880, height: 740 },
    window: { resizable: true, contentClasses: ["polaris-contenu"] },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      jetCompetence: this.#surJetCompetence,
      jetAttribut: this.#surJetAttribut,
      cocherBlessure: this.#surCocherBlessure,
      changerOnglet: this.#surChangerOnglet,
      creerItem: this.#surCreerItem,
      editerItem: this.#surEditerItem,
      supprimerItem: this.#surSupprimerItem,
      utiliserItem: this.#surUtiliserItem
    },
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }]
  };

  static PARTS = {
    entete: { template: `${POLARIS.TEMPLATES}/actor/entete.hbs` },
    navigation: { template: `${POLARIS.TEMPLATES}/shared/navigation.hbs` },
    attributs: { template: `${POLARIS.TEMPLATES}/actor/attributs.hbs`, scrollable: [""] },
    competences: { template: `${POLARIS.TEMPLATES}/actor/competences.hbs`, scrollable: [""] },
    sante: { template: `${POLARIS.TEMPLATES}/actor/sante.hbs`, scrollable: [""] },
    equipement: { template: `${POLARIS.TEMPLATES}/actor/equipement.hbs`, scrollable: [""] },
    biographie: { template: `${POLARIS.TEMPLATES}/actor/biographie.hbs`, scrollable: [""] }
  };

  /** Onglet actif par défaut. */
  tabGroups = { primaire: "attributs" };

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.acteur = this.actor;
    context.system = this.actor.system;
    context.config = POLARIS;
    context.modifiable = this.isEditable;
    context.tabs = this.#construireOnglets();
    context.itemsParType = this.#regrouperItems();

    // Le personnage et le PNJ partagent la même structure de compétences.
    context.competencesParCategorie = this.actor.system.competencesParCategorie ?? {};

    // Table des marges, à titre d'aide-mémoire sur la fiche. Les libellés sont
    // composés ici : la dernière tranche est ouverte vers le haut (`Infinity`),
    // ce qu'un template ne saurait pas présenter.
    context.tableMarges = POLARIS.tableMarges.map((tranche) => ({
      mod: tranche.mod,
      libelle:
        tranche.max === Infinity
          ? `${tranche.min}+`
          : tranche.min === tranche.max
            ? `${tranche.min}`
            : `${tranche.min}–${tranche.max}`
    }));

    context.biographieEnrichie = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.biographie ?? "",
      { relativeTo: this.actor, secrets: this.actor.isOwner }
    );

    return context;
  }

  /**
   * Le mixin Handlebars appelle cette méthode pour chaque part. On y injecte
   * l'onglet correspondant afin que le template connaisse son état actif.
   */
  async _preparePartContext(partId, context, options) {
    const contexte = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) contexte.tab = context.tabs[partId];
    return contexte;
  }

  /**
   * Décrit les onglets. La clé de chaque entrée doit correspondre au nom de la
   * part pour que `_preparePartContext` puisse les relier.
   */
  #construireOnglets() {
    const groupe = "primaire";
    const actif = this.tabGroups[groupe];

    const definitions = {
      attributs: { icon: "fa-solid fa-dna", label: "POLARIS.Onglet.attributs" },
      competences: { icon: "fa-solid fa-list-check", label: "POLARIS.Onglet.competences" },
      sante: { icon: "fa-solid fa-heart-pulse", label: "POLARIS.Onglet.sante" },
      equipement: { icon: "fa-solid fa-briefcase", label: "POLARIS.Onglet.equipement" },
      biographie: { icon: "fa-solid fa-book-open", label: "POLARIS.Onglet.biographie" }
    };

    return Object.entries(definitions).reduce((acc, [id, def]) => {
      const estActif = actif === id;
      acc[id] = {
        id,
        group: groupe,
        icon: def.icon,
        label: def.label,
        active: estActif,
        cssClass: estActif ? "active" : ""
      };
      return acc;
    }, {});
  }

  /** Range les items possédés par type, pour l'onglet équipement. */
  #regrouperItems() {
    const groupes = Object.keys(POLARIS.typesItem).reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {});

    for (const item of this.actor.items) {
      (groupes[item.type] ??= []).push(item);
    }

    for (const liste of Object.values(groupes)) {
      liste.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    }
    return groupes;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #surChangerOnglet(event, cible) {
    this.changeTab(cible.dataset.tab, cible.dataset.group);
  }

  static async #surJetCompetence(event, cible) {
    const cle = cible.dataset.competence;
    // Maj (shift) enfoncée : on saute la fenêtre de configuration.
    await this.actor.jetCompetence(cle, { direct: event.shiftKey });
  }

  static async #surJetAttribut(event, cible) {
    const cle = cible.dataset.attribut;
    const attribut = this.actor.system.attributs[cle];
    if (!attribut) return;

    const roll = new Roll(POLARIS.resolution.de);
    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n.format("POLARIS.Chat.jetAttribut", {
        attribut: game.i18n.localize(POLARIS.attributs[cle].label),
        valeur: attribut.actuel
      })
    });
  }

  /**
   * Coche ou décoche une case de la grille de blessures.
   *
   * Les cases d'une même cellule se remplissent de gauche à droite : cliquer la
   * n-ième porte le compte à n. Recliquer sur la dernière cochée la libère, ce
   * qui permet de corriger sans avoir à repartir de zéro.
   */
  static async #surCocherBlessure(event, cible) {
    const { gravite, localisation } = cible.dataset;
    const index = Number(cible.dataset.index);

    const actuel = this.actor.system.sante.blessures?.[gravite]?.[localisation] ?? 0;
    const nouveau = actuel === index ? index - 1 : index;

    await this.actor.update({ [`system.sante.blessures.${gravite}.${localisation}`]: nouveau });
  }

  static async #surCreerItem(event, cible) {
    const type = cible.dataset.type;
    await this.actor.createEmbeddedDocuments("Item", [
      {
        name: game.i18n.format("POLARIS.Item.nouveau", {
          type: game.i18n.localize(POLARIS.typesItem[type] ?? type)
        }),
        type
      }
    ]);
  }

  static async #surEditerItem(event, cible) {
    const item = this.#itemDepuisCible(cible);
    item?.sheet.render(true);
  }

  static async #surSupprimerItem(event, cible) {
    const item = this.#itemDepuisCible(cible);
    if (!item) return;

    const confirme = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("POLARIS.Dialogue.titreSuppression") },
      content: `<p>${game.i18n.format("POLARIS.Dialogue.confirmerSuppression", { nom: item.name })}</p>`
    });
    if (confirme) await item.delete();
  }

  static async #surUtiliserItem(event, cible) {
    const item = this.#itemDepuisCible(cible);
    if (!item) return;

    if (item.type === "arme") await item.attaquer();
    else await item.afficherDansChat();
  }

  /** Remonte du bouton cliqué jusqu'à l'Item correspondant. */
  #itemDepuisCible(cible) {
    const ligne = cible.closest("[data-item-id]");
    return ligne ? this.actor.items.get(ligne.dataset.itemId) : null;
  }
}
