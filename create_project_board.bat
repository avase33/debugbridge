@echo off
echo ===================================================
echo  DebugBridge — GitHub Project Board Setup
echo ===================================================

:: Create project board
gh project create --owner avase33 --title "DebugBridge Roadmap" --format board

echo Creating milestone issues...

gh issue create --repo avase33/debugbridge --title "MVP: Core snapshot upload and bridge generation" --body "Users can upload environment snapshots (JSON) via the web UI and get auto-generated Dockerfile, setup.sh, .env.template, and docker-compose.yml instantly." --label "milestone,backend,frontend"

gh issue create --repo avase33/debugbridge --title "CLI: npx debugbridge capture — zero-install environment capture" --body "Ship the CLI package to npm. Users run `npx debugbridge capture` in any project and get a full environment snapshot (OS, runtimes, packages, env vars, git state) uploaded automatically." --label "milestone,cli"

gh issue create --repo avase33/debugbridge --title "Diff Engine: side-by-side environment comparison with risk scoring" --body "Given two snapshots, produce a structured diff of runtimes, packages, OS fields, and env vars. Assign risk levels (high/medium/low) and surface the most critical differences first." --label "milestone,backend"

gh issue create --repo avase33/debugbridge --title "Debug Sessions: collaborative bug tracking with snapshot linking" --body "Let users create debug sessions, attach reporter and compare snapshots, run diffs, generate resolved bridge artifacts, and comment — all in one view." --label "milestone,backend,frontend"

gh issue create --repo avase33/debugbridge --title "Sensitive env var masking and security audit" --body "Automatically detect and mask sensitive env var values (API keys, tokens, passwords, secrets) before storage. Audit the masking heuristic against OWASP secret patterns. Add rate limiting on snapshot upload." --label "milestone,security"

gh issue create --repo avase33/debugbridge --title "Public Explore page — community snapshot and session sharing" --body "Add isPublic flag to snapshots and sessions. Build an Explore page showing the community's shared environments. Useful for comparing cloud runtime configs, common setups, etc." --label "milestone,frontend"

gh issue create --repo avase33/debugbridge --title "Docker Compose + production deployment pipeline" --body "Finalize docker-compose.yml for production (nginx + backend + mongo with health checks). Add GitHub Actions workflow: test → build → push ghcr.io → SSH deploy. Document deployment in README." --label "milestone,devops"

gh issue create --repo avase33/debugbridge --title "VS Code extension: in-editor capture and session creation" --body "Build a VS Code extension that runs `debugbridge capture` from the command palette, shows environment diffs in the sidebar, and lets users open sessions directly from the editor." --label "milestone,extension"

gh issue create --repo avase33/debugbridge --title "Team workspaces and organization support" --body "Add organization model with member roles (owner, admin, member). Snapshots and sessions scoped to workspace. Invite flow via email. Team-level usage stats dashboard." --label "milestone,backend,frontend"

gh issue create --repo avase33/debugbridge --title "AI-powered resolution suggestions from diff reports" --body "After running a diff, pass the diff report to an LLM (GPT-4o-mini) to generate plain-English explanations of why each difference might cause a bug, and suggest resolution steps. Surface in the Debug Session view." --label "milestone,ai"

echo.
echo ✅ Project board and 10 milestone issues created!
echo    View at: https://github.com/avase33/debugbridge/issues
echo.
pause
