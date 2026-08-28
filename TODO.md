# Ce qu'il manque pour que le jeu tourne

État au 28 août 2026. Ce document recense ce qui sépare le système d'une partie
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

- **📖 Saisir une donnée** — une édition de [module/config.mjs](module/config.mjs)
  ou d'un fichier de `data/`, sans toucher à la logique. C'est du recopiage.
- **Écrire du code** — de la vraie implémentation.

La règle qui a guidé le système jusqu'ici tient toujours : *aucune valeur
chiffrée hors de la config*. Toute tâche 📖 doit rester une tâche 📖.

---

## Les compétences : transcrites et instanciées

**Le blocage qui commandait tout le reste est levé.** Les 83 compétences de la
table page 184 sont déclarées avec leurs couples d'attributs, leurs onze
catégories et leurs marqueurs. Seize familles ont ensuite été instanciées
d'après les descriptions, portant le catalogue à **213 compétences**.

- [x] ✅ **83 compétences** de la table page 184, avec leurs couples d'attributs
- [x] ✅ Le « (-3) » du livre est un **niveau de maîtrise de départ**, comme les
      compétences réservées `(X)` une fois apprises
- [x] ✅ **Seize familles instanciées** : sciences (21), langues étrangères (15),
      connaissance des nations (14), langages spécifiques (12), génie technique
      (9), pilotage (8), commerce (7), mécanique (6), art/artisanat (5), armes
      spéciales contact (5) et tir (3), langues anciennes (4), manœuvre
      d'armures (4), milieux (4), tactique (4), expression artistique (4), arts
      martiaux (3), langage des signes (2)
- [x] ✅ **Graphe de pré-requis complet et cohérent** — plus aucune référence
      dans le vide, aucun cycle. Nanotechnologie exige Physique/Chimie 10, qui
      exige Éducation 10.
- [x] ✅ **Filtrage de la fiche** — abstraites, spéciales et réservées restent
      invisibles. Sur 213 compétences, 79 sont visibles d'office et 119 doivent
      être apprises. Sans ce filtre, chaque fiche listerait les 33 langues et
      les 21 sciences.

### Ce qu'il reste

Deux familles restent vides, à dessein : `controleMutations` est peuplée par le
catalogue des capacités spéciales, et `pouvoirsEffetPolaris` renvoie au chapitre
Effet Polaris page 248, non transcrit.

