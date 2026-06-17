/**
 * BridgeGenerator — takes a Snapshot and produces:
 *   - Dockerfile
 *   - setup.sh
 *   - .env.template
 *   - docker-compose.yml
 */

const OS_BASE_IMAGES = {
  darwin: 'ubuntu:22.04',
  linux: 'ubuntu:22.04',
  win32: 'ubuntu:22.04',
  ubuntu: 'ubuntu:22.04',
  debian: 'debian:bookworm-slim',
  alpine: 'alpine:3.19',
  centos: 'centos:stream9',
  fedora: 'fedora:39',
};

const RUNTIME_INSTALLERS = {
  node: (version) => {
    const major = version?.split('.')?.[0] || '20';
    return `# Install Node.js ${version || major}
RUN curl -fsSL https://deb.nodesource.com/setup_${major}.x | bash - \\
    && apt-get install -y nodejs`;
  },
  python: (version) => {
    const [major, minor] = (version || '3.12').split('.');
    return `# Install Python ${version || '3.12'}
RUN apt-get install -y python${major}.${minor} python${major}.${minor}-pip python${major}.${minor}-venv \\
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${major}.${minor} 1 \\
    && update-alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip${major}.${minor} 1`;
  },
  ruby: (version) => `# Install Ruby ${version || '3.3'}
RUN apt-get install -y ruby${version || ''} ruby${version || ''}-dev`,
  go: (version) => `# Install Go ${version || '1.22'}
RUN wget -q https://go.dev/dl/go${version || '1.22.0'}.linux-amd64.tar.gz \\
    && tar -C /usr/local -xzf go${version || '1.22.0'}.linux-amd64.tar.gz \\
    && rm go${version || '1.22.0'}.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin`,
  rust: (_version) => `# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH=$PATH:/root/.cargo/bin`,
  java: (version) => {
    const major = version?.split('.')?.[0] || '21';
    return `# Install Java ${version || major}
RUN apt-get install -y openjdk-${major}-jdk`;
  },
};

const PACKAGE_MANAGERS = {
  'package.json': 'npm install',
  'yarn.lock': 'yarn install --frozen-lockfile',
  'pnpm-lock.yaml': 'npm install -g pnpm && pnpm install --frozen-lockfile',
  'requirements.txt': 'pip3 install -r requirements.txt',
  'Pipfile': 'pip3 install pipenv && pipenv install',
  'pyproject.toml': 'pip3 install poetry && poetry install',
  'Gemfile': 'gem install bundler && bundle install',
  'go.mod': 'go mod download',
  'Cargo.toml': 'cargo build',
  'composer.json': 'composer install',
};

function detectBaseImage(snapshot) {
  const os = (snapshot.system?.os || '').toLowerCase();
  const release = (snapshot.system?.osRelease || '').toLowerCase();
  for (const [key, image] of Object.entries(OS_BASE_IMAGES)) {
    if (os.includes(key) || release.includes(key)) return image;
  }
  return 'ubuntu:22.04';
}

function getRuntimeInstallers(runtimes = []) {
  return runtimes
    .filter((r) => RUNTIME_INSTALLERS[r.name?.toLowerCase()])
    .map((r) => RUNTIME_INSTALLERS[r.name.toLowerCase()](r.version))
    .join('\n\n');
}

function getInstallCommand(dependencyFiles = []) {
  for (const file of dependencyFiles) {
    const cmd = PACKAGE_MANAGERS[file.filename];
    if (cmd) return `RUN ${cmd}`;
  }
  return '# RUN <your dependency install command>';
}

export function generateDockerfile(snapshot) {
  const baseImage = detectBaseImage(snapshot);
  const runtimeInstalls = getRuntimeInstallers(snapshot.runtimes || []);
  const installCmd = getInstallCommand(snapshot.dependencyFiles || []);
  const projectName = snapshot.projectName || 'app';

  return `# DebugBridge — Reproducible Environment
# Generated from snapshot captured on ${new Date().toISOString().split('T')[0]}
# Original: ${snapshot.system?.os || 'unknown'} ${snapshot.system?.arch || ''} — ${snapshot.system?.osRelease || ''}
# Project: ${projectName}

FROM ${baseImage}

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Update base system
RUN apt-get update && apt-get install -y \\
    curl wget git build-essential ca-certificates \\
    software-properties-common gnupg lsb-release \\
    && rm -rf /var/lib/apt/lists/*

${runtimeInstalls}

# Set working directory
WORKDIR /workspace

# Copy dependency files first (layer cache optimization)
${(snapshot.dependencyFiles || []).map((f) => `COPY ${f.filename} ./`).join('\n') || 'COPY . .'}

# Install dependencies
${installCmd}

# Copy the rest of the project
COPY . .

# Default command — override as needed
CMD ["/bin/bash"]
`;
}

