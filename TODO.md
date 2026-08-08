# Ce qu'il manque pour que le jeu tourne

État au 8 août 2026. Ce document recense ce qui sépare le système d'une partie
réellement jouable. Il est organisé par domaine de jeu, pas par fichier.

## Comment le lire

| Marque | Sens |
|---|---|
| ✅ | Fait et vérifié par des tests |
| 🟡 | Partiel — la structure existe, le comportement manque |
| ❌ | Absent |
| 📖 | Bloqué par une donnée du livre, pas par du code |
| ⚠️ | Fait, mais sur une **supposition** à confirmer |

Deux natures de tâches se mélangent dans ce document, et il ne faut pas les
confondre :

- **📖 Saisir une donnée** — une édition de [module/config.mjs](module/config.mjs),
  sans toucher à la logique. C'est du recopiage depuis le livre.
- **Écrire du code** — de la vraie implémentation.

La règle qui a guidé le système jusqu'ici tient toujours : *aucune valeur
chiffrée hors de la config*. Toute tâche 📖 doit rester une tâche 📖.

---

## 0. Le préalable à tout : rien n'a jamais tourné dans Foundry

**Priorité absolue, avant toute nouvelle fonctionnalité.**

Le code n'a jamais été exécuté dans Foundry. Il est vérifié par 100+ tests Node,
sa syntaxe est valide, ses 288 clés de traduction sont synchronisées et
complètes — mais **aucune fiche n'a jamais été rendue à l'écran**.

- [X] Lancer Foundry, créer un personnage, ouvrir sa fiche, parcourir les cinq
      onglets
- [X] Vérifier le rendu du partiel dynamique de l'assistant
      (`{{> (lookup . "templateEtape")}}` dans
      [templates/apps/creation/wizard.hbs](templates/apps/creation/wizard.hbs)) —
      **c'est le point le plus fragile de tout le système** : si les étapes
      s'affichent vides, c'est là qu'il faut regarder
- [X] Vérifier que le bouton « Créer un personnage » apparaît bien dans l'onglet
      Acteurs (le sélecteur `.header-actions` de la barre latérale V13 est une
      supposition, voir [module/polaris.mjs](module/polaris.mjs))
- [X] Créer un personnage de bout en bout par l'assistant et contrôler les
      données écrites

Tant que ce point n'est pas franchi, tout ce qui suit s'ajoute à une base non
vérifiée.

### Migration des données

Le schéma a **changé en profondeur** depuis la version 0.1.0 : la santé est
passée d'une jauge de points de vie à une grille de blessures, les attributs
d'une valeur unique à trois composantes, et `torse` s'appelle désormais `corps`.

- [ ] ❌ Écrire une migration, ou décider explicitement d'abandonner les
      personnages créés sous 0.1.0. Un acteur existant ne s'ouvrira pas
      correctement sans elle.
- [ ] ❌ Poser un numéro de version de schéma pour rendre les futures migrations
      possibles

---

## 1. Création de personnage

L'assistant existe : cinq étapes, navigation, validation, budgets, création de
l'acteur et de ses traits. Voir
[module/apps/creation-wizard.mjs](module/apps/creation-wizard.mjs).

### Données manquantes

- [ ] 📖 **Répartition automatique des 8 archétypes** — champ `repartition`,
      encore `null` pour les huit. Format attendu :
      `{ for: 12, con: 10, coo: 14, … }`
- [ ] 📖 **Les 3 types génétiques payants** : `cout` en PC, `modificateurs`
      d'attributs, `avantages` et `desavantages` accordés. Seul l'humain normal
      est renseigné (gratuit).
- [ ] 📖 **Budget des capacités spéciales**
- [ ] 📖 **Budget d'expérience préliminaire** et barème des métiers
- [ ] 📖 **Budgets d'avantages et de désavantages** (deux enveloppes distinctes)
- [ ] 📖 **Liste des métiers**
- [ ] 📖 **Listes des avantages et désavantages** avec leur coût

Tant qu'un budget vaut `null`, l'assistant compte la dépense sans jamais
l'interdire, et l'affiche comme « budget non renseigné ». C'est volontaire :
inventer un plafond serait pire que ne pas en avoir.

### Suppositions à confirmer

- [ ] ⚠️ **Les types génétiques puisent dans la même bourse que les attributs.**
      Déduction de « les types génétiques coûtent des PC ». Si c'est une
      enveloppe séparée, c'est une ligne à changer dans `#budgets()`.
- [ ] ⚠️ **La Chance est le 9e attribut exclu de la répartition** (« répartir
      dans les 8 attributs »)
