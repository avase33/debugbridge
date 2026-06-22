<div align="center">

```
 ___       _            ___     _    _
|   \ ___ | |__ _  _ _ | _ )_ _(_)__| |__ _ ___
| |) / -_)| '_ \ || | || _ \ '_| / _` / _` / -_)
|___/\___||_.__/\_,_|\__|___/_| |_\__,_\__, \___|
                                        |___/
```

### **Environment Cloner -- Solve "It Works On My Machine" Forever**

*Capture any dev environment. Reproduce it anywhere. Instantly.*

<br/>

[![CI](https://github.com/avase33/debugbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/avase33/debugbridge/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

<br/>

> **DebugBridge** is a developer tool that snapshots your exact runtime environment -- Node version, OS, environment variables, installed packages, and system config -- and lets any teammate or CI machine reproduce it identically in seconds. No more debugging the environment instead of the code.

</div>

---

## The Problem

"It works on my machine" kills engineering velocity. Junior devs spend days setting up environments. Staging behaves differently from prod. Onboarding a new teammate takes a week of Slack back-and-forth.

DebugBridge turns your environment into a portable, reproducible artifact.

---

## Feature Highlights

### Environment Capture

- Snapshot Node.js / Python / Java version, npm/pip/maven dependencies
- Capture environment variables (with secret masking)
- Record OS platform, architecture, and system-level packages
- Export as a `.bridge` file: a signed, versioned environment manifest

### One-Command Restore

```bash
debugbridge restore team-api-v2.3.bridge
```

- Installs exact package versions with pinned lock files
- Applies environment variables to local `.env` automatically
- Detects mismatches and shows a diff before applying
- Supports Docker: generate a `Dockerfile` from any `.bridge` file

### Team Sharing

- Push snapshots to a shared DebugBridge registry
- Tag environments by project, branch, or date
- Compare two snapshots to find drift: "what changed between Mar and Apr?"
- Slack integration: post environment diffs directly to team channel

### CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Restore dev environment
  run: debugbridge restore ci-baseline.bridge
```

- Use saved environments as CI baselines
- Fail the build if the environment has drifted from the snapshot
- Generate diff reports as GitHub PR comments

---

## Architecture

```
+--------------------------------------------------------------+
|            debugbridge CLI (TypeScript + Node.js)            |
|  capture | restore | diff | push | pull | generate-docker   |
+------------------------+-------------------------------------+
                         |
                    .bridge files (JSON + signatures)
                         |
       +-----------------+------------------+
       |                                    |
+------v------+                   +---------v--------+
|  Local FS   |                   |  DebugBridge Hub |
|  .bridge    |                   |  (Team Registry) |
|  cache      |                   |  REST API        |
+-------------+                   +------------------+
                                          |
                                  +-------v------+
                                  |   MongoDB    |
                                  | (snapshots,  |
                                  |  teams, tags)|
                                  +--------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **CLI** | TypeScript, Node.js 20 | Core capture and restore logic |
| **Framework** | Express 4 | Hub REST API |
| **Database** | MongoDB 7, Mongoose | Snapshot and team storage |
| **Docker** | Docker, Docker Compose | Container generation + hub |
| **Auth** | JWT | Hub authentication |
| **CI** | GitHub Actions | Build, type-check, publish |

---

## Quick Start

### Install the CLI

```bash
npm install -g debugbridge
```

### Capture your environment

```bash
cd my-project
debugbridge capture --name "api-dev-baseline" --tag v1.0
# Saved: api-dev-baseline.bridge
```

### Restore on a new machine

```bash
debugbridge restore api-dev-baseline.bridge
# Installing Node 20.14.0...
# Installing 47 npm packages (pinned)...
# Writing .env...
# Done. Environment matches baseline.
```

### Generate a Dockerfile

```bash
debugbridge generate-docker api-dev-baseline.bridge > Dockerfile
docker build -t my-project:baseline .
```

---

## .bridge File Format

```json
{
  "name": "api-dev-baseline",
  "version": "1.0.0",
  "created": "2026-06-22T10:00:00Z",
  "runtime": {
    "node": "20.14.0",
    "npm": "10.7.0",
    "platform": "linux",
    "arch": "x64"
  },
  "packages": {
    "express": "4.19.2",
    "mongoose": "8.5.0"
  },
  "env": {
    "NODE_ENV": "development",
    "PORT": "5000",
    "MONGO_URI": "[REDACTED]"
  },
  "signature": "sha256:..."
}
```

---

## Roadmap

- [ ] Python (pip) and Java (Maven/Gradle) support
- [ ] VS Code extension: one-click capture from editor
- [ ] GitHub App: auto-capture on PR open
- [ ] Environment health scoring (staleness, security advisories)
- [ ] Terraform / infrastructure snapshot support
- [ ] Enterprise SSO for hub authentication

---

## License

```
Copyright (c) 2026 Akhil Vase. All rights reserved.

This source code is the proprietary property of Akhil Vase.
Unauthorized copying, distribution, or modification is strictly prohibited.
```

---

<div align="center">

**Stop debugging environments. Start shipping features.**

*DebugBridge -- Capture it once. Reproduce it everywhere.*

</div>
