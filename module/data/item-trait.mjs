import { PolarisItemBase } from "./base-item.mjs";

const fields = foundry.data.fields;

/**
 * Trait : avantage, désavantage, mutation ou Polaris.
 *
 * Les quatre genres reprennent l'intitulé du cadre de la feuille officielle,
 * « AVANTAGES/DÉSAVANTAGES, MUTATIONS ET POLARIS ». Contrairement à
 * l'équipement, un trait ne se transporte pas.
 */
export class PolarisTrait extends PolarisItemBase {
  static defineSchema() {
    const schema = super.defineSchema();

    schema.genre = new fields.StringField({
      required: true,
      blank: false,
      initial: "avantage",
      choices: ["avantage", "desavantage", "mutation", "polaris"]
    });

    schema.cout = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    // Référence vers l'entrée du catalogue des capacités spéciales, quand le
    // trait en provient. C'est ce lien qui débloque la compétence associée sur
    // la fiche : porter la mutation suffit, sans réglage supplémentaire.
    schema.capaciteId = new fields.StringField({ required: false, blank: true });

    return schema;
  }
}
