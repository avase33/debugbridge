/**
 * DebugBridge -- Diff Utility Tests
 */

import { diffRecord, snapshotsMatch } from '../utils/diff';

describe('diffRecord', () => {
  it('detects added keys', () => {
    const result = diffRecord({ a: '1' }, { a: '1', b: '2' });
    expect(result.added).toEqual({ b: '2' });
    expect(result.removed).toEqual({});
  });

  it('detects removed keys', () => {
    const result = diffRecord({ a: '1', b: '2' }, { a: '1' });
    expect(result.removed).toEqual({ b: '2' });
  });

  it('detects changed values', () => {
    const result = diffRecord({ node: '18.0.0' }, { node: '20.14.0' });
    expect(result.changed.node).toEqual({ from: '18.0.0', to: '20.14.0' });
  });

  it('counts unchanged keys', () => {
    const result = diffRecord({ a: '1', b: '2' }, { a: '1', b: '2' });
    expect(result.unchanged).toBe(2);
  });
});

describe('snapshotsMatch', () => {
  const base = {
    name: 'test', version: '1.0.0', created: '2026-01-01T00:00:00Z',
    runtime: { node: '20.0.0' }, packages: { express: '4.19.2' }, env: { NODE_ENV: 'development' },
  };
  it('returns true for identical snapshots', () => {
    expect(snapshotsMatch(base, { ...base })).toBe(true);
  });
  it('returns false when package version differs', () => {
    expect(snapshotsMatch(base, { ...base, packages: { express: '4.20.0' } })).toBe(false);
  });
});