- [ ] ⚠️ **Bornes de la table des aptitudes** : sous 3 et au-dessus de 25, on
      borne sur l'extrémité (−4 / +6). « 25 = 6 » est-il un palier fermé ou
      ouvert vers le haut ?
- [ ] ⚠️ **« Très faible » couvre 3 à 5** — la source disait « 3- », et 5 est la
      seule valeur qui ferme le trou avant « faible » à 6

### Code à écrire

- [ ] ❌ **Articuler l'archétype et la répartition libre.** Une première réponse
      indiquait « points à répartir **ou** archétype, soit l'un soit l'autre »,
      mais l'archétype a ensuite été décrit comme un lot qui *abonde* les
      enveloppes. Il est actuellement traité comme un raccourci facultatif en
      tête de l'étape 1. À trancher.
- [ ] ❌ Étape d'équipement de départ, si le livre en prévoit un
- [ ] ❌ Reprendre une création interrompue (l'assistant perd tout à la fermeture)
- [ ] ❌ Créer un PNJ par l'assistant (aujourd'hui réservé aux personnages joueurs)

---

## 2. Objets : ajout, suppression, inventaire

Le socle existe — créer, éditer, supprimer et utiliser un objet fonctionne
depuis l'onglet Équipement.

### Défauts confirmés

- [ ] ❌ **Le glisser-déposer ne marche pas.** `dragDrop` est déclaré dans
      `DEFAULT_OPTIONS` de [module/sheets/actor-sheet.mjs](module/sheets/actor-sheet.mjs)
      mais **aucun `_onDrop` n'est implémenté** : déposer un objet sur une fiche
      ne fait rien. Il faut écrire `_onDrop`, `_onDragStart` et `_canDragDrop`.
- [ ] ❌ **Impossible d'équiper depuis la fiche d'acteur.** Le champ `equipe`
      n'est modifiable que sur la fiche de l'objet. Or la protection portée n'est
      sommée que pour les objets équipés : c'est un aller-retour permanent en
      cours de partie. Ajouter une bascule dans l'onglet Équipement.
- [ ] ❌ Modifier la quantité directement dans la liste
- [ ] ❌ Aucun total d'encombrement, ni seuil de surcharge 📖

### Contenu

- [ ] 📖 **Aucun compendium n'existe** (`"packs": []` dans
      [system.json](system.json)). Il faut des compendiums d'armes, de
      protections, d'équipement, de traits et de capacités spéciales — sans quoi
      chaque table ressaisit tout le matériel à la main.
- [ ] 📖 Statistiques des armes du livre (les colonnes existent, les valeurs non)
- [ ] 📖 Statistiques des protections
- [ ] 📖 Barème d'ITG (la colonne est là, son usage n'est pas défini)

---

## 3. Jets de dés et résolution

**Le point le plus solide du système.** La mécanique de lecture directe est
implémentée en fonction pure et couverte par des tests :
[module/dice/polaris-roll.mjs](module/dice/polaris-roll.mjs).

- ✅ Réussite, échec, réussite critique, échec critique
- ✅ Marge = le dé lui-même
- ✅ 20 naturel : échec critique, sauf chances ≥ 20
- ✅ Table des marges (1‑2 → ±0 … 35+ → ±9)
- ✅ Fenêtre de configuration avec difficulté et modificateur libre
- ✅ Carte de chat détaillant le calcul

### Ce qui manque

- [ ] 📖 **Les modificateurs de difficulté ne sont pas confirmés.** Les valeurs
      actuelles (+6 à −9) sont calquées sur l'échelle de la table des marges,
      faute de mieux.
- [ ] ❌ **La marge ne sert à rien.** Elle est calculée, convertie en
      modificateur et affichée — mais rien ne la consomme. À quoi sert-elle
      concrètement (dégâts ? action suivante ? qualité du résultat ?) 📖
- [ ] 📖 **Effet exact d'une réussite critique.** Le code ajoute le niveau de
      maîtrise à la marge, ce qui reste à confirmer.
- [ ] ❌ Effet mécanique d'un échec critique (aucun aujourd'hui)
- [ ] ❌ Relancer un jet, ou l'appliquer à plusieurs personnages

---

## 4. Attributs et compétences

### Attributs

- ✅ Trois composantes, niveau actuel, aptitude naturelle **signée**
- ✅ Table des aptitudes du livre (3 → −4 … 25 → +6), 23 cas testés
- ✅ Échelle qualitative (insignifiant → surhumain)
- ✅ Chance fixée par l'ambiance de campagne (11 / 13 / 15)

