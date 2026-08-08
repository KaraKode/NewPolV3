const fields = foundry.data.fields;

/**
 * Socle commun à tous les Items : description, encombrement, prix, quantité.
 */
export class PolarisItemBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, blank: true }),
      quantite: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      encombrement: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      prix: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      equipe: new fields.BooleanField({ required: true, initial: false })
    };
  }
}
