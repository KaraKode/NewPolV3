import { PolarisPersonnage } from "./actor-personnage.mjs";

const fields = foundry.data.fields;

/**
 * PNJ : identique à un personnage joueur, avec en plus des notes de meneur et
 * un indicateur de menace. Hériter du personnage garde une seule implémentation
 * des compétences et des jets.
 */
export class PolarisPnj extends PolarisPersonnage {
  static defineSchema() {
    const schema = super.defineSchema();

    schema.menace = new fields.StringField({ required: false, blank: true });
    schema.notesMeneur = new fields.HTMLField({ required: false, blank: true });

    return schema;
  }
}
