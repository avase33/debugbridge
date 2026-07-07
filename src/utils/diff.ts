// Environment diff utilities -- 2026-07-07 12:05:23
import { EnvSnapshot } from './snapshot';

export interface DiffResult {
  added: Record<string, string>;
  removed: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
  identical: number;
}

export function diffPackages(a: EnvSnapshot, b: EnvSnapshot): DiffResult {
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};
  let identical = 0;

  const allKeys = new Set([...Object.keys(a.packages), ...Object.keys(b.packages)]);
  allKeys.forEach(key => {
    const aVal = a.packages[key];
    const bVal = b.packages[key];
    if (!aVal) added[key] = bVal;
    else if (!bVal) removed[key] = aVal;
    else if (aVal !== bVal) changed[key] = { from: aVal, to: bVal };
    else identical++;
  });

  return { added, removed, changed, identical };
}

export function diffEnvVars(a: EnvSnapshot, b: EnvSnapshot): DiffResult {
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};
  let identical = 0;

  const allKeys = new Set([...Object.keys(a.envVars), ...Object.keys(b.envVars)]);
  allKeys.forEach(key => {
    const aVal = a.envVars[key];
    const bVal = b.envVars[key];
    if (!aVal) added[key] = bVal;
    else if (!bVal) removed[key] = aVal;
    else if (aVal !== bVal) changed[key] = { from: aVal, to: bVal };
    else identical++;
  });

  return { added, removed, changed, identical };
}

export function formatDiff(diff: DiffResult, label: string): string {
  const lines = ['## ' + label + ' Diff', ''];
  if (Object.keys(diff.added).length) { lines.push('### Added'); Object.entries(diff.added).forEach(([k,v]) => lines.push('+ ' + k + ': ' + v)); lines.push(''); }
  if (Object.keys(diff.removed).length) { lines.push('### Removed'); Object.entries(diff.removed).forEach(([k,v]) => lines.push('- ' + k + ': ' + v)); lines.push(''); }
  if (Object.keys(diff.changed).length) { lines.push('### Changed'); Object.entries(diff.changed).forEach(([k,v]) => lines.push('~ ' + k + ': ' + v.from + ' -> ' + v.to)); lines.push(''); }
  lines.push(diff.identical + ' packages identical.');
  return lines.join('\\n');
}