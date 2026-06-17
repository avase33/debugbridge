# 🔍 DebugBridge

**Solve "It works on my machine" — forever.**

DebugBridge lets developers capture a full snapshot of their environment (OS, runtimes, packages, env vars, git state), share it with teammates, and auto-generate a Dockerfile + setup script that exactly reproduces it on any machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)

---

## The Problem

> "It works on my machine."

Every developer has heard this. Environment differences — Node.js versions, missing env vars, OS-specific quirks, mismatched dependencies — cause bugs that are invisible until someone else runs your code.

## The Solution

DebugBridge captures your entire environment in one command, diffs it against a colleague's, and generates a Docker environment that bridges the gap.

```bash
# Capture your environment
npx debugbridge capture --label "My MacBook M3"

# Paste the JSON into the DebugBridge app
# Get a Dockerfile + setup.sh + .env.template instantly
```

---

## Features

- **🔍 Environment Snapshots** — Capture OS, runtimes (Node, Python, Ruby, Go, Rust, Java), packages, env vars, git state
- **🔧 Bridge Generator** — Auto-generate Dockerfile, setup.sh, .env.template, docker-compose.yml from any snapshot
- **📊 Diff Engine** — Side-by-side comparison with risk scoring (high/medium/low) across runtimes, packages, OS, env vars
- **🐛 Debug Sessions** — Collaborative issue tracking: attach snapshots, run diffs, generate bridges, leave comments
- **🔐 Env Masking** — Sensitive keys (API tokens, passwords) are automatically masked — never stored in plaintext
- **🌐 Public Explore** — Share snapshots and debug sessions publicly with the community
- **⚡ CLI** — `npx debugbridge capture` works in any project with no setup

---

## Architecture

```
debugbridge/
├── backend/          # Node.js + Express API (port 5000)
│   ├── src/
│   │   ├── config/   # Environment config
│   │   ├── models/   # Mongoose schemas (User, Snapshot, Session)
│   │   ├── routes/   # REST endpoints (auth, snapshots, sessions)
│   │   ├── services/ # snapshotParser, bridgeGenerator, diffService, tokenService
│   │   └── middleware/
│   └── Dockerfile
├── frontend/         # React 18 + TypeScript + Vite + Tailwind (port 5174)
│   ├── src/
│   │   ├── pages/    # Dashboard, Snapshots, Sessions, Explore
│   │   ├── components/
│   │   ├── lib/api.ts
│   │   └── store/auth.ts
│   └── Dockerfile
├── cli/              # npx debugbridge — zero-install CLI
│   └── bin/debugbridge.js
└── docker-compose.yml
```

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/avase33/debugbridge
cd debugbridge
cp .env.example .env
docker compose up
```

App: http://localhost:5174 · API: http://localhost:5000

### Manual

```bash
# Backend
cd backend && npm install
cp ../.env.example .env
npm run dev        # starts on :5000

# Frontend (new terminal)
cd frontend && npm install
npm run dev        # starts on :5174
```

---

## CLI Usage

```bash
# Capture environment and print JSON (no account needed)
npx debugbridge capture

# Capture and upload to your DebugBridge account
DEBUGBRIDGE_TOKEN=<your-jwt> npx debugbridge capture --label "My Mac"

# Save snapshot locally
npx debugbridge capture --output snapshot.json
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT pair |
| POST | `/api/auth/refresh` | Refresh access token |
| GET  | `/api/snapshots` | List my snapshots |
| POST | `/api/snapshots` | Upload snapshot (auto-parses + generates bridge) |
| GET  | `/api/snapshots/:id` | Get snapshot details |
| GET  | `/api/snapshots/:id/bridge?file=dockerfile` | Download bridge artifact |
| POST | `/api/snapshots/:idA/diff/:idB` | Diff two snapshots |
| GET  | `/api/sessions` | List debug sessions |
| POST | `/api/sessions` | Create debug session |
| GET  | `/api/sessions/:id/diff` | Run environment diff for session |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + ES Modules |
| Backend | Express 4, Mongoose, JWT, bcryptjs |
| Database | MongoDB 7 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand, TanStack React Query |
| CLI | Commander.js, Ora, Chalk |
| Infra | Docker, Docker Compose, GitHub Actions |
| Bridge | semver, nanoid |

---

## Roadmap

- [ ] VS Code extension for in-editor capture
- [ ] Team workspaces with role-based access
- [ ] Slack/Discord integration for session notifications
- [ ] AI-powered resolution suggestions
- [ ] Environment diff webhooks (CI/CD integration)
- [ ] Windows-native PowerShell capture script

---

## License

MIT © Akhil Vase 2026
