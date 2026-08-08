# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Système Foundry VTT v13 **non officiel** pour *Polaris, le Jeu de Rôle des
Profondeurs* (3e édition, Black Book Éditions).

**Tout s'écrit en français** : identifiants, commentaires, messages de commit,
interface. Les seules exceptions sont les API de Foundry et `lang/en.json`.

Le dépôt ne doit contenir **aucun texte de règle ni contenu protégé** —
uniquement de la structure de données et de l'interface.

## Commandes

```bash
node test/resolution.test.mjs   # mécanique de résolution
node test/feuille.test.mjs      # données transcrites du livre
```

Pas de gestionnaire de paquets, pas de dépendances, pas d'étape de compilation.
Les tests sont deux scripts Node autonomes qui sortent en code 1 si un cas
échoue. Pour n'en jouer qu'une partie, filtrer la sortie (`| grep ECHEC`) ou
commenter les blocs — il n'y a pas de sélecteur de cas.

Vérifier la syntaxe de tout le code :

```bash
for f in $(find module -name '*.mjs'); do node --check "$f"; done
```

Le dossier est relié à Foundry par une jonction de répertoire, donc un simple
F5 dans Foundry prend les modifications en compte :

```
%LOCALAPPDATA%\FoundryVTT\Data\systems\polaris-v3  →  E:\DEV\NewPolV3
```

## La règle cardinale

**Aucune valeur chiffrée hors de [module/config.mjs](module/config.mjs).** La
logique — jets, fiches, DataModels, assistant — n'en contient aucune. Corriger
une règle du livre doit rester une édition de données, jamais une modification
de code.

Ce n'est pas une préférence de style : le livre n'est transcrit que
partiellement, et beaucoup de valeurs actuelles sont provisoires. Chaque bloc de
config porte donc sa provenance :

| Mention | Sens |
|---|---|
| `Source : feuille officielle` | Lu sur la feuille de personnage PDF |
| `Source : livre de base` | Dicté par l'auteur du système |
| `⚠️ À VÉRIFIER` | Provisoire, non confirmé |
| `⚠️ CORRECTION SUPPOSÉE` | La source était incohérente, une lecture a été retenue |

Ne jamais retirer une de ces mentions sans une confirmation explicite de
l'utilisateur, et en ajouter une quand on invente une valeur faute de mieux.

[TODO.md](TODO.md) recense domaine par domaine ce qui manque, en distinguant les
données à saisir du code à écrire.

## Architecture

Le flux est à sens unique et il faut le préserver :

```
config.mjs  →  DataModels (data/)  →  fiches (sheets/) + templates
                     ↑
              documents/ (actions)      dice/ (moteur pur)
```

- **`data/`** — les schémas sont **générés** depuis la config. Ajouter un
  attribut, une localisation ou une gravité de blessure dans `config.mjs` le
  fait apparaître dans le schéma, sur la fiche et dans les jets, sans toucher à
  ces fichiers.
- **`dice/polaris-roll.mjs`** — `evaluerJet` et `lireLocalisation` sont des
  **fonctions pures**, sans dépendance à Foundry. C'est ce qui les rend
  testables en Node. Ne pas y introduire d'appel à `game`, `ui` ou `Roll`.
- **`documents/`** — actions déclenchables (jets, attaques). Les calculs vivent
  dans les DataModels, pas ici.
- **`sheets/`** — ApplicationV2 uniquement.

### Mécaniques non évidentes

**Résolution « en lecture directe ».** On lance 1d20 en visant le plus haut
possible **sans dépasser** ses chances. La marge est **le dé lui-même**, pas
l'écart à la cible. Tomber pile est un critique. Un 20 naturel est un échec
critique *sauf* si les chances atteignent 20.

**L'aptitude naturelle est signée.** Un attribut de 5 donne **−2**, pas 0. Un
personnage faible est activement pénalisé. Attention à tout code qui
retournerait 0 par défaut hors table : ce serait équivalent à un attribut de 8.

**La santé n'est pas une jauge de points.** C'est une grille de cases : les
dégâts désignent une gravité par leur seuil, le dé de localisation désigne une
colonne, on coche une case. D'où l'absence de `primaryTokenAttribute` dans
[system.json](system.json) — aucune valeur unique ne résume l'état d'un
personnage.

**Chaque attribut secondaire a sa propre table de conversion.** Les résistances
et le modificateur de dommages ne suivent **pas** `tableAptitudeNaturelle`, ni ne
se suivent entre eux. Un test existe pour empêcher qu'on les y rebranche par
commodité.

**Les secondaires se calculent en trois étages** : formule du livre → table de
conversion → bonus saisi. Une formule reçoit `(niveaux, totauxDejaCalcules)` :
le seuil d'inconscience se déduit du seuil d'étourdissement **bonus compris**,
donc l'ordre de déclaration dans la config fait foi.

