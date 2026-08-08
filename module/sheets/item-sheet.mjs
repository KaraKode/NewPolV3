import { POLARIS } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Fiche d'Item, en ApplicationV2.
 *
 * Une part de détail distincte est chargée selon le type d'objet : chaque type
 * a ses propres champs, mais l'en-tête et la description restent communs.
 */
export class PolarisItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["polaris", "sheet", "item"],
    position: { width: 560, height: 620 },
    window: { resizable: true, contentClasses: ["polaris-contenu"] },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    entete: { template: `${POLARIS.TEMPLATES}/item/entete.hbs` },
    details: { template: `${POLARIS.TEMPLATES}/item/details.hbs`, scrollable: [""] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.item = this.item;
    context.system = this.item.system;
    context.config = POLARIS;
    context.modifiable = this.isEditable;

    // Le template de détail se branche sur ces drapeaux plutôt que sur des
    // comparaisons de chaînes dans le Handlebars.
    context.estArme = this.item.type === "arme";
    context.estProtection = this.item.type === "protection";
    context.estTrait = this.item.type === "trait";

    context.descriptionEnrichie = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.item.system.description ?? "",
      { relativeTo: this.item, secrets: this.item.isOwner }
    );

    return context;
  }
}
