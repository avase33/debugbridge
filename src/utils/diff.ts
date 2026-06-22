/**
 * DebugBridge -- Environment Diff Utilities
 */

export interface BridgeSnapshot {
  name: string;
  version: string;
  created: string;
  runtime: Record<string, string>;
  packages: Record<string, string>;
  env: Record<string, string>;
}

export interface DiffResult {
  added: Record<string, string>;
  removed: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
  unchanged: number;
}

export function diffRecord(before: Record<string, string>, after: Record<string, string>): DiffResult {
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};
  let unchanged = 0;
  for (const [key, val] of Object.entries(after)) {
    if (!(key in before)) added[key] = val;
    else if (before[key] !== val) changed[key] = { from: before[key], to: val };
    else unchanged++;
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) removed[key] = before[key];
  }
  return { added, removed, changed, unchanged };
}

export function diffSnapshots(before: BridgeSnapshot, after: BridgeSnapshot) {
  return {
    runtime: diffRecord(before.runtime, after.runtime),
    packages: diffRecord(before.packages, after.packages),
    env: diffRecord(before.env, after.env),
  };
}

export function snapshotsMatch(a: BridgeSnapshot, b: BridgeSnapshot): boolean {
  const d = diffSnapshots(a, b);
  return Object.keys(d.runtime.added).length === 0
    && Object.keys(d.runtime.changed).length === 0
    && Object.keys(d.packages.added).length === 0
    && Object.keys(d.packages.changed).length === 0;
}