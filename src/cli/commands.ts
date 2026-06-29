// CLI command handlers -- 2026-06-29 14:06:18
import { BridgeService } from '../services/bridge';

const bridge = new BridgeService();

export function captureCommand(name?: string) {
  console.log('Capturing environment snapshot...');
  const snap = bridge.capture(name);
  console.log('Snapshot captured: ' + snap.id);
  console.log('Platform: ' + snap.platform + ' ' + snap.arch);
  console.log('Node: ' + snap.nodeVersion);
  console.log('Packages: ' + Object.keys(snap.packages).length);
  console.log('Git: ' + snap.gitBranch + '@' + snap.gitCommit);
}

export function listCommand() {
  const snapshots = bridge.list();
  if (snapshots.length === 0) { console.log('No snapshots found.'); return; }
  console.log('Snapshots (' + snapshots.length + '):');
  snapshots.forEach((s, i) => console.log('  ' + (i + 1) + '. ' + s));
}

export function compareCommand(a: string, b: string) {
  try {
    const report = bridge.compare(a, b);
    console.log(report);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

export function deleteCommand(name: string) {
  bridge.delete(name);
  console.log('Deleted snapshot: ' + name);
}