- [ ] ❌ **Effet mécanique des marqueurs.** Une compétence limitative doit
      plafonner celle qu'elle limite, un pré-requis bloquer l'achat, une
      compétence à progression naturelle gagner un niveau par année passée dans
      la communauté (jusqu'à +5). Aujourd'hui, ce sont des étiquettes.
- [ ] ❌ Saisir une spécialisation sur la fiche : le champ existe et s'affiche,
      aucun `input` ne le renseigne
- [ ] ❌ **La règle de la langue racine n'est pas appliquée.** `divisionLangueRacine`
      est posé — comprendre une langue dérivée à la moitié du niveau de sa racine
      — mais rien ne s'en sert : il faudrait que le jet sache quelle langue est
      visée.
- [ ] ❌ **Le niveau des Connaissances de nations dépend du personnage** : +3
      pour sa communauté d'origine, 0 pour une connue, -3 pour une lointaine.
      La règle est en config, rien ne l'applique.
- [ ] 📖 Attributs des cinq armes spéciales de contact — le livre s'en remet au
      meneur (« selon l'arme, FOR/COO ou COO/COO la plupart du temps »)
- [ ] 📖 Pré-requis de la Criminalistique : « selon la technique employée »
- [ ] 📖 Pouvoirs liés à l'Effet Polaris, chapitre page 248

---

## 1. Création de personnage

L'assistant couvre les cinq étapes du livre. Voir
[module/apps/creation-wizard.mjs](module/apps/creation-wizard.mjs).

### Ce qui fonctionne

- ✅ Les cinq étapes : capacités de base, type génétique, capacités spéciales,
      expérience préliminaire, avantages et désavantages
- ✅ Achat des attributs : départ à 7, barème 1 / 2 / 3 appliqué par des boutons
      pour qu'on ne puisse pas sauter une tranche
- ✅ Ambiance de campagne : fixe la Chance et le budget de PC (30 / 38 / 46)
- ✅ Les quatre types génétiques, leurs modificateurs, leur coût, le plancher de
      Présence du techno-hybride
- ✅ Catalogue de **46 capacités spéciales**, dont 11 procurant une compétence
- ✅ Tirage d'une mutation au 1D100, avec sous-tables et relances. Un avantage
      tiré au sort est gratuit, comme le veut la note de la table
- ✅ Âges : apprentissage à 12 ans, métier à partir de 16, départ à 17 ans ou
      14 + 1D4 au choix
- ✅ Origines géographiques : choix ou tirage au 1D10
- ✅ Rien n'est écrit dans le monde avant validation finale

### Données manquantes

- [ ] 📖 **Répartition automatique des 8 archétypes** — les huit `repartition`
      valent encore `null`
- [ ] 📖 **Origines sociales** — section vide dans `data/origines.json`
- [ ] 📖 **Formations de base** — section vide
- [ ] 📖 **Études supérieures** — rien du tout
- [ ] 📖 **Ce qu'achète une année d'apprentissage.** Le nombre d'années est
      calculé et affiché, mais rien ne dit combien de niveaux il donne. Les
      métiers ont pour l'instant un coût saisi à la main, sans lien avec l'âge.
- [ ] 📖 Budgets restants : expérience préliminaire, avantages, désavantages
- [ ] 📖 Liste des métiers, des avantages et des désavantages
- [ ] 📖 Coût réel de l'Avantage Polaris (5 PC, chiffre coupé sur la photo)
- [ ] 📖 Description de la mutation Autofécondation
- [ ] 📖 Détail des caractères animaux félin et canin

### Suppositions à confirmer

- [ ] ⚠️ **La somme `FOR + CON`** pour la résistance aux dommages — la source dit
      « la Force et la Constitution » sans préciser l'opération
- [ ] ⚠️ La tranche `22-25` de cette même table, reconstituée sur la régularité
      des autres (toutes font quatre niveaux)
- [ ] ⚠️ **Bornes de la table des aptitudes** : sous 3 et au-dessus de 25, on
      borne sur l'extrémité (−4 / +6)
- [ ] ⚠️ « Très faible » couvre 3 à 5 — la source disait « 3- »
- [ ] ⚠️ Cases de bras sur la ligne « Mortelles », illisibles à l'impression
- [ ] ⚠️ Arrondi des formules en /2 et /3 : l'inférieur est retenu

### Code à écrire

- [ ] ❌ **Articuler l'archétype et la répartition libre.** L'archétype est
      traité comme un raccourci facultatif ; reste à trancher s'il exclut la
      répartition libre ou s'y ajoute.
- [ ] ❌ Faire choisir les alternatives d'origine (« Aquaculture **ou**
      Mécanique ») : le choix est stocké et affiché, pas encore proposé
- [ ] ❌ Reprendre une création interrompue — l'assistant perd tout à la fermeture
- [ ] ❌ Créer un PNJ par l'assistant
- [ ] ❌ Étape d'équipement de départ, si le livre en prévoit une

---

## 2. La fiche de personnage

### Ce qui fonctionne

- ✅ Attributs : cinq lignes conformes à la feuille, avec qualification
- ✅ Les huit attributs secondaires, formules et tables de conversion comprises
- ✅ Compétences en colonnes Attr. / Base / Maît. / Glob.
- ✅ Grille de blessures complète, deux tables de localisation
- ✅ Protections par zone, sommées depuis les objets équipés
- ✅ Déplacements, état civil, description physique
- ✅ Table des marges en aide-mémoire
- ✅ Défilement des onglets

### Ce qui manque

- [ ] ❌ **Tables d'armes.** C'est le plus gros trou de la fiche. La feuille
      officielle a deux tableaux — contact (`Dom | Pen | Choc | FOR | Ini | All |
      ITG`) et tir (portées, mode de tir, munitions, notes). L'onglet Équipement
      n'affiche qu'une liste de noms : aucun champ éditable. En combat, c'est
      inutilisable.
- [ ] ❌ **Le champ « Type génétique » ment.** L'en-tête propose un texte libre,
      mais c'est `identite.typeGenetiqueCle` qui porte les règles (compétence
      Hybride, profondeur, perception sous-marine) — et elle n'est modifiable
      que par l'assistant. Il faut une liste déroulante.
