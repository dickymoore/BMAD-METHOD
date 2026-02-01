---
name: gh-triage
description: Fetch all GitHub issues via gh CLI and provide consolidated AI-powered analysis with clustering, prioritization, and actionable insights. Use for issue triage, backlog cleanup, or when user mentions "issues", "triage", or "backlog".
license: MIT
metadata:
  author: bmad-code-org
  version: "2.1.0"
  anthropic-internal: Core team issue triage tool for BMad Method repositories
  min-github-cli-version: "2.0"
compatibility: Requires gh CLI, Python 3.8+, and git repository
---

# GitHub Issue Triage

**IMPORTANT:** Never include time or effort estimates in output or recommendations.

## What This Does

1. **Fetch all issues** from repository via gh CLI (configurable: open/closed/all)
2. **Extract data** into structured format (JSON + markdown tables)
3. **Generate AI analysis** with:
   - Issue clustering by theme
   - Priority recommendations
   - Actionable insights
   - Cross-repo detection
   - Cleanup candidates

## Steps

```bash
# 1. Navigate to scripts directory
cd .claude/skills/gh-triage/scripts

# 2. Run the triage tool (outputs to _bmad-output/triage-reports/)
python3 gh_triage.py --state open

# 3. Review the generated report
cat _bmad-output/triage-reports/triage-*.md
```

## Command Reference

| Parameter        | Description                                | Default                                            |
| ---------------- | ------------------------------------------ | -------------------------------------------------- |
| `--repo`         | Repository (auto-detected from git remote) | current repo                                       |
| `--state`        | Filter: `all`, `open`, `closed`            | `open`                                             |
| `--focus`        | Filter by keywords in title/body           | none                                               |
| `--output`, `-o` | Save output to file                        | `_bmad-output/triage-reports/triage-YYYY-MM-DD.md` |
| `--json`         | Output as JSON instead of markdown         | false (outputs to stdout)                          |
| `--limit`        | Max issues to fetch                        | 1000                                               |

## Output

All reports automatically save to `_bmad-output/triage-reports/` with:
- Summary statistics
- Issue clusters by theme
- Priority matrix
- Actionable recommendations
- Cross-repo issues with close commands
- Cleanup candidates (duplicates, stale, outdated)
