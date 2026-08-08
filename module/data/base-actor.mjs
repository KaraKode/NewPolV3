import { POLARIS } from "../config.mjs";

const fields = foundry.data.fields;

/**
 * Socle commun à tous les acteurs : les neuf attributs, les attributs
 * secondaires, l'état de santé et la biographie.
 *
 * Les schémas sont générés à partir de `config.mjs`. Ajouter un attribut, une
 * localisation ou une gravité de blessure dans la config suffit à le faire
 * apparaître ici — aucun champ n'est écrit en dur.
 */
export class PolarisActorBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};

    // Les neuf attributs. Chaque attribut se décompose comme sur la feuille
    // officielle : niveau de base, modificateur de type génétique, modificateur
    // de points de création. Le niveau actuel en est la somme, et l'aptitude
    // naturelle en dérive : ni l'un ni l'autre n'est stocké.
    schema.attributs = new fields.SchemaField(
      Object.keys(POLARIS.attributs).reduce((acc, cle) => {
        acc[cle] = new fields.SchemaField(
          POLARIS.composantesAttribut.reduce((composantes, nom) => {
            composantes[nom] = new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 0,
              min: POLARIS.bornesAttribut.min,
              max: POLARIS.bornesAttribut.max
            });
            return composantes;
          }, {})
        );
        return acc;
      }, {})
    );

    // Attributs secondaires. Chacun porte deux champs :
    //   `valeur` — saisie manuelle, utilisée seulement quand le livre ne donne
    //              pas de formule ;
    //   `bonus`  — ajustement libre, TOUJOURS ajouté, formule ou non.
    //
    // Le bonus n'est pas un ornement : le livre calcule le seuil d'inconscience
    // à partir du seuil d'étourdissement « modifié par d'éventuels bonus ou
    // pénalités ». Sans champ dédié, cette règle serait inapplicable.
    schema.secondaires = new fields.SchemaField(
      Object.keys(POLARIS.attributsSecondaires).reduce((acc, cle) => {
        acc[cle] = new fields.SchemaField({
          valeur: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          bonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
        });
        return acc;
      }, {})
    );

    // Déplacements : une valeur par milieu et par allure, saisies à la main tant
    // que le livre n'en donne pas la formule.
    schema.deplacements = new fields.SchemaField(
      Object.keys(POLARIS.milieuxDeplacement).reduce((acc, milieu) => {
        acc[milieu] = new fields.SchemaField(
          Object.keys(POLARIS.alluresDeplacement).reduce((allures, allure) => {
            allures[allure] = new fields.NumberField({
              required: true,
              nullable: false,
              integer: true,
              initial: 0,
              min: 0
            });
            return allures;
          }, {})
        );
        return acc;
      }, {})
    );

    // État de santé : la grille de cases de blessure. Une entrée par gravité,
    // et dans chacune le nombre de cases cochées par localisation.
    schema.sante = new fields.SchemaField({
      blessures: new fields.SchemaField(
        Object.keys(POLARIS.gravitesBlessure).reduce((acc, gravite) => {
          acc[gravite] = new fields.SchemaField(
            Object.keys(POLARIS.localisations).reduce((zones, localisation) => {
              zones[localisation] = new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: 0,
                min: 0,
                max: POLARIS.casesBlessure[gravite]?.[localisation] ?? 0
              });
              return zones;
            }, {})
          );
          return acc;
        }, {})
      ),

      // Coché lorsqu'une blessure de destruction touche une localisation fatale.
      mort: new fields.BooleanField({ required: true, initial: false })
    });

    schema.biographie = new fields.HTMLField({ required: false, blank: true });

    return schema;
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    this.#preparerAttributs();
    this.#preparerSecondaires();
    this.#preparerSante();
  }

  /**
   * Niveau actuel de chaque attribut (somme des composantes) puis aptitude
   * naturelle. Calculés plutôt que stockés : la table de conversion peut
   * changer, et les valeurs dérivées doivent toujours suivre la config courante.
   */
  #preparerAttributs() {
    for (const [cle, attribut] of Object.entries(this.attributs)) {
      attribut.actuel = POLARIS.composantesAttribut.reduce(
        (total, composante) => total + (attribut[composante] ?? 0),
        0
      );
      attribut.aptitude = POLARIS.aptitudeNaturelle(attribut.actuel);
      attribut.label = game.i18n.localize(POLARIS.attributs[cle].label);
      attribut.abbr = game.i18n.localize(POLARIS.attributs[cle].abbr);

      // Qualification en toutes lettres (insignifiant, moyen, surhumain…).
      const echelon = POLARIS.descriptionAttribut(attribut.actuel);
      attribut.qualite = echelon ? game.i18n.localize(echelon) : "";
    }
  }

  /**
   * Attributs secondaires.
   *
   * Trois étages successifs, dans cet ordre :
   *   1. la formule du livre (ou la valeur saisie, s'il n'en donne pas) ;
   *   2. la table de conversion propre à ce secondaire, s'il en a une ;
   *   3. le bonus ou la pénalité saisi sur la fiche.
   *
   * Les formules reçoivent les niveaux actuels d'attributs, et les TOTAUX des
   * secondaires déjà calculés : le seuil d'inconscience se déduit du seuil
   * d'étourdissement bonus compris. L'ordre de déclaration dans la config fait
   * donc foi — un secondaire ne peut dépendre que de ceux déclarés avant lui.
   */
  #preparerSecondaires() {
    const niveaux = Object.fromEntries(
      Object.entries(this.attributs).map(([cle, attribut]) => [cle, attribut.actuel])
    );

    const calcules = {};
    /** Totaux déjà connus, offerts aux formules suivantes. */
    const totaux = {};

    for (const [cle, definition] of Object.entries(POLARIS.attributsSecondaires)) {
      const stocke = this.secondaires[cle];
      const bonus = stocke.bonus ?? 0;

      const brute = definition.formule ? definition.formule(niveaux, totaux) : stocke.valeur;

      // Chaque secondaire a sa propre table de conversion — les résistances et
      // le modificateur de dommages ne suivent PAS celle des aptitudes
      // naturelles. Sans table renseignée, la valeur brute passe telle quelle.
      const converti = definition.table ? POLARIS.convertir(definition.table, brute) : brute;
      const tableManquante = Boolean(definition.table) && !POLARIS.tablesConversion[definition.table];

      const total = converti + bonus;
      totaux[cle] = total;

      calcules[cle] = {
        cle,
        brute,
        converti,
        bonus,
        total,
        derive: Boolean(definition.formule),
        // Signale à la fiche que la valeur affichée n'est pas encore convertie.
        tableManquante,
        groupe: definition.groupe ?? null,
        label: game.i18n.localize(definition.label),
        // Seul le Souffle s'exprime dans une unité (des tours de combat) ; les
        // autres secondaires sont des modificateurs sans dimension.
        unite: definition.unite ? game.i18n.localize(definition.unite) : ""
      };

      // Le total est reporté sur la donnée elle-même : les formules de jet et
      // l'initiative lisent `system.secondaires.<cle>.total`.
      stocke.total = total;
    }

    this.secondairesDetail = calcules;
  }

  /**
   * Dépouille la grille de blessures : malus, incapacité, protections portées.
   */
  #preparerSante() {
    const sante = this.sante;

    let cumule = 0;
    let pire = 0;
    let actionImpossible = false;
    const parLocalisation = {};

    for (const cle of Object.keys(POLARIS.localisations)) {
      parLocalisation[cle] = { cases: 0, malus: 0 };
    }

    for (const [gravite, zones] of Object.entries(sante.blessures)) {
      const definition = POLARIS.gravitesBlessure[gravite];

      for (const [localisation, cases] of Object.entries(zones)) {
        if (!cases) continue;

        // Une case peut porter un malus propre ; sinon celui de sa ligne s'applique.
        const malus = POLARIS.malusBlessure[gravite]?.[localisation] ?? definition.malus;

        cumule += malus * cases;
        pire = Math.min(pire, malus);
        if (definition.actionImpossible) actionImpossible = true;

        parLocalisation[localisation].cases += cases;
        parLocalisation[localisation].malus += malus * cases;
      }
    }

    sante.malusCumule = cumule;
    sante.malusPire = pire;
    sante.malus = POLARIS.cumulMalusBlessures ? cumule : pire;
    sante.actionImpossible = actionImpossible;
    sante.parLocalisation = parLocalisation;

    // Protection par zone, sommée sur les protections équipées.
    sante.protections = this.#protectionsPortees();

    for (const [cle, zone] of Object.entries(parLocalisation)) {
      zone.label = game.i18n.localize(POLARIS.localisations[cle].label);
    }
  }

  /**
   * Somme, zone par zone, les valeurs de protection des objets équipés.
   * @returns {Record<string, {protection: number, choc: number}>}
   */
  #protectionsPortees() {
    const total = {};
    for (const cle of Object.keys(POLARIS.localisations)) {
      total[cle] = { protection: 0, choc: 0 };
    }

    for (const item of this.parent?.items ?? []) {
      if (item.type !== "protection" || !item.system.equipe) continue;

      for (const cle of Object.keys(total)) {
        total[cle].protection += item.system.parLocalisation?.[cle]?.protection ?? 0;
        total[cle].choc += item.system.parLocalisation?.[cle]?.choc ?? 0;
      }
    }
    return total;
  }
}
