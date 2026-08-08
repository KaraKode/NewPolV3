/**
 * Tests de la mécanique de résolution.
 *
 * `evaluerJet` ne dépend d'aucune API Foundry, ce qui permet de la tester en
 * Node pur :   node test/resolution.test.mjs
 *
 * Ces tests encodent les règles telles qu'on les a comprises. Si une règle est
 * corrigée dans le livre, corriger le cas de test ici EN MÊME TEMPS que le code.
 */

import { evaluerJet } from "../module/dice/polaris-roll.mjs";

const cas = [
  // [dé, chances, maîtrise, issue attendue, marge attendue, description]
  [14, 15, 3, "reussite",      14, "sous la cible : réussite, marge = dé"],
  [15, 15, 3, "critique",      18, "pile sur la cible : critique, marge = dé + maîtrise"],
  [16, 15, 3, "echec",          0, "au-dessus de la cible : échec"],
  [20, 15, 3, "echecCritique",  0, "20 naturel avec cible < 20 : échec critique"],
  [20, 20, 4, "critique",      24, "20 naturel avec cible = 20 : critique, pas échec"],
  [20, 25, 4, "critique",      24, "20 naturel avec cible > 20 : critique"],
  [19, 25, 4, "reussite",      19, "cible > 20, dé ordinaire : réussite simple"],
  [ 1,  3, 0, "reussite",       1, "petit dé sous une petite cible : réussite faible"],
  [ 5,  3, 0, "echec",          0, "dépassement sur cible basse : échec"],
  [ 3,  3, 2, "critique",       5, "cible basse atteinte pile : critique"],
  [ 1,  0, 0, "echec",          0, "cible nulle : tout échoue"]
];

let echecs = 0;

for (const [de, chances, maitrise, issueAttendue, margeAttendue, desc] of cas) {
  const r = evaluerJet(de, chances, maitrise);
  const ok = r.issue === issueAttendue && r.marge === margeAttendue;
  if (!ok) echecs++;
  console.log(
    `${ok ? "PASS " : "ECHEC"}  d20=${String(de).padStart(2)} vs ${String(chances).padStart(2)}` +
      ` -> ${r.issue} (marge ${r.marge})` +
      (ok ? "" : `  ATTENDU ${issueAttendue} (marge ${margeAttendue})`) +
      `  | ${desc}`
  );
}

// Invariant : on ne peut jamais réussir avec un dé supérieur à ses chances.
for (let chances = 1; chances <= 19; chances++) {
  for (let de = 1; de <= 20; de++) {
    const r = evaluerJet(de, chances, 0);
    if (r.reussite && de > chances) {
      console.log(`ECHEC  incohérence : d20=${de} réussit contre ${chances}`);
      echecs++;
    }
  }
}

console.log(echecs === 0 ? "\nTous les tests passent." : `\n${echecs} test(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
