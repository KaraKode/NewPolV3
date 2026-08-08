import { POLARIS } from "../config.mjs";

/**
 * Document Item du système Polaris.
 */
export class PolarisItem extends Item {
  /**
   * Attaque avec cette arme : délègue le jet à l'acteur porteur en injectant le
   * modificateur de l'arme.
   * @returns {Promise<object|null>}
   */
  async attaquer() {
    if (this.type !== "arme") return null;

    if (!this.actor) {
      ui.notifications.warn(game.i18n.localize("POLARIS.Avertissement.armeSansPorteur"));
      return null;
    }

    const cleCompetence = this.system.competence;
    if (!POLARIS.competences[cleCompetence]) {
      ui.notifications.error(
        game.i18n.format("POLARIS.Avertissement.competenceInconnue", { cle: cleCompetence })
      );
      return null;
    }

    return this.actor.jetCompetence(cleCompetence, { modificateur: this.system.modificateur ?? 0 });
  }

  /**
   * Publie la description de l'objet dans le chat.
   */
  async afficherDansChat() {
    const contenu = await foundry.applications.handlebars.renderTemplate(
      `${POLARIS.TEMPLATES}/chat/item.hbs`,
      { item: this, system: this.system }
    );

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: contenu
    });
  }
}
