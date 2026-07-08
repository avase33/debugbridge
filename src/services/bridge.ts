// DebugBridge core service -- 2026-07-08 09:53:19
import { captureSnapshot, EnvSnapshot } from '../utils/snapshot';
import { diffPackages, diffEnvVars, formatDiff } from '../utils/diff';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOTS_DIR = '.debugbridge';

export class BridgeService {
  private snapshotsDir: string;

  constructor(cwd = process.cwd()) {
    this.snapshotsDir = path.join(cwd, SNAPSHOTS_DIR);
    fs.mkdirSync(this.snapshotsDir, { recursive: true });
  }

  capture(name?: string): EnvSnapshot {
    const snapshot = captureSnapshot();
    const filename = (name ?? snapshot.id) + '.json';
    fs.writeFileSync(path.join(this.snapshotsDir, filename), JSON.stringify(snapshot, null, 2));
    return snapshot;
  }

  list(): string[] {
    return fs.readdirSync(this.snapshotsDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }

  load(name: string): EnvSnapshot {
    const filepath = path.join(this.snapshotsDir, name + '.json');
    if (!fs.existsSync(filepath)) throw new Error('Snapshot not found: ' + name);
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }

  compare(nameA: string, nameB: string): string {
    const a = this.load(nameA);
    const b = this.load(nameB);
    const pkgDiff = diffPackages(a, b);
    const envDiff = diffEnvVars(a, b);
    return ['# DebugBridge Comparison', '', '**' + nameA + '** vs **' + nameB + '**', '', formatDiff(pkgDiff, 'Packages'), '', formatDiff(envDiff, 'Environment Variables')].join('\\n');
  }

  delete(name: string): void {
    const filepath = path.join(this.snapshotsDir, name + '.json');
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}