- [ ] ❌ **Le jet d'attribut seul est factice.** `#surJetAttribut` dans
      [module/sheets/actor-sheet.mjs](module/sheets/actor-sheet.mjs) lance un
      d20 et affiche le résultat — **sans cible, sans réussite ni échec**. C'est
      un jet décoratif.
- [ ] 📖 **Comment teste-t-on un attribut seul ?** Contre son niveau actuel ?
      Contre le double de son aptitude ? La règle manque, et c'est elle qui
      débloque le point précédent.

### Compétences

- ✅ Colonnes Base / Maît. / Glob. conformes à la feuille
- ✅ Distinction générique / spéciale, les spéciales invisibles si non acquises
- ✅ Malus de blessure appliqué au jet, pas à la valeur affichée

- [ ] 📖 **La liste des compétences est fausse.** Les douze entrées actuelles
      sont un squelette, et **leurs couples d'attributs sont des suppositions**.
      C'est le deuxième blocage du système après les budgets.
- [ ] 📖 Lesquelles sont génériques, lesquelles sont spéciales
- [ ] 📖 Marqueurs réels de chaque compétence (limitative, PN, réservée,
      pré-requis) — le mécanisme existe, les données non
- [ ] 📖 Effet mécanique de chaque marqueur (aucun n'est implémenté : ce sont
      pour l'instant de simples étiquettes)
- [ ] 📖 Catégories réelles (les cinq actuelles sont un confort d'affichage
      inventé, absent de la feuille)
- [ ] ❌ Acquérir une compétence spéciale depuis la fiche, hors création
- [ ] ❌ Spécialisations : le champ existe, il n'a aucun effet sur les jets
- [ ] ❌ Progression : gagner de l'expérience et monter une compétence en jeu 📖

---

## 5. Tests d'opposition

**❌ Entièrement absent.** Rien n'existe aujourd'hui.

- [ ] 📖 **Règle d'opposition.** Comment deux jets se comparent-ils ? Les deux
      camps lancent et on compare les marges ? Un seul lance contre une
      difficulté dérivée de l'adversaire ? En cas d'égalité ?
- [ ] ❌ `lancerOpposition({ attaquant, defenseur, competences })`
- [ ] ❌ Carte de chat comparant les deux résultats
- [ ] ❌ Déclenchement depuis une fiche vers une cible sélectionnée
- [ ] ❌ Cas particulier de l'esquive et de la parade en combat (dépend de la
      règle générale)

---

## 6. La Chance

**❌ Entièrement absente en tant que mécanique.** L'attribut existe et sa valeur
est fixée par l'ambiance, mais **rien ne permet de s'en servir**.

- [ ] 📖 **À quoi sert la Chance ?** Se dépense-t-elle en points ? Est-ce un
      attribut comme les autres, testé au d20 ? Permet-elle de relancer,
      d'améliorer une marge, d'annuler un échec critique ?
- [ ] 📖 Se régénère-t-elle, et à quel rythme ?
- [ ] ❌ Stocker les points de Chance dépensés, si c'est une ressource
- [ ] ❌ Bouton de dépense, dans la fenêtre de jet ou sur la carte de chat
- [ ] ❌ Effet sur un jet déjà lancé (relance, modification de marge…)

C'est l'un des rares points où **aucune ligne de code n'est écrite** : tout
dépend de la règle.

---

## 7. Système de combat

Aujourd'hui, attaquer avec une arme lance un jet de compétence. **C'est tout.**
La chaîne s'arrête là.

### La boucle manquante

- [ ] ❌ **Jet de dégâts.** Le champ `degats` de l'arme contient une formule
      (« 1d6+2 ») que **personne ne lance jamais**.
- [ ] ❌ **Localisation en jeu.** `lancerLocalisation` existe et choisit la bonne
      table selon l'arme (contact ou distance), mais **n'est appelée nulle part**.
- [ ] ❌ **Application de la protection.** La protection par zone est calculée
      depuis les objets équipés, et jamais soustraite.
- [ ] ❌ **Pénétration.** Le champ existe sur l'arme, sans usage. 📖 Comment
      interagit-elle avec la protection : soustraction, division, seuil ?
- [ ] ❌ **Cocher la blessure.** Le résultat ne remplit pas la grille de santé.
- [ ] ❌ **Le choc.** Ni celui de l'arme, ni celui absorbé par la protection, ni
      les seuils d'étourdissement et d'inconscience — dont les formules manquent 📖.

Concrètement : `PolarisItem#attaquer()` dans
[module/documents/item.mjs](module/documents/item.mjs) doit devenir une chaîne
complète, et non un simple jet de compétence.

