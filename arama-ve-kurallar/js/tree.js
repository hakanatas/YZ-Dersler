/**
 * Decision-tree data for the "karar ağacı" chapter: eight dumplings, three
 * yes/no features, three chefs, and the tree a person would write by hand
 * from the table. Pure data (no THREE) so node can import and test it.
 */

export const FEATURES = [
  { key: 'kalin', q: 'Hamuru kalın mı?', short: 'kalın hamur' },
  { key: 'etli', q: 'İçi etli mi?', short: 'etli' },
  { key: 'katli', q: 'Üstü katlı mı?', short: 'katlı' },
];

export const CHEFS = [
  { id: 'ayse', name: 'Ayşe Usta', short: 'Ayşe', color: '#3f8a5b' },
  { id: 'kemal', name: 'Kemal Usta', short: 'Kemal', color: '#5b7c99' },
  { id: 'deniz', name: 'Deniz Usta', short: 'Deniz', color: '#8a5bb0' },
];

/** Ayşe rolls thin dough; Kemal fills thick dough with meat; Deniz fills thick dough with potato. */
export const DUMPLINGS = [
  { id: 1, kalin: 0, etli: 0, katli: 0, chef: 'ayse' },
  { id: 2, kalin: 0, etli: 0, katli: 1, chef: 'ayse' },
  { id: 3, kalin: 0, etli: 1, katli: 0, chef: 'ayse' },
  { id: 4, kalin: 0, etli: 1, katli: 1, chef: 'ayse' },
  { id: 5, kalin: 1, etli: 0, katli: 0, chef: 'deniz' },
  { id: 6, kalin: 1, etli: 0, katli: 1, chef: 'deniz' },
  { id: 7, kalin: 1, etli: 1, katli: 0, chef: 'kemal' },
  { id: 8, kalin: 1, etli: 1, katli: 1, chef: 'kemal' },
];

/**
 * The hand-written tree. A node is { key, yes, no }; a leaf is { chef }.
 * "Üstü katlı mı?" never appears: it separates no chef from another.
 */
export const TREE = {
  key: 'kalin',
  no: { chef: 'ayse' },
  yes: { key: 'etli', yes: { chef: 'kemal' }, no: { chef: 'deniz' } },
};

/** Walk the tree for one dumpling; returns the chef id. */
export function evaluate(tree, row) {
  let node = tree;
  while (!node.chef) node = row[node.key] ? node.yes : node.no;
  return node.chef;
}

/** Rows that agree with every answered question. answers: { key: 0|1 }. */
export function filterRows(rows, answers) {
  return rows.filter((r) => Object.entries(answers).every(([k, v]) => r[k] === v));
}

/** Distinct chefs among rows. */
export function chefsOf(rows) {
  return [...new Set(rows.map((r) => r.chef))];
}

/** Number of questions the tree needs for this dumpling. */
export function depthFor(tree, row) {
  let node = tree;
  let n = 0;
  while (!node.chef) {
    node = row[node.key] ? node.yes : node.no;
    n++;
  }
  return n;
}

export const chefById = (id) => CHEFS.find((c) => c.id === id);
