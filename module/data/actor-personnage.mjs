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
      // Clé du type génétique, en plus de son libellé affichable : c'est elle
      // qui permet de retrouver la compétence Hybride qu'il procure et ses
      // règles propres (profondeur, perception sous-marine).
      typeGenetiqueCle: new fields.StringField({
        required: false,
        blank: true,
        choices: () => ["", ...Object.keys(POLARIS.creation.typesGenetiques)]
      }),
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

          // Une compétence générique est possédée d'office. Une spéciale doit
          // être procurée, une réservée doit être apprise — le livre dit qu'elle
          // « ne peut être utilisée tant qu'elle n'a pas été apprise ». Ni l'une
          // ni l'autre n'apparaît sur la fiche avant.
          acquise: new fields.BooleanField({
            required: true,
            initial: !POLARIS.competenceAAcquerir(cle)
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

    const sourcesCompetences = this.#sourcesDeCompetences();

    for (const [cle, competence] of Object.entries(this.competences)) {
      const definition = POLARIS.competences[cle];
      if (!definition) continue;

      competence.label = game.i18n.localize(definition.label);
      competence.categorie = definition.categorie;
      competence.speciale = Boolean(definition.speciale);
      competence.abstraite = Boolean(definition.abstraite);
      competence.aAcquerir = POLARIS.competenceAAcquerir(cle);
      competence.parent = definition.parent ?? null;
      competence.prerequis = definition.prerequis ?? [];
      // Cinq compétences du livre ont des attributs « variables » : c'est l'arme
      // ou la discipline qui les décide, pas la compétence. Leur couple est donc
      // nul, et leur base ne peut pas se calculer — la fiche le signale au lieu
      // d'afficher un zéro trompeur.
      competence.attributsVariables = !definition.attributs;
      competence.attributs = definition.attributs ?? [];
      competence.abbrs = competence.attributs.map((a) => this.attributs[a]?.abbr ?? a);
      // Les marqueurs voyagent en objets plutôt qu'en symboles : la fiche a
      // besoin de savoir DE QUEL marqueur il s'agit pour signaler un pré-requis
      // non rempli, et de son libellé pour l'infobulle.
      competence.marqueurs = (definition.marqueurs ?? [])
        .filter((m) => POLARIS.marqueursCompetence[m])
        .map((m) => ({
          cle: m,
          symbole: POLARIS.marqueursCompetence[m].symbole,
          label: game.i18n.localize(POLARIS.marqueursCompetence[m].label),
          applique: POLARIS.marqueursCompetence[m].applique
        }));

      // Une compétence spéciale est acquise si et seulement si quelque chose y
      // donne accès — un trait porté ou le type génétique. Le lien est dérivé,
      // jamais stocké : retirer la mutation retire la compétence.
      const source = sourcesCompetences[cle];
      if (definition.speciale) {
        competence.acquise = Boolean(source);
        competence.sources = source?.sources ?? [];
      }

      // La base somme les aptitudes des deux attributs, puis applique le
      // modificateur propre à la compétence — le « -3 » de « CON/COO -3 ».
      competence.modificateur = definition.modificateur ?? 0;
      competence.base =
        competence.attributs.reduce((total, a) => total + (this.attributs[a]?.aptitude ?? 0), 0) +
        competence.modificateur;

      // Certaines compétences ne peuvent jamais dépasser un plafond : un
      // Amphibie reste bloqué à 0 de maîtrise, si doué soit-il.
      // Le plafond vient de la source la plus favorable, pas de la compétence :
      // un Amphibie est bridé au niveau 0, un géno-hybride ne l'est pas, et la
      // même compétence Hybride sert aux deux.
      competence.maitriseMax = source ? source.maitriseMax : definition.maitriseMax ?? null;
      if (competence.maitriseMax !== null && competence.maitrise > competence.maitriseMax) {
        competence.maitrise = competence.maitriseMax;
      }

      // Plafond effectif du champ de saisie. Calculé ici plutôt que dans le
      // template : un plafond de 0 est légitime, et le distinguer d'une absence
      // de plafond en Handlebars demanderait une acrobatie.
      competence.maitriseMaxEffective = competence.maitriseMax ?? POLARIS.bornesMaitrise.max;

      // Le niveau de DÉPART est un plancher, pas un modificateur : le « (-3) »
      // du livre place la compétence sous zéro, et les premiers niveaux achetés
      // servent à le résorber. Il appartient à la source quand il y en a une —
      // Amphibie procure Hybride à -3, le type génétique hybride à +3.
      competence.maitriseDepart = source
        ? source.maitriseDepart
        : (definition.maitriseDepart ?? 0);
      competence.maitriseMinEffective = competence.maitriseDepart;
      if (competence.maitrise < competence.maitriseMinEffective) {
        competence.maitrise = competence.maitriseMinEffective;
      }

      competence.globale = competence.base + competence.maitrise;
    }

    this.#preparerPrerequis();
  }

  /**
   * Confronte les pré-requis chiffrés du livre — « Électronique 5 » — à ce que
   * le personnage sait réellement.
   *
   * Seconde passe obligatoire : un pré-requis se lit sur une AUTRE compétence,
   * qui doit donc avoir sa globale. Ce que valent ces 5 — maîtrise ou globale —
   * est un arbitrage de `POLARIS.basePrerequis`, pas une décision d'ici.
   *
   * On ne rabote aucune valeur déjà saisie : un meneur reste libre d'accorder
   * une exception. La fiche signale, et seul l'apprentissage est bloqué.
   */
  #preparerPrerequis() {
    // Ce que le personnage sait vraiment, tel que le livre le compare.
    const niveauAtteint = (cle) => {
      const requise = this.competences[cle];
      if (!requise || requise.acquise === false) return null;
      return POLARIS.basePrerequis === "maitrise" ? requise.maitrise : requise.globale;
    };

    for (const [cle, competence] of Object.entries(this.competences)) {
      competence.prerequisManquants = POLARIS.prerequisManquants(cle, niveauAtteint).map(
        (exigence) => ({
          ...exigence,
          label: POLARIS.competences[exigence.cle]
            ? game.i18n.localize(POLARIS.competences[exigence.cle].label)
            : exigence.cle
        })
      );

      competence.prerequisRemplis = competence.prerequisManquants.length === 0;
    }
  }

  /**
   * Identifiants des capacités spéciales que le personnage porte réellement,
   * lus sur ses traits.
   * @returns {Set<string>}
   */
  #capacitesPortees() {
    const portees = new Set();
    for (const item of this.parent?.items ?? []) {
      if (item.type !== "trait") continue;
      if (item.system.capaciteId) portees.add(item.system.capaciteId);
    }
    return portees;
  }

  /**
   * Recense, pour chaque compétence spéciale, ce qui y donne accès.
   *
   * Une même compétence peut venir de plusieurs sources aux règles
   * différentes : la compétence Hybride est procurée par la mutation Amphibie
   * — plafonnée au niveau 0 — comme par les trois types génétiques hybrides,
   * qui eux ne la plafonnent pas. On retient donc la règle la PLUS FAVORABLE :
   * un Amphibie devenu géno-hybride n'est plus bridé par sa mutation.
   *
   * @returns {Record<string, {maitriseMax: number|null, maitriseDepart: number, sources: string[]}>}
   */
  #sourcesDeCompetences() {
    const sources = {};

    const ajouter = (competence, origine) => {
      if (!competence?.cle) return;

      const existante = sources[competence.cle];
      const plafond = competence.maitriseMax ?? null;
      const depart = competence.maitriseDepart ?? 0;

      if (!existante) {
        sources[competence.cle] = { maitriseMax: plafond, maitriseDepart: depart, sources: [origine] };
        return;
      }

      existante.sources.push(origine);
      // Le niveau de départ suit la même règle que le plafond : le plus
      // favorable gagne. Hybride débute à -3 par la mutation Amphibie et à +3
      // par le type hybride naturel ; cumuler les deux ne doit pas desservir.
      existante.maitriseDepart = Math.max(existante.maitriseDepart, depart);
      // `null` signifie « aucun plafond » : il l'emporte sur n'importe quel
      // chiffre, et entre deux chiffres c'est le plus haut qui gagne.
      if (existante.maitriseMax === null || plafond === null) existante.maitriseMax = null;
      else existante.maitriseMax = Math.max(existante.maitriseMax, plafond);
    };

    for (const id of this.#capacitesPortees()) {
      ajouter(POLARIS.creation.capacitesSpeciales[id]?.competence, id);
    }

    const type = POLARIS.creation.typesGenetiques[this.identite?.typeGenetiqueCle];
    if (type?.competence) ajouter(type.competence, this.identite.typeGenetiqueCle);

    return sources;
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
      // Une famille nue ne se joue pas : « Pilotage » n'est qu'un porte-manteau,
      // ce sont ses véhicules qui ont des attributs et un niveau.
      if (competence.abstraite) continue;

      // Spéciales et réservées restent invisibles tant qu'elles ne sont pas
      // acquises : sans cela, la fiche listerait tout le catalogue du livre.
      if (competence.aAcquerir && !competence.acquise) continue;

      const categorie = competence.categorie ?? "aptitudesPhysiques";
      groupes[categorie] ??= [];
      groupes[categorie].push({ cle, ...competence });
    }

    // On écarte les catégories vides pour ne pas afficher de section fantôme.
    for (const [cle, liste] of Object.entries(groupes)) {
      if (!liste.length) delete groupes[cle];
    }
    return groupes;
  }

  /**
   * Le catalogue de ce que le personnage PEUT encore apprendre, groupé par
   * catégorie — l'envers de `competencesParCategorie`.
   *
   * Une compétence réservée « (X) » ne peut pas être utilisée tant qu'elle n'a
   * pas été apprise : elle reste donc hors de la fiche, et il faut bien un
   * endroit d'où la faire venir. Sans cette liste, les compétences réservées du
   * livre seraient inatteignables.
   *
   * Les compétences SPÉCIALES en sont exclues : elles ne s'apprennent pas, elles
   * se reçoivent d'une mutation ou d'un type génétique, et `prepareDerivedData`
   * recalcule leur acquisition à chaque fois. Les proposer ici laisserait croire
   * à un choix qui ne tiendrait pas.
   *
   * @returns {Record<string, object[]>}
   */
  get competencesAAcquerir() {
    const groupes = {};

    for (const [cle, competence] of Object.entries(this.competences)) {
      if (competence.abstraite) continue;
      if (!competence.aAcquerir || competence.speciale) continue;
      if (competence.acquise) continue;

      const categorie = competence.categorie ?? "aptitudesPhysiques";
      (groupes[categorie] ??= []).push({
        cle,
        label: competence.label,
        abbrs: competence.abbrs,
        attributsVariables: competence.attributsVariables,
        maitriseDepart: competence.maitriseDepart,
        prerequisManquants: competence.prerequisManquants,
        // Le pré-requis bloque l'apprentissage, pas l'usage : c'est ici, et
        // seulement ici, qu'il empêche quelque chose.
        disponible: competence.prerequisRemplis
      });
    }

    for (const liste of Object.values(groupes)) {
      liste.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }
    return groupes;
  }
}
