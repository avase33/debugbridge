#!/usr/bin/env node
/**
 * DebugBridge CLI
 * Captures your dev environment and uploads it to DebugBridge.
 *
 * Usage:
 *   npx debugbridge capture [--label "My Machine"] [--api http://localhost:5000] [--token <jwt>]
 *   npx debugbridge capture --output snapshot.json   # save locally, don't upload
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { homedir, platform, arch, release, hostname, cpus, totalmem } from 'node:os';
import { createHash } from 'node:crypto';
import { program } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

// ── Helpers ─────────────────────────────────────────────────────────────────

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}

function fileHash(content) {
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

// ── Collectors ───────────────────────────────────────────────────────────────

function collectSystem() {
  return {
    os: platform(),
    osRelease: run('sw_vers -productVersion 2>/dev/null') || run('lsb_release -d 2>/dev/null | cut -f2') || release(),
    arch: arch(),
    kernel: release(),
    shell: process.env.SHELL || run('echo $SHELL') || '',
    cpuCores: cpus().length,
    memoryGB: Math.round(totalmem() / 1024 / 1024 / 1024),
    hostname: hostname(),
  };
}

function collectRuntimes() {
  const runtimes = [];
  const checks = [
    { name: 'node', cmd: 'node --version', strip: 'v' },
    { name: 'python', cmd: 'python3 --version', strip: 'Python ' },
    { name: 'ruby', cmd: 'ruby --version', strip: 'ruby ', end: ' ' },
    { name: 'go', cmd: 'go version', strip: 'go version go', end: ' ' },
    { name: 'java', cmd: 'java -version 2>&1', strip: 'openjdk version "', end: '"' },
    { name: 'rust', cmd: 'rustc --version', strip: 'rustc ', end: ' ' },
    { name: 'php', cmd: 'php --version', strip: 'PHP ', end: ' ' },
    { name: 'deno', cmd: 'deno --version', strip: 'deno ', end: '\n' },
    { name: 'bun', cmd: 'bun --version' },
  ];

  for (const { name, cmd, strip, end } of checks) {
    const raw = run(cmd);
    if (!raw) continue;
    let version = raw;
    if (strip) version = version.replace(strip, '');
    if (end) { const i = version.indexOf(end); if (i > -1) version = version.slice(0, i); }
    version = version.split('\n')[0].trim();
    runtimes.push({ name, version });
  }
  return runtimes;
}

function collectEnvVars() {
  const SKIP = new Set(['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TERM', 'TERM_PROGRAM', 'COLORTERM', 'LANG', 'LC_ALL', 'TMPDIR', 'PWD', 'OLDPWD', 'SHLVL', '_']);
  return Object.entries(process.env)
    .filter(([k]) => !SKIP.has(k) && !k.startsWith('APPLE_') && !k.startsWith('XPC_'))
    .map(([key, value]) => ({ key, value: value || '' }));
}

function collectPackages(cwd) {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return [];
  try {
    const raw = run('npm list --depth=0 --json 2>/dev/null');
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Object.entries(data.dependencies || {}).map(([name, info]) => ({
      name,
      version: info.version || '',
    }));
  } catch { return []; }
}

function collectDepFiles(cwd) {
  const targets = ['package.json', 'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'Pipfile', 'pyproject.toml', 'Gemfile', 'go.mod', 'Cargo.toml'];
  const files = [];
  for (const filename of targets) {
    const fp = join(cwd, filename);
    if (existsSync(fp)) {
      try {
        const content = readFileSync(fp, 'utf8').slice(0, 32 * 1024);
        files.push({ filename, content, hash: fileHash(content) });
      } catch {}
    }
  }
  return files;
}

function collectGit(cwd) {
  return {
    gitBranch: run('git rev-parse --abbrev-ref HEAD'),
    gitCommit: run('git rev-parse HEAD'),
    gitRemote: run('git config --get remote.origin.url'),
  };
}

function detectDockerfiles(cwd) {
  const names = ['Dockerfile', 'Dockerfile.dev', 'docker-compose.yml', 'docker-compose.yaml'];
  const files = [];
  for (const filename of names) {
    const fp = join(cwd, filename);
    if (existsSync(fp)) {
      try {
        const content = readFileSync(fp, 'utf8').slice(0, 16 * 1024);
        files.push({ filename, content });
      } catch {}
    }
  }
  return files;
}

// ── Main ────────────────────────────────────────────────────────────────────

program
  .name('debugbridge')
  .description('Capture your dev environment and upload to DebugBridge')
  .version('1.0.0');

program
  .command('capture')
  .description('Capture environment snapshot')
  .option('-l, --label <label>', 'Label for this snapshot')
  .option('-a, --api <url>', 'DebugBridge API URL', process.env.DEBUGBRIDGE_API_URL || 'http://localhost:5000/api')
  .option('-t, --token <token>', 'JWT access token', process.env.DEBUGBRIDGE_TOKEN)
  .option('-o, --output <file>', 'Save snapshot to file instead of uploading')
  .option('--public', 'Make snapshot public', false)
  .action(async (opts) => {
    const cwd = process.cwd();
    const projectName = basename(cwd);

    const spinner = ora(chalk.cyan('Capturing environment…')).start();

    const snapshot = {
      label: opts.label || `${projectName} on ${hostname()}`,
      captureMethod: 'cli',
      cliVersion: '1.0.0',
      projectName,
      projectRoot: cwd,
      system: collectSystem(),
      runtimes: collectRuntimes(),
      envVars: collectEnvVars(),
      packages: collectPackages(cwd),
      dependencyFiles: collectDepFiles(cwd),
      dockerfiles: detectDockerfiles(cwd),
      dockerVersion: run('docker --version').replace('Docker version ', '').split(',')[0],
      containerized: existsSync('/.dockerenv'),
      isPublic: opts.public,
      ...collectGit(cwd),
    };

    spinner.succeed(chalk.green(`Environment captured: ${snapshot.runtimes.map((r) => `${r.name} ${r.version}`).join(', ')}`));

    if (opts.output) {
      writeFileSync(opts.output, JSON.stringify(snapshot, null, 2));
      console.log(chalk.green(`✅ Saved to ${opts.output}`));
      return;
    }

    if (!opts.token) {
      console.log(chalk.yellow('\n⚠️  No token provided. Set DEBUGBRIDGE_TOKEN env var or use --token.\n'));
      console.log('Snapshot preview:\n');
      console.log(JSON.stringify(snapshot, null, 2));
      return;
    }

    const uploadSpinner = ora('Uploading to DebugBridge…').start();
    try {
      const res = await axios.post(`${opts.api}/snapshots`, snapshot, {
        headers: { Authorization: `Bearer ${opts.token}` },
        timeout: 30000,
      });
      uploadSpinner.succeed(chalk.green('Snapshot uploaded!'));
      console.log(chalk.cyan(`\n🔍 View at: ${opts.api.replace('/api', '')}/snapshots/${res.data.snapshot._id}`));
      console.log(chalk.gray(`   Bridge artifacts auto-generated: Dockerfile, setup.sh, .env.template, docker-compose.yml`));
    } catch (err) {
      uploadSpinner.fail(chalk.red('Upload failed'));
      console.error(err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

program.parse();