### Initiative

- [ ] ⚠️ **`CONFIG.Combat.initiative` vaut `@reaction`**, ce qui donne le bon
      nombre de départ. Mais la feuille montre une **piste graduée 0 à 25**, pas
      un ordre de tour classique. Foundry ne sait faire que du tour par tour :
      il faudra soit accepter l'approximation, soit écrire un vrai suivi de piste.
- [ ] 📖 Comment progresse-t-on sur la piste ? Les actions coûtent-elles des
      crans ? L'initiative de l'arme (`system.initiative`) s'y ajoute-t-elle ?
- [ ] ❌ Interface de suivi de la piste

### Divers

- [ ] 📖 Modificateur de portée : les quatre paliers (+0/−5/−10/−15) sont en
      config, mais rien ne les applique au jet
- [ ] 📖 Modes de tir (les trois actuels sont inventés) et leurs effets
- [ ] ❌ Consommation des munitions
- [ ] 📖 Effet de la force minimale de l'arme quand elle n'est pas atteinte
- [ ] 📖 Allonge : effet mécanique
- [x] ✅ Modificateur de dommages au contact — table lue sur la Force, de −4 à
      +5 puis +1 tous les 2 niveaux au-delà de 21. Reste à **l'appliquer** aux
      dégâts, ce que rien ne fait encore (voir la boucle manquante ci-dessus).
- [ ] ⚠️ **Deux tranches du modificateur de dommages sont une correction
      supposée.** La source donnait « 1-2 = −1, 3-4 = −4 », ce qui n'est pas
      monotone ; elles sont lues −4 et −3. À confirmer dans le livre.
- [ ] ❌ Manœuvres de combat (charge, viser, tir de couverture…) 📖

---

## 8. État de santé

La structure est **la partie la plus fidèle au livre** de tout le système :
grille de six gravités × six localisations, seuils, malus par case, cases
fatales. Voir [module/data/base-actor.mjs](module/data/base-actor.mjs).

- ✅ Grille conforme à la feuille officielle
- ✅ Malus calculé, cumulé et « pire », appliqué aux jets
- ✅ Protection sommée depuis les objets équipés
- ✅ Cases cliquables sur l'onglet Santé

### Ce qui manque

- [ ] 📖 **Les malus de blessure se cumulent-ils ?** Le réglage
      `POLARIS.cumulMalusBlessures` vaut `true` (cumul), mais la feuille ne le
      dit pas. Les deux lectures sont calculées et affichées côte à côte en
      attendant la réponse. **Cette question change tous les chiffres en jeu.**
- [ ] ⚠️ Nombre de cases de bras sur la ligne « Mortelles » — illisible à
      l'impression, la symétrie gauche/droite est supposée
- [ ] ❌ **Aucun soin.** Rien ne décoche une case. Pas de guérison naturelle, pas
      de premiers secours, pas de repos. 📖 Quel est le rythme de récupération ?
- [ ] ❌ **La mort n'est pas gérée.** Le drapeau `sante.mort` existe et
      s'affiche, mais rien ne le déclenche — une blessure de destruction à la
      tête devrait le poser automatiquement.
- [ ] ❌ Aucun état appliqué au jeton (étourdi, inconscient, mort)
- [ ] ❌ Le malus n'existe pas comme Active Effect : il est ajouté à la main dans
      `calculerChances`, donc invisible pour tout module tiers
- [ ] 📖 Séquelles : le champ de notes existe, la mécanique non
- [x] ✅ Formules des seuils d'étourdissement et d'inconscience —
      `(FOR+CON+VOL)/3`, puis `+10` sur le seuil **modifié**
- [x] ✅ **Table de conversion de la résistance aux dommages** — lue sur
      `FOR + CON`, de +6 à −5 puis −1 tous les 4 niveaux au-delà de 41
- [x] ✅ **Table de conversion des résistances naturelles** — de +6 à −5 puis
      −1 tous les 2 niveaux au-delà de 21. Poison, maladie et radiations lisent
      la Constitution seule ; les drogues `(CON+VOL)/2`
- [ ] ⚠️ **`FOR + CON` est une lecture, pas une certitude.** La source dit « la
      Force et la Constitution » sans préciser l'opération ; la somme est
      retenue parce que les tranches montent jusqu'à 42, hors d'atteinte d'une
      moyenne.
- [ ] ⚠️ La tranche `22-25` de la résistance aux dommages est une reconstitution
      (la source donnait « -25 » sans borne basse, et toutes les tranches font
      quatre niveaux)

