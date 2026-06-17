@echo off
echo ===================================================
echo  DebugBridge — GitHub Repository Setup
echo ===================================================

:: Create GitHub repo (public)
gh repo create avase33/debugbridge --public --description "Solve 'It works on my machine' — capture, diff, and reproduce any dev environment" --homepage "https://github.com/avase33/debugbridge"

:: Initialize git
git init
git add .
git commit -m "feat: initial DebugBridge implementation

- Full-stack Node.js + Express + React application
- Environment snapshot capture (OS, runtimes, packages, env vars)
- Bridge generator: Dockerfile, setup.sh, .env.template, docker-compose.yml
- Diff engine with risk scoring (high/medium/low)
- Debug sessions with snapshot comparison and collaboration
- CLI: npx debugbridge capture
- Sensitive env var masking
- JWT authentication with refresh tokens
- Docker Compose + GitHub Actions CI/CD

MIT License — Akhil Vase 2026"

:: Set remote and push
git remote add origin https://github.com/avase33/debugbridge.git
git branch -M main
git push -u origin main

echo.
echo ✅ DebugBridge pushed to https://github.com/avase33/debugbridge
echo.
pause
