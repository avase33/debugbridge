/**
 * DiffService — compares two Snapshots and highlights environment differences.
 * Returns a structured diff the frontend can render.
 */

import semver from 'semver';

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 'unknown';
  const c1 = semver.valid(semver.coerce(v1));
  const c2 = semver.valid(semver.coerce(v2));
  if (!c1 || !c2) return v1 === v2 ? 'match' : 'mismatch';
  if (c1 === c2) return 'match';
  if (semver.major(c1) !== semver.major(c2)) return 'major';
  if (semver.minor(c1) !== semver.minor(c2)) return 'minor';
  return 'patch';
}

function diffSystem(s1, s2) {
  const fields = ['os', 'osRelease', 'arch', 'kernel', 'shell', 'cpuCores', 'memoryGB'];
  const diffs = [];
  for (const field of fields) {
    const val1 = s1?.[field];
    const val2 = s2?.[field];
    if (val1 !== val2) {
      diffs.push({ field, a: val1, b: val2, severity: ['os', 'arch'].includes(field) ? 'high' : 'low' });
    }
  }
  return diffs;
}

function diffRuntimes(runtimes1 = [], runtimes2 = []) {
  const map1 = Object.fromEntries(runtimes1.map((r) => [r.name?.toLowerCase(), r]));
  const map2 = Object.fromEntries(runtimes2.map((r) => [r.name?.toLowerCase(), r]));
  const allNames = new Set([...Object.keys(map1), ...Object.keys(map2)]);
  const diffs = [];

  for (const name of allNames) {
    const r1 = map1[name];
    const r2 = map2[name];
    if (!r1) {
      diffs.push({ name, aVersion: null, bVersion: r2.version, status: 'missing_in_a', severity: 'high' });
    } else if (!r2) {
      diffs.push({ name, aVersion: r1.version, bVersion: null, status: 'missing_in_b', severity: 'high' });
    } else {
      const versionStatus = compareVersions(r1.version, r2.version);
      if (versionStatus !== 'match') {
        diffs.push({
          name,
          aVersion: r1.version,
          bVersion: r2.version,
          status: 'version_mismatch',
          severity: versionStatus === 'major' ? 'high' : versionStatus === 'minor' ? 'medium' : 'low',
          versionDiff: versionStatus,
        });
      }
    }
  }
  return diffs;
}

function diffPackages(packages1 = [], packages2 = []) {
  const map1 = Object.fromEntries(packages1.map((p) => [p.name, p.version]));
  const map2 = Object.fromEntries(packages2.map((p) => [p.name, p.version]));
  const diffs = [];

  // Check packages in 1 vs 2
  for (const [name, v1] of Object.entries(map1)) {
    const v2 = map2[name];
    if (!v2) {
      diffs.push({ name, aVersion: v1, bVersion: null, status: 'missing_in_b', severity: 'medium' });
    } else if (v1 !== v2) {
      const vStatus = compareVersions(v1, v2);
      diffs.push({
        name,
        aVersion: v1,
        bVersion: v2,
        status: 'version_mismatch',
        severity: vStatus === 'major' ? 'high' : 'low',
        versionDiff: vStatus,
      });
    }
  }

  // Packages in 2 not in 1
  for (const [name, v2] of Object.entries(map2)) {
    if (!map1[name]) {
      diffs.push({ name, aVersion: null, bVersion: v2, status: 'missing_in_a', severity: 'medium' });
    }
  }

  return diffs;
}

function diffEnvVars(env1 = [], env2 = []) {
  const map1 = Object.fromEntries(env1.map((e) => [e.key, e]));
  const map2 = Object.fromEntries(env2.map((e) => [e.key, e]));
  const allKeys = new Set([...Object.keys(map1), ...Object.keys(map2)]);
  const diffs = [];

  for (const key of allKeys) {
    const e1 = map1[key];
    const e2 = map2[key];
    if (!e1) {
      diffs.push({ key, status: 'missing_in_a', severity: 'medium' });
    } else if (!e2) {
      diffs.push({ key, status: 'missing_in_b', severity: 'medium' });
    } else if (!e1.masked && !e2.masked && e1.value !== e2.value) {
      diffs.push({ key, status: 'value_mismatch', severity: 'low' });
    }
  }
  return diffs;
}

/**
 * Compare two Snapshot documents and return a structured diff report.
 */
export function diffSnapshots(snapshotA, snapshotB) {
  const systemDiffs = diffSystem(snapshotA.system, snapshotB.system);
  const runtimeDiffs = diffRuntimes(snapshotA.runtimes, snapshotB.runtimes);
  const packageDiffs = diffPackages(snapshotA.packages, snapshotB.packages);
  const envDiffs = diffEnvVars(snapshotA.envVars, snapshotB.envVars);

  const allDiffs = [...systemDiffs, ...runtimeDiffs, ...packageDiffs, ...envDiffs];
  const highCount = allDiffs.filter((d) => d.severity === 'high').length;
  const mediumCount = allDiffs.filter((d) => d.severity === 'medium').length;
  const lowCount = allDiffs.filter((d) => d.severity === 'low').length;

  let riskLevel = 'none';
  if (highCount > 0) riskLevel = 'high';
  else if (mediumCount > 0) riskLevel = 'medium';
  else if (lowCount > 0) riskLevel = 'low';

  // Generate human-readable summary
  const summaryLines = [];
  if (runtimeDiffs.length > 0) {
    summaryLines.push(`${runtimeDiffs.length} runtime version difference(s)`);
  }
  if (systemDiffs.some((d) => d.severity === 'high')) {
    const osDiff = systemDiffs.find((d) => d.field === 'os');
    if (osDiff) summaryLines.push(`OS mismatch: ${osDiff.a} vs ${osDiff.b}`);
  }
  if (packageDiffs.filter((d) => d.severity === 'high').length > 0) {
    summaryLines.push(`${packageDiffs.filter((d) => d.severity === 'high').length} critical package version mismatch(es)`);
  }
  const summary = summaryLines.length > 0
    ? summaryLines.join('; ')
    : 'No significant environment differences found';

  return {
    riskLevel,
    summary,
    counts: { high: highCount, medium: mediumCount, low: lowCount, total: allDiffs.length },
    system: systemDiffs,
    runtimes: runtimeDiffs,
    packages: packageDiffs.slice(0, 100), // cap for API response size
    envVars: envDiffs,
    analyzedAt: new Date(),
  };
}
