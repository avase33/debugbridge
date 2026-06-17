# DebugBridge -- Create GitHub Issues via REST API
# Run this from the debugbridge folder

param(
    [string]$Token = $env:GITHUB_TOKEN
)

$repo = "avase33/debugbridge"

# Try to get token from git credential manager if not provided
if (-not $Token) {
    try {
        $credInput = "protocol=https`nhost=github.com`n"
        $credOutput = $credInput | git credential fill 2>$null
        $Token = ($credOutput | Where-Object { $_ -match "^password=" }) -replace "^password=", ""
    } catch {}
}

if (-not $Token) {
    Write-Host "ERROR: No GitHub token found." -ForegroundColor Red
    Write-Host "Set GITHUB_TOKEN environment variable or pass -Token <your-pat>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Create a token at: https://github.com/settings/tokens/new" -ForegroundColor Cyan
    Write-Host "Required scope: repo" -ForegroundColor Cyan
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$baseUrl = "https://api.github.com/repos/$repo/issues"

$issues = @(
    @{
        title = "MVP: Core snapshot upload and bridge generation"
        body  = "Users can upload environment snapshots (JSON) via the web UI and get auto-generated Dockerfile, setup.sh, .env.template, and docker-compose.yml instantly."
        labels = @("enhancement")
    },
    @{
        title = "CLI: npx debugbridge capture - zero-install environment capture"
        body  = "Ship the CLI package to npm. Users run npx debugbridge capture in any project and get a full environment snapshot (OS, runtimes, packages, env vars, git state) uploaded automatically."
        labels = @("enhancement")
    },
    @{
        title = "Diff Engine: side-by-side environment comparison with risk scoring"
        body  = "Given two snapshots, produce a structured diff of runtimes, packages, OS fields, and env vars. Assign risk levels (high/medium/low) and surface the most critical differences first."
        labels = @("enhancement")
    },
    @{
        title = "Debug Sessions: collaborative bug tracking with snapshot linking"
        body  = "Let users create debug sessions, attach reporter and compare snapshots, run diffs, generate resolved bridge artifacts, and comment -- all in one view."
        labels = @("enhancement")
    },
    @{
        title = "Sensitive env var masking and security audit"
        body  = "Automatically detect and mask sensitive env var values (API keys, tokens, passwords, secrets) before storage. Audit the masking heuristic against OWASP secret patterns. Add rate limiting on snapshot upload."
        labels = @("security")
    },
    @{
        title = "Public Explore page - community snapshot and session sharing"
        body  = "Add isPublic flag to snapshots and sessions. Build an Explore page showing the community shared environments. Useful for comparing cloud runtime configs, common setups, etc."
        labels = @("enhancement")
    },
    @{
        title = "Docker Compose + production deployment pipeline"
        body  = "Finalize docker-compose.yml for production (nginx + backend + mongo with health checks). Add GitHub Actions workflow: test -> build -> push ghcr.io -> SSH deploy. Document deployment in README."
        labels = @("devops")
    },
    @{
        title = "VS Code extension: in-editor capture and session creation"
        body  = "Build a VS Code extension that runs debugbridge capture from the command palette, shows environment diffs in the sidebar, and lets users open sessions directly from the editor."
        labels = @("enhancement")
    },
    @{
        title = "Team workspaces and organization support"
        body  = "Add organization model with member roles (owner, admin, member). Snapshots and sessions scoped to workspace. Invite flow via email. Team-level usage stats dashboard."
        labels = @("enhancement")
    },
    @{
        title = "AI-powered resolution suggestions from diff reports"
        body  = "After running a diff, pass the diff report to an LLM (GPT-4o-mini) to generate plain-English explanations of why each difference might cause a bug, and suggest resolution steps."
        labels = @("enhancement", "ai")
    }
)

Write-Host "Creating 10 milestone issues on $repo..." -ForegroundColor Cyan
Write-Host ""

$created = 0
foreach ($issue in $issues) {
    $body = @{
        title  = $issue.title
        body   = $issue.body
        labels = $issue.labels
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "  [OK] #$($response.number): $($issue.title)" -ForegroundColor Green
        $created++
    } catch {
        Write-Host "  [FAIL] $($issue.title): $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "Done! $created/10 issues created." -ForegroundColor Green
Write-Host "View at: https://github.com/$repo/issues" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
