// Diff utility tests -- 2026-06-24 09:34:52
import { diffPackages, diffEnvVars, formatDiff } from '../diff';
import { EnvSnapshot } from '../snapshot';

const baseSnap: Partial<EnvSnapshot> = {
  id: 'test-a', capturedAt: '2026-01-01T00:00:00Z',
  platform: 'linux', arch: 'x64', nodeVersion: 'v20.0.0', npmVersion: '10.0.0',
  packages: { react: '^18.0.0', typescript: '^5.0.0', lodash: '^4.17.21' },
  envVars: { NODE_ENV: 'development', PORT: '3000' },
};

describe('diffPackages', () => {
  it('detects added packages', () => {
    const a = { ...baseSnap, packages: { react: '^18.0.0' } } as EnvSnapshot;
    const b = { ...baseSnap, packages: { react: '^18.0.0', axios: '^1.0.0' } } as EnvSnapshot;
    const diff = diffPackages(a, b);
    expect(diff.added.axios).toBe('^1.0.0');
    expect(diff.identical).toBe(1);
  });

  it('detects removed packages', () => {
    const a = { ...baseSnap, packages: { react: '^18.0.0', lodash: '^4.17.21' } } as EnvSnapshot;
    const b = { ...baseSnap, packages: { react: '^18.0.0' } } as EnvSnapshot;
    const diff = diffPackages(a, b);
    expect(diff.removed.lodash).toBe('^4.17.21');
  });

  it('detects version changes', () => {
    const a = { ...baseSnap, packages: { react: '^17.0.0' } } as EnvSnapshot;
    const b = { ...baseSnap, packages: { react: '^18.0.0' } } as EnvSnapshot;
    const diff = diffPackages(a, b);
    expect(diff.changed.react.from).toBe('^17.0.0');
    expect(diff.changed.react.to).toBe('^18.0.0');
  });

  it('handles identical environments', () => {
    const snap = { ...baseSnap } as EnvSnapshot;
    const diff = diffPackages(snap, snap);
    expect(Object.keys(diff.added).length).toBe(0);
    expect(Object.keys(diff.removed).length).toBe(0);
    expect(Object.keys(diff.changed).length).toBe(0);
  });
});