**Le malus de blessure s'applique au jet, pas à la valeur affichée.** La fiche
continue de montrer la valeur de la feuille papier ; c'est `calculerChances` qui
retranche.

**L'ambiance de campagne** est un réglage de monde qui fixe à la fois la Chance
de tous les personnages et le budget de points de création.

## Pièges Foundry v13 rencontrés

Chacun a coûté un bug en production. Ils ne sont pas devinables.

- **Un « part » d'ApplicationV2 doit rendre UN SEUL élément racine.** Plusieurs
  frères échouent avec `must render a single HTML element`.
- **`changeTab` exige la classe `tabs`** sur le conteneur de navigation, et les
  boutons doivent en être **enfants directs** — le sélecteur interne est
  `.tabs > [data-group][data-tab]`.
- **`game.i18n` n'est pas chargé pendant le hook `init`.** Tout ce qui a besoin
  de traductions à l'enregistrement (les `choices` d'un réglage, par exemple)
  doit passer par le hook **`i18nInit`**. Foundry localise `name` et `hint` tout
  seul, mais pas le contenu de `choices`.
- **Foundry impose une hauteur fixe à tout `button`.** Un bouton dont le contenu
  s'empile sur deux lignes déborde : poser `height: auto` explicitement.
- **`loadTemplates` enregistre chaque partiel sous son chemin complet.** C'est ce
  qui permet le partiel dynamique `{{> (lookup . "templateEtape")}}` de
  l'assistant — mais chaque template d'étape doit être préchargé, sinon
  Handlebars ignore son nom.
- **Un contenu libre placé dans `<tbody>`** (un `<input type="hidden">` entre
  `</tr>` et la fin d'une boucle) est déplacé hors du tableau par le navigateur.
  Le mettre dans une cellule.
- **Les champs de formulaire n'héritent d'aucun style du système** : sans règle
  explicite, ils gardent l'habillage clair par défaut de Foundry.

## Tests

`test/feuille.test.mjs` **ne teste pas du code, il verrouille une
transcription**. Son rôle est qu'une modification de `config.mjs` s'écartant du
livre se signale immédiatement. Quand une valeur du livre est corrigée, corriger
le cas de test **en même temps** et noter la source retenue.

Plusieurs tests encodent des **invariants** plutôt que des valeurs : monotonie de
l'aptitude naturelle et du modificateur de dommages, couverture complète des
tables de localisation, ordre de déclaration des secondaires. Ce sont eux qui ont
révélé les incohérences des sources — ne pas les supprimer pour faire passer un
cas.

## Traductions

`lang/fr.json` et `lang/en.json` doivent rester **strictement synchronisés**.
Vérification :

```bash
node -e "
const fs=require('fs');
const fr=JSON.parse(fs.readFileSync('lang/fr.json','utf8'));
const en=JSON.parse(fs.readFileSync('lang/en.json','utf8'));
const d=[...Object.keys(fr).filter(k=>!(k in en)),...Object.keys(en).filter(k=>!(k in fr))];
console.log(d.length?'DESYNC: '+d.join(', '):'synchronisés ('+Object.keys(fr).length+')');
"
```

Les **chiffres restent dans la config**, jamais dans les traductions : composer
les libellés avec `game.i18n.format` et des paramètres.

## Environnement

Windows, Git Bash disponible en plus de PowerShell. **Piège de quoting** : les
apostrophes françaises cassent `node -e '…'` en Bash. Pour tout script contenant
du texte français, écrire un fichier `.mjs` dans le répertoire scratchpad et
l'exécuter, plutôt que de passer par `-e`.

Git signale une conversion LF → CRLF à chaque opération ; aucun `.gitattributes`
n'a été posé, l'utilisateur en a été informé et ne l'a pas demandé.

## Branches

- **`main`** — état vérifié dans Foundry. N'y pousser que ce qui a été constaté
  fonctionnel à l'écran.
- **`dev`** — travail en cours.

Ne commiter et ne pousser que sur demande explicite.

## Travailler avec l'auteur

Les données du livre arrivent **par petits lots dictés**, souvent en réponse à
une question. Elles contiennent parfois des coquilles : une table non monotone,
une borne manquante. **Les signaler avant d'implémenter**, proposer la lecture
cohérente, et marquer le résultat `⚠️ CORRECTION SUPPOSÉE` — c'est ainsi qu'a été
traitée la table du modificateur de dommages.

Quand une donnée manque, préférer un `null` explicite qui désactive la
contrainte et le dit à l'écran, plutôt qu'une valeur inventée. L'assistant de
création compte ainsi les points sans jamais les plafonner tant que le budget est
inconnu.
