import { lancerCompetence } from "../dice/polaris-roll.mjs";
import { demanderJetCompetence } from "../apps/roll-dialog.mjs";

/**
 * Document Acteur du système Polaris.
 *
 * Les calculs vivent dans les DataModels ; cette classe n'expose que les actions
 * déclenchables depuis la fiche, le chat ou une macro.
 */
export class PolarisActor extends Actor {
  /**
   * Jet de compétence. Ouvre la fenêtre de configuration, sauf si l'appelant
   * demande explicitement un jet direct (raccourci clavier, macro).
   *
   * @param {string} cleCompetence      Clé dans POLARIS.competences.
   * @param {object} [options]
   * @param {boolean} [options.direct=false]  Lance sans passer par la fenêtre.
   * @param {number}  [options.modificateur=0]
   * @returns {Promise<object|null>}
   */
  async jetCompetence(cleCompetence, { direct = false, modificateur = 0 } = {}) {
    if (direct) {
      return lancerCompetence({ acteur: this, cleCompetence, modificateur });
    }

    const choix = await demanderJetCompetence({
      acteur: this,
      cleCompetence,
      modificateurInitial: modificateur
    });
    if (!choix) return null;

    return lancerCompetence({
      acteur: this,
      cleCompetence,
      modificateur: choix.modificateur,
      libelleDifficulte: choix.libelleDifficulte
    });
  }

  /**
   * Données exposées aux formules de jet.
   *
   * Chaque attribut est accessible par son abréviation (`@for`) et rend son
   * NIVEAU ACTUEL, puisque c'est sur lui que la feuille officielle fonde ses
   * formules ; son aptitude naturelle vit sous `@aptitudes.for`. Les attributs
   * secondaires sont exposés à plat (`@reaction`), ce dont se sert la formule
   * d'initiative.
   */
  getRollData() {
    const donnees = { ...super.getRollData() };

    donnees.aptitudes = {};
    for (const [cle, attribut] of Object.entries(this.system.attributs ?? {})) {
      donnees[cle] = attribut.actuel;
      donnees.aptitudes[cle] = attribut.aptitude;
    }

    // Les secondaires sont exposés par leur TOTAL, bonus compris : c'est la
    // valeur qui compte en jeu, et celle dont dépend la formule d'initiative.
    for (const [cle, secondaire] of Object.entries(this.system.secondaires ?? {})) {
      donnees[cle] = secondaire.total ?? secondaire.valeur ?? 0;
    }
    return donnees;
  }
}
