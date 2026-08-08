import { POLARIS } from "../config.mjs";
import { PolarisItemBase } from "./base-item.mjs";

const fields = foundry.data.fields;

/**
 * Protection (combinaison, blindage, plastron…).
 *
 * Les champs reprennent les colonnes de la table PROTECTIONS de la feuille
 * officielle : Protection, Choc, Localisation, Cat./malus. La valeur s'applique
 * aux seules zones couvertes : une combinaison intégrale les coche toutes, un
 * plastron ne couvre que le corps.
 */
export class PolarisProtection extends PolarisItemBase {
  static defineSchema() {
    const schema = super.defineSchema();

    /** Valeur de protection contre les dégâts. */
    schema.protection = new fields.NumberField({
      required: true, nullable: false, integer: true, initial: 0, min: 0
    });

    /** Valeur de protection contre le choc. */
    schema.choc = new fields.NumberField({
      required: true, nullable: false, integer: true, initial: 0, min: 0
    });

    /** Zones couvertes, une case à cocher par localisation. */
    schema.localisations = new fields.SchemaField(
      Object.keys(POLARIS.localisations).reduce((acc, cle) => {
        acc[cle] = new fields.BooleanField({ required: true, initial: false });
        return acc;
      }, {})
    );

    /** Colonne « Cat./malus » : catégorie d'encombrement et pénalité associée. */
    schema.categorie = new fields.StringField({ required: false, blank: true });
    schema.malus = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    schema.etancheite = new fields.BooleanField({ required: true, initial: false });

    return schema;
  }

  /* -------------------------------------------- */

  /**
   * Éclate les valeurs sur les zones couvertes, sous une forme directement
   * sommable par l'acteur.
   * @returns {Record<string, {protection: number, choc: number}>}
   */
  prepareDerivedData() {
    this.parLocalisation = {};

    for (const [cle, couverte] of Object.entries(this.localisations)) {
      this.parLocalisation[cle] = {
        protection: couverte ? this.protection : 0,
        choc: couverte ? this.choc : 0
      };
    }
  }
}
