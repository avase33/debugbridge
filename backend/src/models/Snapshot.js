import mongoose from 'mongoose';

/**
 * A Snapshot is a point-in-time capture of a machine's environment.
 * Captured via the CLI (`npx debugbridge capture`) or pasted manually.
 */

const runtimeSchema = new mongoose.Schema(
  {
    name: String,        // node, python, ruby, java, go, rust, php, ...
    version: String,     // e.g. "20.11.0"
    path: String,        // e.g. "/usr/local/bin/node"
    manager: String,     // nvm, pyenv, rbenv, asdf, system, ...
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    name: String,
    version: String,
    resolved: String,   // lock file resolved version
  },
  { _id: false }
);

const envVarSchema = new mongoose.Schema(
  {
    key: String,
    value: String,     // always masked if sensitive key detected
    masked: { type: Boolean, default: false },
  },
  { _id: false }
);

const systemInfoSchema = new mongoose.Schema(
  {
    os: String,          // 'linux', 'darwin', 'win32'
    osRelease: String,   // e.g. 'Ubuntu 22.04'
    arch: String,        // 'x64', 'arm64'
    kernel: String,      // uname -r
    shell: String,       // /bin/bash, /bin/zsh
    cpuCores: Number,
    memoryGB: Number,
    hostname: String,    // optional — user can strip
  },
  { _id: false }
);

const dependencyFileSchema = new mongoose.Schema(
  {
    filename: String,    // package.json, requirements.txt, Gemfile, go.mod, etc.
    content: String,     // raw content (trimmed to 32KB)
    hash: String,        // sha256 of content
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    // Who captured it
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },

    // Capture metadata
    label: { type: String, trim: true, maxlength: 128 },
    description: String,
    capturedAt: { type: Date, default: Date.now },
    captureMethod: { type: String, enum: ['cli', 'web', 'api', 'manual'], default: 'api' },
    cliVersion: String,

    // Environment data
    system: systemInfoSchema,
    runtimes: [runtimeSchema],
    envVars: [envVarSchema],
    packages: [packageSchema],      // top-level deps from primary package file
    dependencyFiles: [dependencyFileSchema],

    // Docker/container info
    dockerVersion: String,
    containerized: { type: Boolean, default: false },
    dockerfiles: [{ filename: String, content: String }],

    // Project context
    projectRoot: String,
    projectName: String,
    gitBranch: String,
    gitCommit: String,
    gitRemote: String,

    // Generated bridge (filled by bridgeGenerator)
    bridge: {
      dockerfile: String,
      setupSh: String,
      envTemplate: String,
      dockerCompose: String,
      generatedAt: Date,
    },

    // Visibility
    isPublic: { type: Boolean, default: false },
    views: { type: Number, default: 0 },

    // Raw payload (for re-parsing if schema evolves)
    rawPayload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

snapshotSchema.index({ owner: 1, createdAt: -1 });
snapshotSchema.index({ isPublic: 1, createdAt: -1 });

snapshotSchema.virtual('primaryRuntime').get(function () {
  return this.runtimes?.[0] || null;
});

export const Snapshot = mongoose.model('Snapshot', snapshotSchema);