- [ ] ❌ Piste d'initiative 0–25
- [ ] ❌ Impossible d'équiper depuis la fiche, alors que la protection ne compte
      que les objets équipés
- [ ] ❌ Acquérir une compétence spéciale hors création
- [ ] ❌ Profondeur maximale et perception sous-marine des hybrides : calculées
      dans la config, jamais affichées
- [ ] ❌ Aucun total d'encombrement 📖
- [ ] ❌ Le glisser-déposer ne marche pas : `dragDrop` est déclaré dans
      [module/sheets/actor-sheet.mjs](module/sheets/actor-sheet.mjs) mais aucun
      `_onDrop` n'est implémenté
- [ ] ❌ Pas de fiche de PNJ simplifiée
- [ ] 📖 Que marque la **case à cocher** devant chaque compétence sur la feuille
      papier ? Acquise, utilisée, susceptible de progresser ?

### Une incohérence à trancher

- [ ] ❌ **Les avantages existent en double.** L'assistant crée de vrais objets
      « trait », mais l'onglet Biographie a aussi une zone de texte libre
      « Avantages / désavantages, mutations et Polaris », reprise de la feuille
      papier. Un personnage créé par l'assistant aura ses mutations en objets et
      la zone vide. Choisir : affichage des traits portés, ou notes libres.

---

## 3. Jets de dés et résolution

**Le point le plus solide du système.** Fonctions pures, couvertes par des tests :
[module/dice/polaris-roll.mjs](module/dice/polaris-roll.mjs).

- ✅ Réussite, échec, critiques, marge égale au dé, 20 naturel
- ✅ Table des marges (1‑2 → ±0 … 35+ → ±9)
- ✅ Fenêtre de configuration, carte de chat détaillant le calcul
- ✅ Malus de blessure appliqué au jet, pas à la valeur affichée

### Ce qui manque

- [ ] ❌ **Le jet d'attribut seul est factice.** `#surJetAttribut` lance un d20
      et affiche le résultat, sans cible ni réussite ni échec.
- [ ] 📖 **Comment teste-t-on un attribut seul ?** Contre son niveau actuel ?
      Contre le double de son aptitude ? C'est cette règle qui débloque le point
      précédent.
- [ ] ❌ **La marge ne sert à rien.** Calculée, convertie, affichée — mais rien
      ne la consomme. 📖 À quoi sert-elle concrètement ?
