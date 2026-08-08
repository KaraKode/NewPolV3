# Polaris V3 — système Foundry VTT

Système **non officiel** pour *Polaris, le Jeu de Rôle des Profondeurs* (3e édition,
Black Book Editions), ciblant **Foundry VTT v13**.

Ce dépôt ne contient aucun texte de règle ni contenu protégé : uniquement de la
structure de données et de l'interface. Le livre de base reste indispensable.

---

## Démarrage

Le dossier est relié à Foundry par une jonction de répertoire :

```
%LOCALAPPDATA%\FoundryVTT\Data\systems\polaris-v3  →  E:\DEV\NewPolV3
```

On édite donc directement ici, et un simple rechargement de Foundry (F5) prend
les modifications en compte.

Pour la recréer si besoin, dans un terminal :

```
mklink /J "%LOCALAPPDATA%\FoundryVTT\Data\systems\polaris-v3" "E:\DEV\NewPolV3"
```

## Tests

Les mécaniques sont testables sans Foundry :

```
node test/resolution.test.mjs   mécanique de résolution
node test/feuille.test.mjs      données transcrites de la feuille officielle
```

Le second ne teste pas du code mais une **transcription** : son rôle est de
signaler toute modification de `config.mjs` qui s'écarterait de la feuille de
personnage papier.

---

## La mécanique de résolution

Dite « en lecture directe ». Elle est implémentée dans
[`module/dice/polaris-roll.mjs`](module/dice/polaris-roll.mjs) :

```
chances de réussite = valeur globale de la compétence + malus de blessure + modificateur
valeur globale      = aptitude naturelle(attribut 1) + aptitude naturelle(attribut 2) + maîtrise
```

On lance **1d20** en visant le résultat le plus haut possible **sans dépasser**
ces chances.

| Résultat | Issue |
|---|---|
| dé < chances | Réussite — la **marge est le dé lui-même**, pas l'écart |
| dé = chances | **Réussite critique** (marge + niveau de maîtrise) |
| dé > chances | Échec |
| 20 naturel, chances < 20 | **Échec critique** |
| 20 naturel, chances ≥ 20 | **Réussite critique** — plus d'échec critique possible |

La marge se convertit ensuite en modificateur par la table des marges
(1‑2 → ±0, 3‑4 → ±1, … 35+ → ±9).

---

## Ce qui vient de la feuille officielle

La feuille de personnage Polaris 3e édition (Black Book Éditions, 2016) a servi
de source pour :

- les neuf attributs et leur décomposition — niveau de base, modificateur de
  type génétique, modificateur de points de création, niveau actuel, puis
  **aptitude naturelle** ;
- les colonnes de compétence : **Attr. / Base / Maît. / Glob.** et les quatre
  marqueurs (limitative, progression naturelle, réservée, pré-requis) ;
- les attributs secondaires, dont quatre ont leur formule imprimée :
  Réaction = (ADA+PER)/2, Souffle et résistance aux drogues = (CON+VOL)/2,
  résistance aux maladies = CON ;
- l'initiative : ce n'est **pas un jet**, on démarre une piste graduée 0–25 à sa
  Réaction ;
- les **deux** tables de localisation, contact et distance, qui ne se
  superposent pas ;
- la grille de blessures : six gravités (seuils 5/10/15/20/25/30) × six
  localisations, avec le nombre de cases et les malus de chacune ;
- la table des marges de réussite et d'échec ;
- les colonnes d'armes de contact et de tir, et les quatre paliers de portée
  (+0 / −5 / −10 / −15).

Chaque bloc porte la mention `Source : feuille officielle` dans la config.

## Ce qu'il reste à faire

[`TODO.md`](TODO.md) recense, domaine de jeu par domaine de jeu, ce qui sépare
le système d'une partie jouable — en distinguant les données du livre à saisir
du code restant à écrire.

## Ce qui reste à confirmer dans le livre

Toutes les données chiffrées vivent dans **un seul fichier**,
[`module/config.mjs`](module/config.mjs). Les corriger ne demande de toucher à
aucune logique. Les points ouverts, par ordre d'importance :

### 1. Table des aptitudes naturelles — bloquant

C'est le cœur de tous les calculs, et la feuille ne le donne pas : elle imprime
la ligne « Aptitude naturelle » mais pas la table qui la produit. Tant qu'elle
n'est pas renseignée, une formule provisoire s'applique
(`aptitude = niveau actuel / 2`, arrondi à l'inférieur), un avertissement
s'affiche sur la fiche et un autre dans la console au démarrage.

```js
POLARIS.tableAptitudeNaturelle = { 0: 0, 3: 1, 6: 2, 9: 3, 12: 4, 15: 5, 18: 6 };
```

### 2. Liste des compétences — incomplète

La feuille laisse ses lignes de compétences vierges : elle ne permet pas de
reconstituer la liste. Douze compétences seulement sont présentes, et **leurs
couples d'attributs sont des suppositions**. Il faut la liste officielle, avec
pour chacune les deux attributs dont on additionne les aptitudes naturelles.

### 3. Divers

- Formules des secondaires que la feuille laisse sans parenthèses : seuils de
  choc, modificateur de dommages au contact, résistance aux dommages
- Arrondi des formules en /2 (l'inférieur est retenu)
- Cumul des malus de blessure : s'additionnent-ils, ou seul le pire compte ?
  (`POLARIS.cumulMalusBlessures`, actuellement `true`)
- Nombre de cases de bras sur la ligne « Mortelles », illisible à l'impression —
  la symétrie gauche/droite est supposée
- Catégories de compétences (regroupement d'affichage, absent de la feuille)
- Modificateurs de difficulté
- Valeurs et calcul des déplacements
- Liste des modes de tir
- Effet exact d'une réussite critique sur la marge

Tous ces blocs sont signalés par un commentaire `⚠️ À VÉRIFIER` dans la config.

---

## Structure

```
module/
  config.mjs              Toutes les données de règles
  polaris.mjs             Point d'entrée, enregistrements
  dice/polaris-roll.mjs   Résolution (evaluerJet et lireLocalisation sont purs)
  apps/roll-dialog.mjs    Fenêtre de configuration d'un jet
  data/                   DataModels, schémas générés depuis la config
  documents/              Classes Actor et Item
  sheets/                 Fiches ApplicationV2
templates/                Handlebars (acteur, item, chat, dialogue)
lang/                     fr.json, en.json
styles/polaris.css        Thème abyssal
test/                     Tests exécutables en Node pur
```

### Ajouter une compétence

Une entrée dans `POLARIS.competences` plus sa traduction dans `lang/fr.json` :
la fiche, les jets et les cartes de chat suivent automatiquement.

```js
pilotage: {
  label: "POLARIS.Competence.pilotage",
  attributs: ["coo", "per"],
  categorie: "technique",
  marqueurs: ["progressionNaturelle"]   // optionnel
}
```

### La santé

Il n'y a pas de jauge de points de vie : les dégâts encaissés désignent une
**gravité** par leur seuil, et le dé de localisation une **colonne**. On coche
une case à l'intersection. Le malus qui en découle s'applique à tous les jets,
et c'est `calculerChances` qui l'ajoute — la fiche, elle, continue d'afficher la
valeur de la feuille papier.

C'est aussi pourquoi le système ne déclare pas de `primaryTokenAttribute` :
aucune valeur unique ne résume l'état de santé d'un personnage.
