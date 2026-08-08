import { POLARIS } from "../config.mjs";
import { PolarisActorBase } from "./base-actor.mjs";

const fields = foundry.data.fields;

/**
 * Personnage joueur : le socle commun, plus l'état civil, la description
 * physique et les compétences.
 *
 * Les compétences sont une liste fixe issue de `POLARIS.competences`. Seuls le
 * niveau de maîtrise et l'éventuelle spécialisation sont stockés ; la base et la
 * globale sont recalculées à chaque préparation de données.
 */
export class PolarisPersonnage extends PolarisActorBase {
  static defineSchema() {
    const schema = super.defineSchema();

    // Bloc d'état civil de la colonne droite de la feuille officielle.
    schema.identite = new fields.SchemaField({
      archetype: new fields.StringField({ required: false, blank: true }),
      typeGenetique: new fields.StringField({ required: false, blank: true }),
      age: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
      sexe: new fields.StringField({ required: false, blank: true }),
      feconde: new fields.BooleanField({ required: true, initial: true }),
      origineGeographique: new fields.StringField({ required: false, blank: true }),
      origineSociale: new fields.StringField({ required: false, blank: true }),
      formationBase: new fields.StringField({ required: false, blank: true }),
      etudesSuperieures: new fields.StringField({ required: false, blank: true })
    });

    // Bloc « Description physique » de la colonne gauche.
    schema.description = new fields.SchemaField({
      taille: new fields.StringField({ required: false, blank: true }),
      poids: new fields.StringField({ required: false, blank: true }),
      peau: new fields.StringField({ required: false, blank: true }),
      corpulence: new fields.StringField({ required: false, blank: true }),
      cheveux: new fields.StringField({ required: false, blank: true }),
      yeux: new fields.StringField({ required: false, blank: true }),
      lateralite: new fields.StringField({
        required: false,
        blank: true,
        initial: "droitier",
        choices: () => ["droitier", "gaucher", "ambidextre"]
      }),
      signesParticuliers: new fields.StringField({ required: false, blank: true })
    });

    // Une entrée par compétence déclarée dans la config.
    schema.competences = new fields.SchemaField(
      Object.keys(POLARIS.competences).reduce((acc, cle) => {
        acc[cle] = new fields.SchemaField({
          maitrise: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 0,
            min: POLARIS.bornesMaitrise.min,
            max: POLARIS.bornesMaitrise.max
          }),
          specialisation: new fields.StringField({ required: false, blank: true }),

          // Une compétence générique est possédée d'office ; une spéciale doit
          // être achetée, et n'apparaît sur la fiche qu'une fois acquise.
          acquise: new fields.BooleanField({
            required: true,
            initial: !POLARIS.competences[cle].speciale
          })
        });
        return acc;
      }, {})
    );

    // Zones de texte libre de la feuille officielle.
    schema.notes = new fields.SchemaField({
      avantages: new fields.HTMLField({ required: false, blank: true }),
      equipement: new fields.HTMLField({ required: false, blank: true }),
      sequelles: new fields.HTMLField({ required: false, blank: true })
    });

    return schema;
  }

  /* -------------------------------------------- */

  /**
   * Calcule, pour chaque compétence, les trois colonnes de la feuille :
   *   Base  = somme des aptitudes naturelles des attributs du couple
   *   Maît. = niveau de maîtrise, saisi
   *   Glob. = Base + Maît.
   *
   * Le malus de blessure n'est PAS intégré ici : il s'applique au moment du jet,
   * pour que la fiche continue d'afficher la valeur de la feuille papier.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    for (const [cle, competence] of Object.entries(this.competences)) {
      const definition = POLARIS.competences[cle];
      if (!definition) continue;

      competence.label = game.i18n.localize(definition.label);
      competence.categorie = definition.categorie;
      competence.speciale = Boolean(definition.speciale);
      competence.attributs = definition.attributs;
      competence.abbrs = definition.attributs.map((a) => this.attributs[a]?.abbr ?? a);
      competence.marqueurs = (definition.marqueurs ?? []).map(
        (m) => POLARIS.marqueursCompetence[m]?.symbole ?? ""
      );

      competence.base = definition.attributs.reduce(
        (total, a) => total + (this.attributs[a]?.aptitude ?? 0),
        0
      );
      competence.globale = competence.base + competence.maitrise;
    }
  }

  /**
   * Compétences regroupées par catégorie, prêtes pour l'affichage.
   *
   * Les compétences spéciales non acquises sont écartées : elles ne figurent
   * sur la fiche qu'une fois achetées, pour que la liste décrive le personnage
   * plutôt que le catalogue du livre.
   *
   * @returns {Record<string, object[]>}
   */
  get competencesParCategorie() {
    const groupes = {};
    for (const cle of Object.keys(POLARIS.categoriesCompetence)) groupes[cle] = [];

    for (const [cle, competence] of Object.entries(this.competences)) {
      if (competence.speciale && !competence.acquise) continue;

      const categorie = competence.categorie ?? "physique";
      groupes[categorie] ??= [];
      groupes[categorie].push({ cle, ...competence });
    }

    // On écarte les catégories vides pour ne pas afficher de section fantôme.
    for (const [cle, liste] of Object.entries(groupes)) {
      if (!liste.length) delete groupes[cle];
    }
    return groupes;
  }
}
