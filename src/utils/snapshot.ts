// Environment snapshot utilities -- 2026-07-09 08:58:21
import { execSync } from 'child_process';
import * as os from 'os';

export interface EnvSnapshot {
  id: string;
  capturedAt: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  npmVersion: string;
  packages: Record<string, string>;
  envVars: Record<string, string>;
  gitBranch?: string;
  gitCommit?: string;
}

function runCmd(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

export function captureSnapshot(): EnvSnapshot {
  const pkgJson = runCmd('cat package.json');
  let packages: Record<string, string> = {};
  try {
    const parsed = JSON.parse(pkgJson);
    packages = { ...parsed.dependencies, ...parsed.devDependencies };
  } catch {}

  const envVarKeys = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'API_URL'];
  const envVars: Record<string, string> = {};
  envVarKeys.forEach(k => { if (process.env[k]) envVars[k] = process.env[k]!; });

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    capturedAt: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    npmVersion: runCmd('npm --version'),
    packages,
    envVars,
    gitBranch: runCmd('git rev-parse --abbrev-ref HEAD'),
    gitCommit: runCmd('git rev-parse --short HEAD'),
  };
}