export function generateSetupSh(snapshot) {
  const runtimes = snapshot.runtimes || [];
  const depFiles = snapshot.dependencyFiles || [];
  const projectName = snapshot.projectName || 'project';

  const lines = [
    `#!/bin/bash`,
    `# DebugBridge Setup Script`,
    `# Reproduces: ${snapshot.system?.os || 'unknown'} ${snapshot.system?.arch || ''} environment`,
    `# Project: ${projectName}`,
    `# Generated: ${new Date().toISOString()}`,
    `set -e`,
    ``,
    `echo "🔧 DebugBridge: Setting up reproducible environment..."`,
    ``,
    `# Detect OS`,
    `OS=$(uname -s | tr '[:upper:]' '[:lower:]')`,
    `ARCH=$(uname -m)`,
    `echo "Running on: $OS/$ARCH"`,
    ``,
    `# ── Runtime versions ────────────────────────────────────────────────────`,
  ];

  for (const rt of runtimes) {
    const name = (rt.name || '').toLowerCase();
    if (name === 'node') {
      lines.push(`# Required: Node.js ${rt.version}`);
      lines.push(`if command -v node &>/dev/null; then`);
      lines.push(`  NODE_VER=$(node --version)`);
      lines.push(`  echo "Node.js: $NODE_VER (required: ${rt.version})"`);
      lines.push(`else`);
      lines.push(`  echo "⚠️  Node.js not found. Install from https://nodejs.org/"`);
      lines.push(`  echo "   Recommended: nvm install ${rt.version}"`);
      lines.push(`fi`);
    } else if (name === 'python') {
      lines.push(`# Required: Python ${rt.version}`);
      lines.push(`if command -v python3 &>/dev/null; then`);
      lines.push(`  PY_VER=$(python3 --version)`);
      lines.push(`  echo "Python: $PY_VER (required: ${rt.version})"`);
      lines.push(`else`);
      lines.push(`  echo "⚠️  Python3 not found. Install from https://python.org/"`);
      lines.push(`fi`);
    }
    lines.push('');
  }

  lines.push(`# ── Dependencies ────────────────────────────────────────────────────────`);
  for (const file of depFiles) {
    const cmd = PACKAGE_MANAGERS[file.filename];
    if (cmd) {
      lines.push(`echo "Installing from ${file.filename}..."`);
      lines.push(cmd);
    }
  }

  lines.push('');
  lines.push(`# ── Environment variables ───────────────────────────────────────────────`);
  lines.push(`if [ -f .env.template ] && [ ! -f .env ]; then`);
  lines.push(`  cp .env.template .env`);
  lines.push(`  echo "⚠️  .env created from template — fill in the required values"`);
  lines.push(`fi`);

  lines.push('');
  lines.push(`echo "✅ Setup complete! Review any ⚠️  warnings above."`);

  return lines.join('\n');
}

export function generateEnvTemplate(snapshot) {
  const envVars = snapshot.envVars || [];
  if (envVars.length === 0) return '# No environment variables captured\n';

  const lines = [
    `# DebugBridge — Environment Template`,
    `# Generated from snapshot: ${snapshot.projectName || 'unknown'}`,
    `# Fill in values marked with <FILL_IN>`,
    ``,
  ];

  for (const { key, value, masked } of envVars) {
    if (!key) continue;
    if (masked) {
      lines.push(`${key}=<FILL_IN>`);
    } else {
      lines.push(`${key}=${value || ''}`);
    }
  }

  return lines.join('\n') + '\n';
}

export function generateDockerCompose(snapshot) {
  const projectName = (snapshot.projectName || 'debugbridge').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const runtimes = snapshot.runtimes || [];
  const hasNode = runtimes.some((r) => r.name?.toLowerCase() === 'node');
  const hasPython = runtimes.some((r) => r.name?.toLowerCase() === 'python');

  return `# DebugBridge — Docker Compose
# Reproduces environment for: ${snapshot.projectName || 'project'}
# Platform: ${snapshot.system?.os || 'unknown'} ${snapshot.system?.arch || ''}

version: '3.9'

services:
  app:
    build: .
    image: ${projectName}:debugbridge
    volumes:
      - .:/workspace
      - /workspace/node_modules  # preserve node_modules layer
    environment:
      - NODE_ENV=development
    env_file:
      - .env
    ports:
      - "3000:3000"${hasNode ? '\n      - "5173:5173"' : ''}
    working_dir: /workspace
    command: ${hasNode ? 'npm run dev' : hasPython ? 'python3 -m uvicorn main:app --reload' : '/bin/bash'}
    stdin_open: true
    tty: true

# Uncomment to add a database:
# postgres:
#   image: postgres:16-alpine
#   environment:
#     POSTGRES_DB: ${projectName}
#     POSTGRES_USER: ${projectName}
#     POSTGRES_PASSWORD: changeme
#   ports:
#     - "5432:5432"
`;
}

/**
 * Generate all bridge artifacts for a snapshot.
 */
export function generateBridge(snapshot) {
  return {
    dockerfile: generateDockerfile(snapshot),
    setupSh: generateSetupSh(snapshot),
    envTemplate: generateEnvTemplate(snapshot),
    dockerCompose: generateDockerCompose(snapshot),
    generatedAt: new Date(),
  };
}