- [ ] 📖 Modificateurs de difficulté non confirmés (+6 à −9, calqués sur
      l'échelle des marges)
- [ ] 📖 Effet exact d'une réussite critique (le code ajoute la maîtrise)
- [ ] ❌ Effet mécanique d'un échec critique

---

## 4. Tests d'opposition

**❌ Entièrement absent.**

- [ ] 📖 **Règle d'opposition.** Comparaison de marges ? Difficulté dérivée de
      l'adversaire ? Égalité ?
- [ ] ❌ `lancerOpposition({ attaquant, defenseur, competences })`
- [ ] ❌ Carte de chat comparant les deux résultats
- [ ] ❌ Déclenchement vers une cible sélectionnée
- [ ] ❌ Esquive et parade en combat

---

## 5. La Chance

**🟡 L'attribut vit, la mécanique non.**

- ✅ Fixée par l'ambiance de campagne (11 / 13 / 15), exclue des points de création
- [ ] 📖 **À quoi sert-elle ?** Ressource dépensable ? Attribut testé au d20 ?
      Relance, amélioration de marge, annulation d'un échec critique ?
- [ ] 📖 Se régénère-t-elle, et à quel rythme ?
- [ ] ❌ Stocker les points dépensés, si c'est une ressource
- [ ] ❌ Bouton de dépense, effet sur un jet déjà lancé

---

## 6. Système de combat

**Le plus gros chantier de code.** Attaquer lance un jet de compétence, et c'est
tout : aucune fonction n'applique de dégâts dans tout `module/`.

### La boucle manquante

- [ ] ❌ **Jet de dégâts.** Le champ `degats` contient une formule que personne
      ne lance.
- [ ] ❌ **Localisation en jeu.** `lancerLocalisation` existe, choisit la bonne
      table selon l'arme, et n'est appelée nulle part.
- [ ] ❌ **Application de la protection**, calculée par zone et jamais soustraite
- [ ] ❌ **Pénétration** : le champ existe, sans usage. 📖 Soustraction,
      division, seuil ?
- [ ] ❌ **Cocher la blessure** : le résultat ne remplit pas la grille
- [ ] ❌ **Le choc** : ni celui de l'arme, ni celui absorbé, ni les seuils
- [ ] ❌ **Modificateur de dommages au contact** : la table est transcrite, rien
      ne l'applique

`PolarisItem#attaquer()` dans [module/documents/item.mjs](module/documents/item.mjs)
doit devenir une chaîne complète.

### Initiative

- [ ] ⚠️ `CONFIG.Combat.initiative` vaut `@reaction`, ce qui donne le bon nombre
      de départ — mais la feuille montre une **piste 0–25**, pas un ordre de tour.
- [ ] 📖 Comment progresse-t-on sur la piste ? L'initiative de l'arme s'y
      ajoute-t-elle ?
- [ ] ❌ Interface de suivi

### Divers

- [ ] 📖 Modificateurs de portée : les quatre paliers sont en config, rien ne les
      applique
- [ ] 📖 Modes de tir (les trois actuels sont inventés) et leurs effets
- [ ] ❌ Consommation des munitions
- [ ] 📖 Effet de la force minimale non atteinte, effet de l'allonge
- [ ] 📖 Barème d'ITG
- [ ] ❌ Manœuvres de combat 📖

---

## 7. État de santé

La partie la plus fidèle au livre. Voir
[module/data/base-actor.mjs](module/data/base-actor.mjs).

- ✅ Grille conforme, malus calculé et appliqué aux jets
- ✅ Protections sommées depuis les objets équipés
- ✅ Cases cliquables
- ✅ Les huit secondaires, dont les seuils de choc et les trois tables de
      conversion distinctes

### Ce qui manque

- [ ] 📖 **Les malus de blessure se cumulent-ils ?** `cumulMalusBlessures` vaut
      `true`, mais la feuille ne le dit pas. Les deux lectures sont calculées et
      affichées côte à côte. **Cette question change tous les chiffres en jeu.**
- [ ] ❌ **Aucun soin.** Rien ne décoche une case. 📖 Quel rythme de récupération ?
- [ ] ❌ **La mort n'est pas déclenchée.** Le drapeau existe et s'affiche, mais
      une blessure de destruction à la tête ne le pose pas.
- [ ] ❌ Aucun état appliqué au jeton (étourdi, inconscient, mort)
- [ ] ❌ Le malus n'est pas un Active Effect : il est ajouté à la main dans
      `calculerChances`, donc invisible pour tout module tiers
- [ ] 📖 Séquelles : le champ de notes existe, la mécanique non
- [ ] 📖 Règles de Fatigue (le livre les mentionne pour les hybrides)

---

## 8. Effets Polaris

**🟡 Une porte d'entrée, aucune mécanique derrière.**

- ✅ Déclaration à la création, trait de genre `polaris` posé sur le personnage
- ✅ Compétence « Maîtrise de l'Effet Polaris » au catalogue (VOL/VOL)
- [ ] 📖 **Que fait-on quand on manipule l'effet Polaris ?** Un jet ? Contre
      quoi ? À quel coût ? C'est la question qui commande toute la section.
- [ ] 📖 Table de libération accidentelle, et les pouvoirs qu'on y tire
- [ ] ❌ Mécanique de déclenchement et effets sur les jets
- [ ] ❌ Compendium des pouvoirs

---

## 9. Les effets de mutation ne sont pas appliqués

**Point transversal, souvent oublié.** Le catalogue décrit fidèlement 46
capacités, mais **aucun de leurs effets chiffrés n'agit** :

- armure naturelle de Peau renforcée
- malus de Présence des Difformités
- bonus de résistance du Squelette renforcé et des Résistances naturelles
- dégâts de Corne, Crocs, Griffes, Excroissance osseuse
- FOR +1 / COO +1 des caractères animaux

Ils ne vivent que dans les descriptions. Seule la **compétence associée** est
mécanisée.

- [ ] ❌ Un système d'effets — probablement des Active Effects Foundry
- [ ] 📖 Décider ce qui doit être automatique et ce qui reste à la main du meneur

---

## 10. Infrastructure

- [ ] ❌ **Aucune migration de schéma**, alors qu'il a beaucoup changé (santé,
      attributs, secondaires devenus objets, `torse` → `corps`). Un personnage
      créé avant ne s'ouvrira plus correctement.
