import { POLARIS } from "../config.mjs";
import { calculerChances } from "../dice/polaris-roll.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Fenêtre de configuration d'un jet de compétence.
 *
 * Elle affiche les chances de base et laisse choisir une difficulté et un
 * modificateur libre. L'aperçu des chances finales se met à jour en direct,
 * ce qui évite au joueur de faire le calcul de tête.
 *
 * @param {object}  options
 * @param {Actor}   options.acteur
 * @param {string}  options.cleCompetence
 * @param {number}  [options.modificateurInitial=0]  Modificateur pré-rempli (bonus d'arme…).
 * @returns {Promise<{modificateur: number, libelleDifficulte: string}|null>}
 *          `null` si le joueur annule.
 */
export async function demanderJetCompetence({ acteur, cleCompetence, modificateurInitial = 0 }) {
  const definition = POLARIS.competences[cleCompetence];
  const { chances: chancesBase } = calculerChances(acteur, cleCompetence, 0);

  const contenu = await foundry.applications.handlebars.renderTemplate(
    `${POLARIS.TEMPLATES}/apps/roll-dialog.hbs`,
    {
      nomCompetence: game.i18n.localize(definition.label),
      chancesBase,
      modificateurInitial,
      difficultes: POLARIS.difficultes,
      difficulteParDefaut: POLARIS.difficulteParDefaut
    }
  );

  return DialogV2.wait({
    window: { title: game.i18n.format("POLARIS.Dialogue.titreJet", { competence: game.i18n.localize(definition.label) }) },
    classes: ["polaris", "polaris-dialogue-jet"],
    content: contenu,
    buttons: [
      {
        action: "lancer",
        label: "POLARIS.Dialogue.lancer",
        icon: "fa-solid fa-dice-d20",
        default: true,
        callback: (event, bouton) => {
          const donnees = new foundry.applications.ux.FormDataExtended(bouton.form).object;
          const cleDifficulte = donnees.difficulte;
          const modDifficulte = POLARIS.difficultes[cleDifficulte]?.mod ?? 0;
          const modLibre = Number(donnees.modificateur) || 0;

          return {
            modificateur: modDifficulte + modLibre,
            libelleDifficulte: game.i18n.localize(POLARIS.difficultes[cleDifficulte]?.label ?? "")
          };
        }
      },
      {
        action: "annuler",
        label: "POLARIS.Dialogue.annuler",
        icon: "fa-solid fa-xmark"
      }
    ],
    // Recalcule l'aperçu des chances dès qu'un champ change.
    render: (event, dialogue) => {
      const racine = dialogue.element;
      const apercu = racine.querySelector("[data-apercu-chances]");
      if (!apercu) return;

      const rafraichir = () => {
        const cleDifficulte = racine.querySelector("[name=difficulte]")?.value;
        const modDifficulte = POLARIS.difficultes[cleDifficulte]?.mod ?? 0;
        const modLibre = Number(racine.querySelector("[name=modificateur]")?.value) || 0;
        apercu.textContent = String(chancesBase + modDifficulte + modLibre);
      };

      racine.querySelectorAll("[name=difficulte], [name=modificateur]").forEach((champ) => {
        champ.addEventListener("change", rafraichir);
        champ.addEventListener("input", rafraichir);
      });
      rafraichir();
    },
    rejectClose: false
  });
}
