import type { Formula } from '../models/Formula';

/**
 * Extract calculation references from a formula's generated code.
 * Looks for patterns like getCalculation("Some Label")
 */
export function extractCalculationRefs(formula: Formula): string[] {
  if (!formula.formula) return [];
  const refs: string[] = [];
  const regex = /getCalculation\("([^"]+)"\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(formula.formula)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

/**
 * Build a dependency graph: formulaLabel -> set of labels it depends on.
 */
export function buildDependencyGraph(
  allFormulas: Record<string, Formula[]>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const formulas of Object.values(allFormulas)) {
    for (const f of formulas) {
      graph.set(f.label, new Set(extractCalculationRefs(f)));
    }
  }
  return graph;
}

/**
 * Check if adding a dependency from `fromLabel` -> `toLabel` would create a cycle.
 * Returns the cycle path if one exists, or null if safe.
 */
export function wouldCreateCycle(
  graph: Map<string, Set<string>>,
  fromLabel: string,
  toLabel: string,
): string[] | null {
  // Adding fromLabel depends on toLabel.
  // A cycle exists if toLabel (directly or transitively) already depends on fromLabel.
  const visited = new Set<string>();
  const path: string[] = [fromLabel, toLabel];

  function dfs(current: string): boolean {
    if (current === fromLabel) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const deps = graph.get(current);
    if (!deps) return false;
    for (const dep of deps) {
      path.push(dep);
      if (dfs(dep)) return true;
      path.pop();
    }
    return false;
  }

  return dfs(toLabel) ? path : null;
}

/**
 * Check if a formula with the given label is referenced by any other formula.
 * Returns the list of dependent formula labels, or empty array if none.
 */
export function getDependents(
  allFormulas: Record<string, Formula[]>,
  targetLabel: string,
): string[] {
  const dependents: string[] = [];
  for (const formulas of Object.values(allFormulas)) {
    for (const f of formulas) {
      if (f.label === targetLabel) continue;
      const refs = extractCalculationRefs(f);
      if (refs.includes(targetLabel)) {
        dependents.push(f.label);
      }
    }
  }
  return dependents;
}

/**
 * Get all formula labels that `formulaLabel` can safely reference
 * (i.e., adding the reference would NOT create a circular dependency).
 */
export function getAvailableCalculations(
  allFormulas: Record<string, Formula[]>,
  currentFormulaLabel: string,
): string[] {
  const graph = buildDependencyGraph(allFormulas);
  const allLabels: string[] = [];
  for (const formulas of Object.values(allFormulas)) {
    for (const f of formulas) {
      if (f.label !== currentFormulaLabel) {
        allLabels.push(f.label);
      }
    }
  }
  // Filter out any that would create a cycle
  return allLabels.filter((label) => !wouldCreateCycle(graph, currentFormulaLabel, label));
}

/**
 * Topologically sort formulas so dependencies are evaluated first.
 * Returns labels in evaluation order.
 */
export function topologicalSort(allFormulas: Record<string, Formula[]>): string[] {
  const graph = buildDependencyGraph(allFormulas);
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(label: string) {
    if (visited.has(label)) return;
    if (visiting.has(label)) return; // cycle, skip
    visiting.add(label);
    const deps = graph.get(label);
    if (deps) {
      for (const dep of deps) {
        visit(dep);
      }
    }
    visiting.delete(label);
    visited.add(label);
    sorted.push(label);
  }

  for (const label of graph.keys()) {
    visit(label);
  }

  return sorted;
}
