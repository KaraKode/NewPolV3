import { POLARIS } from "../config.mjs";
import { PolarisItemBase } from "./base-item.mjs";

const fields = foundry.data.fields;

/**
 * Arme.
 *
 * La feuille officielle distingue deux tables aux colonnes différentes :
 *   ARMES (CONTACT) — Dom. | Pen | Choc | FOR | Ini. | All. | ITG
 *   ARMES (TIR)     — Dom. | Pen | Choc | Portée | FOR | Ini. | Mode de tir |
 *                     Mun. (coût) | Notes | ITG
 *
 * Les colonnes communes vivent dans le schéma de base ci-dessous ; `categorie`
 * décide de celles qui s'affichent en plus. C'est aussi elle qui choisit la
 * table de localisation appliquée aux dégâts : contact ou distance.
 *
 * `competence` désigne la compétence utilisée pour attaquer : cliquer sur
 * l'arme déclenche le jet correspondant, modificateur de l'arme inclus.
 */
export class PolarisArme extends PolarisItemBase {
  static defineSchema() {
    const schema = super.defineSchema();

    schema.categorie = new fields.StringField({
      required: true,
      blank: false,
      initial: "contact",
      choices: () => Object.keys(POLARIS.categoriesArme)
    });

    schema.competence = new fields.StringField({
      required: true,
      blank: false,
      initial: "combatArme",
      choices: () => Object.keys(POLARIS.competences)
    });

    /* Colonnes communes aux deux tables. */

    // Dom. — formule de dégâts, saisie librement (ex. « 1d6+2 »).
    schema.degats = new fields.StringField({ required: false, blank: true, initial: "" });

    // Pen — pénétration, retranchée à la protection de la zone touchée.
    schema.penetration = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    // Choc — dégâts de choc, opposés au seuil d'étourdissement.
    schema.choc = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    // FOR — force minimale requise pour manier l'arme sans pénalité.
    schema.forceMin = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    // Ini. — modificateur d'initiative propre à l'arme.
    schema.initiative = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    // ITG — indice technologique et de garantie.
    schema.itg = new fields.StringField({ required: false, blank: true });

    // Modificateur appliqué aux chances de réussite lors d'une attaque.
    schema.modificateur = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    /* Colonne propre au contact. */

    // All. — allonge de l'arme.
    schema.allonge = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    /* Colonnes propres au tir. */

    // Portée — une distance par palier ; le modificateur associé vient de la config.
    schema.portees = new fields.SchemaField(
      Object.keys(POLARIS.porteesTir).reduce((acc, cle) => {
        acc[cle] = new fields.NumberField({
          required: false, nullable: true, integer: true, initial: null, min: 0
        });
        return acc;
      }, {})
    );

    schema.modeTir = new fields.StringField({
      required: false,
      blank: true,
      initial: "coupParCoup",
      choices: () => Object.keys(POLARIS.modesTir)
    });

    schema.munitions = new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      cout: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 })
    });

    schema.notes = new fields.StringField({ required: false, blank: true });

    return schema;
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    this.estTir = this.categorie === "tir";

    // Table de localisation à appliquer aux dégâts de cette arme.
    this.tableLocalisation =
      POLARIS.categoriesArme[this.categorie]?.tableLocalisation ?? POLARIS.tableLocalisationParDefaut;

    // Paliers de portée renseignés, avec leur modificateur, prêts pour le dialogue de jet.
    this.paliersPortee = Object.entries(POLARIS.porteesTir)
      .filter(([cle]) => this.portees[cle] !== null)
      .map(([cle, definition]) => ({
        cle,
        label: definition.label,
        mod: definition.mod,
        distance: this.portees[cle]
      }));
  }
}