- [ ] ❌ Poser un numéro de version de schéma
- [ ] ❌ Aucun compendium (`packs: []`)
- [ ] ❌ Rien ne teste les DataModels ni les fiches — seulement les fonctions
      pures et les données
- [ ] ❌ Aucune macro fournie
- [ ] ❌ Pas de `.gitattributes` : Git signale une conversion LF → CRLF à chaque
      opération (sans conséquence tant qu'on reste sur une seule machine)

---

## Ordre suggéré

**1. Rendre une partie possible.**

1. Écrire la boucle de combat : dégâts → localisation → protection → blessure
2. Réparer le jet d'attribut seul
3. Trancher le cumul des malus de blessure
4. Tables d'armes sur la fiche, bascule « équipé », glisser-déposer

**2. Rendre les compétences utilisables.**

5. Mécanisme d'instanciation des familles (Pilotage, Sciences, Langues…)
6. Saisie des spécialisations sur la fiche
7. Effet mécanique des marqueurs, à commencer par les limitatives
8. Liste déroulante de type génétique

**3. Compléter les règles.**

9. Tests d'opposition
10. La Chance
11. Soins et états de santé
12. Effets des mutations
13. Effets Polaris

**4. Confort.**

14. Compendiums
15. Migration
16. Piste d'initiative

---

## Récapitulatif des données attendues

| Donnée | Bloque | Emplacement |
|---|---|---|
| Pouvoirs liés à l'Effet Polaris | Effet Polaris | `POLARIS.competences` |
| Répartition des 8 archétypes | Création | `creation.archetypes[…].repartition` |
| Origines sociales, formations, études | Création | `data/origines.json` |
| Rendement d'une année d'apprentissage | Création | — |
| Budgets expérience / avantages / désavantages | Création | `creation.points.*` |
| Cumul des malus de blessure | Tous les jets | `cumulMalusBlessures` |
| Règle du test d'attribut seul | Jets | — |
| Règle d'opposition | Combat, social | — |
| Règle de la Chance | Tout | — |
| Règles de l'effet Polaris | Tout | — |
| Interaction pénétration / protection | Combat | — |
| Statistiques d'armes et de protections | Combat | Compendiums |
| Rythme de récupération des blessures | Santé | — |