**Les huit attributs secondaires ont désormais tous leur formule et leur table.**
Le mécanisme `tableManquante` reste en place pour signaler toute future table
non renseignée.

---

## 9. Effets Polaris

**❌ Entièrement absent.** Le mot « Polaris » n'existe dans le système que comme
un genre de trait parmi quatre, sans la moindre mécanique.

- [ ] 📖 **Qu'est-ce qu'un effet Polaris ?** Un pouvoir ? Une mutation ? Une
      corruption ? La question est ouverte de bout en bout.
- [ ] 📖 Se déclenche-t-il sur un jet ? Coûte-t-il une ressource ?
- [ ] 📖 Y a-t-il un compteur de Polaris sur le personnage ? La feuille officielle
      regroupe « Avantages/désavantages, mutations et Polaris » dans un même
      cadre, ce qui suggère une nature proche des traits — mais ne dit rien de
      plus.
- [ ] ❌ Type d'Item dédié, ou extension du trait existant
- [ ] ❌ Mécanique de déclenchement et effets sur les jets
- [ ] ❌ Compendium des effets Polaris

C'est le domaine **le plus vierge** du projet : ni données, ni structure, ni
décision d'architecture.

---

## 10. Infrastructure

- [ ] ❌ Aucun compendium (`packs: []`)
- [ ] ❌ Aucune migration de schéma (voir § 0)
- [ ] ❌ Les tests sont un harnais maison (`console.log` + code de sortie), sans
      framework ni exécution automatique
- [ ] ❌ Rien ne teste les DataModels ni les fiches — seulement les fonctions
      pures et les données de config
- [ ] ❌ Pas de dépôt Git initialisé
- [ ] ❌ Aucune macro fournie (jet rapide, application de dégâts…)
- [ ] ❌ Pas de fiche de PNJ simplifiée : le PNJ hérite du personnage complet,
      ce qui est lourd pour un figurant

---

## Ordre suggéré

**1. Débloquer l'existant** — sans ça, tout le reste s'empile sur du sable.

1. Lancer dans Foundry et corriger ce qui casse (§ 0)
2. Saisir la liste réelle des compétences et leurs couples d'attributs (§ 4) —
   c'est le dernier grand blocage de données du cœur du système
3. Saisir les budgets de création (§ 1)

**2. Rendre une partie possible** — après quoi on peut jouer une scène.

4. Réparer le jet d'attribut seul (§ 4)
5. Écrire la boucle de combat complète (§ 7) : dégâts → localisation →
   protection → blessure
6. Trancher le cumul des malus de blessure (§ 8)
7. Ajouter la bascule « équipé » et le glisser-déposer (§ 2)

**3. Compléter les règles.**

8. Tests d'opposition (§ 5)
9. La Chance (§ 6)
10. Soins et états de santé (§ 8)
11. Effets Polaris (§ 9)

**4. Confort.**

12. Compendiums (§ 2)
13. Migration (§ 0)
14. Suivi de la piste d'initiative (§ 7)

---

## Récapitulatif des données du livre attendues

Une seule liste, pour une session de saisie. Tout va dans
[module/config.mjs](module/config.mjs).

| Donnée | Bloque | Emplacement |
|---|---|---|
| Liste des compétences + couples d'attributs | Tout le système | `POLARIS.competences` |
| Nature générique / spéciale de chaque compétence | Création, fiche | `speciale` |
| Budget capacités spéciales | Création | `creation.points.capacitesSpeciales` |
| Budget expérience préliminaire | Création | `creation.points.experiencePreliminaire` |
| Budgets avantages / désavantages | Création | `creation.points.*` |
| Répartition des 8 archétypes | Création | `creation.archetypes[…].repartition` |
| Coût + modificateurs des 3 types génétiques | Création | `creation.typesGenetiques[…]` |
| Table des résistances naturelles | Fiche, santé | `tablesConversion.resistancesNaturelles` |
| Table de résistance aux dommages | Combat | `tablesConversion.resistanceDommages` |
| Table du modificateur de dommages | Combat | `tablesConversion.modifDommages` |
| Formules des seuils de choc | Combat | `attributsSecondaires.seuil*` |
| Cumul ou non des malus de blessure | Tous les jets | `cumulMalusBlessures` |
| Modificateurs de difficulté | Jets | `difficultes` |
| Règle du test d'attribut seul | Jets | — |
| Règle d'opposition | Combat, social | — |
| Règle de la Chance | Tout | — |
| Règle des effets Polaris | Tout | — |
| Statistiques des armes et protections | Combat | Compendiums |
| Interaction pénétration / protection | Combat | — |
| Rythme de récupération des blessures | Santé | — |
