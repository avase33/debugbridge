/**
 * Parses and normalises raw snapshot payloads from the CLI or web capture.
 * Masks sensitive environment variable values.
 */

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'secret', 'token', 'api_key', 'apikey', 'auth',
  'authorization', 'credential', 'private_key', 'privatekey', 'access_key',
  'accesskey', 'client_secret', 'database_url', 'db_url', 'connection_string',
  'smtp_pass', 'aws_secret', 'stripe_secret', 'twilio', 'sendgrid_key',
]);

function isSensitiveKey(key) {
  const lower = key.toLowerCase().replace(/[^a-z]/g, '');
  for (const sensitive of SENSITIVE_KEYS) {
    if (lower.includes(sensitive)) return true;
  }
  return false;
}

export function maskEnvVars(envVars = []) {
  return envVars.map((entry) => {
    if (typeof entry === 'string') {
      const [key, ...rest] = entry.split('=');
      const value = rest.join('=');
      const masked = isSensitiveKey(key);
      return { key, value: masked ? '***MASKED***' : value, masked };
    }
    if (typeof entry === 'object') {
      const masked = isSensitiveKey(entry.key || '');
      return { key: entry.key, value: masked ? '***MASKED***' : entry.value, masked };
    }
    return entry;
  });
}

/**
 * Normalise a raw payload (from CLI JSON or manual paste) into
 * the shape the Snapshot model expects.
 */
export function parseSnapshot(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Snapshot payload must be a JSON object');
  }

  // System info
  const system = raw.system || {};

  // Runtimes: accept array or object map { node: '20.11.0', python: '3.12.0' }
  let runtimes = [];
  if (Array.isArray(raw.runtimes)) {
    runtimes = raw.runtimes.map((r) => ({
      name: r.name || r.runtime || 'unknown',
      version: r.version || '',
      path: r.path || '',
      manager: r.manager || 'system',
    }));
  } else if (raw.runtimes && typeof raw.runtimes === 'object') {
    runtimes = Object.entries(raw.runtimes).map(([name, version]) => ({
      name,
      version: typeof version === 'string' ? version : String(version),
      path: '',
      manager: 'system',
    }));
  }

  // Packages
  let packages = [];
  if (Array.isArray(raw.packages)) {
    packages = raw.packages.slice(0, 500).map((p) => ({
      name: typeof p === 'string' ? p : p.name,
      version: typeof p === 'string' ? '' : (p.version || ''),
      resolved: p.resolved || '',
    }));
  }

  // Env vars — mask sensitive values
  const envVars = maskEnvVars(raw.envVars || raw.env || []);

  // Dependency files (package.json, requirements.txt, etc.)
  let dependencyFiles = [];
  if (Array.isArray(raw.dependencyFiles)) {
    dependencyFiles = raw.dependencyFiles.map((f) => ({
      filename: f.filename || f.name,
      content: (f.content || '').slice(0, 32 * 1024), // cap 32KB
      hash: f.hash || '',
    }));
  }

  return {
    system: {
      os: system.os || system.platform || '',
      osRelease: system.osRelease || system.release || '',
      arch: system.arch || system.architecture || '',
      kernel: system.kernel || '',
      shell: system.shell || '',
      cpuCores: system.cpuCores || system.cpus || 0,
      memoryGB: system.memoryGB || (system.totalMemory ? Math.round(system.totalMemory / 1024 / 1024 / 1024) : 0),
      hostname: system.hostname || '',
    },
    runtimes,
    packages,
    envVars,
    dependencyFiles,
    dockerVersion: raw.dockerVersion || '',
    containerized: !!raw.containerized,
    dockerfiles: (raw.dockerfiles || []).map((d) => ({
      filename: d.filename || 'Dockerfile',
      content: (d.content || '').slice(0, 16 * 1024),
    })),
    projectRoot: raw.projectRoot || raw.cwd || '',
    projectName: raw.projectName || '',
    gitBranch: raw.gitBranch || raw.git?.branch || '',
    gitCommit: raw.gitCommit || raw.git?.commit || '',
    gitRemote: raw.gitRemote || raw.git?.remote || '',
    cliVersion: raw.cliVersion || '',
    captureMethod: raw.captureMethod || 'api',
  };
}
