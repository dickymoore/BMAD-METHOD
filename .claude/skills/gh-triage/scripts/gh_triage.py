#!/usr/bin/env python3
"""
GitHub Issue Triage Tool

Fetches, categorizes, and groups GitHub issues for efficient triage.
Optimized for large datasets with parallel processing support.

IMPORTANT: Never provide time, date, or effort estimates in output.
AI execution speed varies greatly from human timelines.
Focus on what needs to be done, not how long it takes.
"""

import argparse
import json
import os
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Set, Tuple
from enum import Enum
from difflib import SequenceMatcher
import re


class Category(Enum):
    """Issue categories"""
    BUG = "bug"
    FEATURE = "feature"
    ENHANCEMENT = "enhancement"
    DOCUMENTATION = "documentation"
    PERFORMANCE = "performance"
    SECURITY = "security"
    QUESTION = "question"
    REFACTOR = "refactor"
    TECH_DEBT = "tech-debt"
    OTHER = "other"


class Priority(Enum):
    """Priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class TriagingStatus(Enum):
    """Triage status"""
    NEEDS_TRIAGE = "needs-triage"
    READY_FOR_DEV = "ready-for-dev"
    BLOCKED = "blocked"
    STALE = "stale"
    DUPLICATE = "duplicate"
    INVALID = "invalid"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


@dataclass
class Issue:
    """Represents a GitHub issue with triage metadata"""
    number: int
    title: str
    state: str
    author: str
    created_at: datetime
    updated_at: Optional[datetime]
    labels: List[str]
    body: Optional[str]
    comments: int
    category: Category = field(default=Category.OTHER)
    priority: Priority = field(default=Priority.MEDIUM)
    triage_status: TriagingStatus = field(default=TriagingStatus.NEEDS_TRIAGE)

    @property
    def age_days(self) -> int:
        """Age of issue in days"""
        return (datetime.now(timezone.utc) - self.created_at).days

    @property
    def days_since_update(self) -> Optional[int]:
        """Days since last update"""
        if not self.updated_at:
            return None
        return (datetime.now(timezone.utc) - self.updated_at).days

    @property
    def url(self) -> str:
        """GitHub URL for the issue"""
        # Get from parent triage object
        return f"https://github.com/{self._repo_url}/issues/{self.number}"


class IssueCategorizer:
    """Categorizes issues based on content and metadata"""

    # Keywords for categorization
    CATEGORY_KEYWORDS = {
        Category.BUG: ['bug', 'fix', 'crash', 'error', 'broken', 'fails', 'exception', 'segfault', 'leak'],
        Category.FEATURE: ['feature', 'add ', 'implement', 'support for', 'new ', 'request', 'wish'],
        Category.ENHANCEMENT: ['enhance', 'improve', 'optimize', 'better', 'enhancement'],
        Category.DOCUMENTATION: ['doc', 'readme', 'tutorial', 'guide', 'documentation', 'example', 'comment'],
        Category.PERFORMANCE: ['slow', 'performance', 'latency', 'speed', 'fast', 'optimize', 'memory'],
        Category.SECURITY: ['security', 'vulnerability', 'exploit', 'xss', 'injection', 'csrf', 'auth'],
        Category.QUESTION: ['question', 'how to', 'help', 'confusion', 'unclear', 'clarify'],
        Category.REFACTOR: ['refactor', 'clean up', 'reorganize', 'restructure', 'simplify'],
        Category.TECH_DEBT: ['tech debt', 'technical debt', 'legacy', 'deprecated', 'cleanup'],
    }

    # Priority indicators from labels
    PRIORITY_LABELS = {
        Priority.CRITICAL: ['critical', 'blocker', 'urgent'],
        Priority.HIGH: ['high', 'important', 'priority'],
        Priority.MEDIUM: ['medium'],
        Priority.LOW: ['low', 'minor', 'trivial'],
    }

    def categorize(self, issue: Issue) -> Category:
        """Determine category based on title, body, and labels"""
        text = f"{issue.title} {issue.body or ''}".lower()

        # Check labels first
        for label in issue.labels:
            label_lower = label.lower()
            if any(cat_str in label_lower for cat_str in ['bug', 'defect']):
                return Category.BUG
            if any(cat_str in label_lower for cat_str in ['feature', 'enhancement']):
                return Category.FEATURE
            if 'doc' in label_lower:
                return Category.DOCUMENTATION
            if 'perf' in label_lower:
                return Category.PERFORMANCE
            if 'security' in label_lower:
                return Category.SECURITY

        # Check keywords
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return category

        return Category.OTHER

    def determine_priority(self, issue: Issue) -> Priority:
        """Determine priority based on labels and metadata"""
        # Check labels
        for label in issue.labels:
            label_lower = label.lower()
            for priority, keywords in self.PRIORITY_LABELS.items():
                if any(keyword in label_lower for keyword in keywords):
                    return priority

        # Infer from metadata
        if issue.age_days > 90 and issue.state == 'open':
            # Old open issues are lower priority
            return Priority.LOW

        if issue.comments > 10:
            # Highly discussed issues are important
            return Priority.HIGH

        return Priority.MEDIUM

    def determine_triage_status(self, issue: Issue) -> TriagingStatus:
        """Determine triage status"""
        # Check labels
        for label in issue.labels:
            label_lower = label.lower()
            if 'duplicate' in label_lower:
                return TriagingStatus.DUPLICATE
            if any(x in label_lower for x in ['invalid', 'wontfix', 'wont-fix']):
                return TriagingStatus.INVALID
            if 'blocked' in label_lower or 'blocking' in label_lower:
                return TriagingStatus.BLOCKED
            if any(x in label_lower for x in ['in-progress', 'in progress', 'working']):
                return TriagingStatus.IN_PROGRESS

        # Check staleness
        if issue.state.upper() == 'OPEN':
            if issue.days_since_update and issue.days_since_update > 30:
                return TriagingStatus.STALE
            if not any(label.lower() in ['accepted', 'approved', 'ready'] for label in issue.labels):
                return TriagingStatus.NEEDS_TRIAGE
            return TriagingStatus.READY_FOR_DEV

        return TriagingStatus.COMPLETED


class IssueTriage:
    """Main triage coordinator"""

    # Module repository mapping
    MODULE_REPOS = {
        'builder': {
            'repo': 'bmad-code-org/bmad-builder',
            'names': ['bmb', 'builder', 'bmad-builder', 'agent builder', 'agent-builder'],
            'url': 'https://github.com/bmad-code-org/bmad-builder'
        },
        'tea': {
            'repo': 'bmad-code-org/bmad-method-test-architecture-enterprise',
            'names': ['tea', 'test architect', 'test-architect', 'test architecture'],
            'url': 'https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise'
        },
        'bmgd': {
            'repo': 'bmad-code-org/bmad-module-game-dev-studio',
            'names': ['bmgd', 'game dev', 'game-dev', 'gamedev', 'game dev studio', 'game-dev-studio'],
            'url': 'https://github.com/bmad-code-org/bmad-module-game-dev-studio'
        },
        'cis': {
            'repo': 'bmad-code-org/bmad-module-creative-intelligence-suite',
            'names': ['cis', 'creative intelligence', 'creative-intelligence', 'creative intelligence suite'],
            'url': 'https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite'
        },
    }

    def __init__(self, repo: Optional[str] = None, state: str = 'open'):
        self.repo = repo or self._detect_repo()
        self.state = state
        self.categorizer = IssueCategorizer()
        self.issues: List[Issue] = []
        self._repo_url = self.repo  # Store for issue URL generation

    def _detect_repo(self) -> str:
        """Detect repository from git remote"""
        try:
            result = subprocess.run(
                ['git', 'remote', 'get-url', 'origin'],
                capture_output=True,
                text=True,
                check=True
            )
            url = result.stdout.strip()
            # Convert git@github.com:user/repo.git to user/repo
            if url.startswith('git@github.com:'):
                return url[15:-4]
            if url.startswith('https://github.com/'):
                return url[19:-4]
        except subprocess.CalledProcessError:
            pass
        return 'unknown/repo'

    def fetch_issues(self) -> List[Issue]:
        """Fetch issues using gh CLI"""
        print(f"Fetching issues from {self.repo}...")

        cmd = [
            'gh', 'issue', 'list',
            '--repo', self.repo,
            '--state', self.state,
            '--limit', '1000',  # Fetch up to 1000 issues (default is 30)
            '--json', 'number,title,state,author,createdAt,updatedAt,labels,body,comments'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)

        self.issues = []
        for item in data:
            labels = [label['name'] for label in item.get('labels', [])]
            issue = Issue(
                number=item['number'],
                title=item['title'],
                state=item['state'],
                author=item['author']['login'],
                created_at=datetime.fromisoformat(item['createdAt'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(item['updatedAt'].replace('Z', '+00:00')) if item.get('updatedAt') else None,
                labels=labels,
                body=item.get('body'),
                comments=len(item.get('comments', []))
            )
            issue._repo_url = self._repo_url
            self.issues.append(issue)

        print(f"Fetched {len(self.issues)} issues")
        return self.issues

    def analyze_issues(self, focus_filter: Optional[str] = None) -> List[Issue]:
        """Analyze and categorize all issues"""
        print("Analyzing issues...")

        for issue in self.issues:
            issue.category = self.categorizer.categorize(issue)
            issue.priority = self.categorizer.determine_priority(issue)
            issue.triage_status = self.categorizer.determine_triage_status(issue)

        # Apply focus filter if provided
        if focus_filter:
            keywords = focus_filter.lower().split()
            self.issues = [
                issue for issue in self.issues
                if any(keyword in f"{issue.title} {issue.body or ''}".lower()
                      for keyword in keywords)
            ]
            print(f"Filtered to {len(self.issues)} issues matching focus criteria")

        return self.issues

    def find_duplicates(self, threshold: float = 0.7) -> List[Tuple[Issue, Issue, float]]:
        """Find potential duplicate issues based on title similarity"""
        print("Detecting potential duplicates...")
        duplicates = []
        open_issues = [i for i in self.issues if i.state.upper() == 'OPEN']

        for i, issue1 in enumerate(open_issues):
            for issue2 in open_issues[i+1:]:
                # Skip if already marked as duplicate
                if 'duplicate' in [l.lower() for l in issue1.labels + issue2.labels]:
                    continue

                # Calculate title similarity
                similarity = SequenceMatcher(None, issue1.title.lower(), issue2.title.lower()).ratio()

                if similarity >= threshold:
                    duplicates.append((issue1, issue2, similarity))

        # Sort by similarity (highest first)
        duplicates.sort(key=lambda x: x[2], reverse=True)
        return duplicates

    def find_outdated_issues(self, before_date: datetime = None) -> Dict[str, List[Issue]]:
        """Find issues that are likely outdated"""
        print("Identifying outdated issues...")

        if before_date is None:
            # Default to December 1, 2025
            before_date = datetime(2025, 12, 1, tzinfo=timezone.utc)

        outdated = {
            'old_issues': [],
            'v4_issues': [],
            'ancient_stale': []
        }

        open_issues = [i for i in self.issues if i.state.upper() == 'OPEN']

        for issue in open_issues:
            # Issues created before cutoff date
            if issue.created_at < before_date:
                outdated['old_issues'].append(issue)

            # Issues mentioning v4
            text = f"{issue.title} {issue.body or ''}".lower()
            if 'v4' in text or 'version 4' in text or 'v 4' in text:
                outdated['v4_issues'].append(issue)

            # Issues very old and stale (>90 days since update)
            if issue.age_days > 90 and (issue.days_since_update or 0) > 90:
                outdated['ancient_stale'].append(issue)

        return outdated

    def generate_bulk_commands(self, issues: List[Issue], label: str) -> List[str]:
        """Generate gh CLI commands for bulk operations"""
        commands = []
        for issue in issues:
            cmd = f"gh issue edit {issue.number} --repo {self.repo} --add-label '{label}'"
            commands.append(cmd)
        return commands

    def generate_close_commands(self, issues: List[Issue], reason: str) -> List[str]:
        """Generate gh CLI commands to close issues with comment"""
        commands = []
        for issue in issues:
            comment = reason.replace("'", "'\\''")  # Escape single quotes
            cmd = (f"gh issue close {issue.number} --repo {self.repo} "
                   f"--comment '{comment}'")
            commands.append(cmd)
        return commands

    def find_cross_repo_issues(self) -> Dict[str, List[Tuple[Issue, str]]]:
        """Find issues that belong in other module repositories"""
        print("Detecting cross-repo issues...")
        cross_repo = defaultdict(list)

        open_issues = [i for i in self.issues if i.state.upper() == 'OPEN']

        for issue in open_issues:
            text = f"{issue.title} {issue.body or ''}".lower()

            for module_key, module_info in self.MODULE_REPOS.items():
                # Check if issue mentions this module
                for name in module_info['names']:
                    # Use word boundaries to avoid false positives
                    pattern = r'\b' + re.escape(name) + r'\b'
                    if re.search(pattern, text):
                        cross_repo[module_key].append((issue, name))
                        break  # Only add once per issue

        return cross_repo

    def generate_actionable_recommendations(self) -> str:
        """Generate actionable recommendations with specific commands"""
        lines = []
        open_issues = [i for i in self.issues if i.state.upper() == 'OPEN']

        lines.append("## 🎯 Actionable Recommendations\n")

        # Cross-repo issues (show first!)
        cross_repo_issues = self.find_cross_repo_issues()
        if cross_repo_issues:
            total_cross = sum(len(issues) for issues in cross_repo_issues.values())
            lines.append(f"### Issues in Wrong Repository ({total_cross} issues)\n")
            lines.append("**High Priority.** These issues should be closed here and opened in the correct module repository:\n")

            for module_key, issues in cross_repo_issues.items():
                if issues:
                    module_info = self.MODULE_REPOS[module_key]
                    lines.append(f"#### {module_info['repo'].replace('bmad-code-org/', '').title()} ({len(issues)} issues)")
                    lines.append(f"**Correct repo:** [{module_info['repo']}]({module_info['url']}/issues/new)\n")
                    lines.append(f"**Close these and report in the correct repo:**")
                    lines.append(f"```bash")

                    for issue, matched_name in issues[:10]:  # Show first 10
                        comment = (f"This issue relates to {matched_name} which is maintained in a separate repository. "
                                 f"Please report this issue at {module_info['url']}/issues/new")
                        lines.append(f"gh issue close {issue.number} --repo {self.repo} --comment '{comment}'")

                    if len(issues) > 10:
                        lines.append(f"# ... and {len(issues) - 10} more")
                    lines.append(f"```\n")

        # Find duplicates
        duplicates = self.find_duplicates()
        if duplicates:
            lines.append(f"### Potential Duplicates ({len(duplicates)} pairs)\n")
            lines.append("**Manual review required.** Close the older issue as a duplicate of the newer one:\n")
            for issue1, issue2, similarity in duplicates[:20]:  # Top 20
                older = issue1 if issue1.created_at < issue2.created_at else issue2
                newer = issue2 if issue1.created_at < issue2.created_at else issue1
                lines.append(f"#### {older.title}")
                lines.append(f"- **Older:** #{older.number} ({older.age_days} days old)")
                lines.append(f"- **Newer:** #{newer.number} ({newer.age_days} days old)")
                lines.append(f"- **Similarity:** {similarity:.1%}")
                lines.append(f"- **Command:** `gh issue close {older.number} --repo {self.repo} --comment 'Duplicate of #{newer.number}' --duplicate-of {newer.number}`")
                lines.append("")

        # Find outdated issues
        outdated = self.find_outdated_issues()
        total_outdated = len(outdated['old_issues']) + len(outdated['v4_issues']) + len(outdated['ancient_stale'])

        if total_outdated > 0:
            lines.append(f"### Outdated Issues ({total_outdated} total)\n")

            # Pre-Dec 2025 issues
            if outdated['old_issues']:
                cutoff_date = datetime(2025, 12, 1, tzinfo=timezone.utc).strftime('%B %Y')
                lines.append(f"#### Issues from before {cutoff_date} ({len(outdated['old_issues'])})")
                lines.append(f"These issues are quite old and may no longer be relevant. Consider reviewing and closing outdated ones.\n")
                lines.append("**To add label for review:**")
                lines.append(f"```bash")
                for issue in outdated['old_issues'][:10]:  # Show first 10
                    lines.append(f"gh issue edit {issue.number} --repo {self.repo} --add-label 'outdated,needs-review'")
                if len(outdated['old_issues']) > 10:
                    lines.append(f"# ... and {len(outdated['old_issues']) - 10} more")
                lines.append(f"```\n")

            # v4-related issues
            if outdated['v4_issues']:
                lines.append(f"#### v4-Related Issues ({len(outdated['v4_issues'])})")
                lines.append(f"BMad Method v4 is deprecated. These issues likely no longer apply to v6.\n")
                lines.append("**Bulk close with comment:**")
                lines.append(f"```bash")
                for issue in outdated['v4_issues'][:10]:
                    lines.append(f"gh issue close {issue.number} --repo {self.repo} --comment 'Closing as this relates to BMad Method v4 which is deprecated. Please open a new issue if this still applies to v6.'")
                if len(outdated['v4_issues']) > 10:
                    lines.append(f"# ... and {len(outdated['v4_issues']) - 10} more")
                lines.append(f"```\n")

            # Ancient stale issues
            if outdated['ancient_stale']:
                lines.append(f"#### Ancient Stale Issues ({len(outdated['ancient_stale'])})")
                lines.append(f"Issues that are both very old (>90 days) and haven't been updated in >90 days.\n")
                lines.append("**Close as stale:**")
                lines.append(f"```bash")
                for issue in outdated['ancient_stale'][:10]:
                    lines.append(f"gh issue close {issue.number} --repo {self.repo} --comment 'Closing due to inactivity. Please reopen if this is still relevant.'")
                if len(outdated['ancient_stale']) > 10:
                    lines.append(f"# ... and {len(outdated['ancient_stale']) - 10} more")
                lines.append(f"```\n")

        # Bulk tagging suggestions
        lines.append("### Bulk Tagging Suggestions\n")
        lines.append("Add appropriate labels to untagged issues:\n")

        # Find issues without category labels
        untagged = [i for i in open_issues if not any(
            l.lower() in ['bug', 'feature', 'enhancement', 'documentation', 'performance', 'question', 'refactor', 'tech-debt']
            for l in i.labels
        )]

        if untagged:
            lines.append(f"**Issues without category labels ({len(untagged)}):**\n")
            by_category = defaultdict(list)
            for issue in untagged:
                by_category[issue.category.value].append(issue)

            for category, issues in sorted(by_category.items(), key=lambda x: len(x[1]), reverse=True)[:5]:
                lines.append(f"##### Label as `{category}` ({len(issues)} issues)")
                lines.append(f"```bash")
                for issue in issues[:5]:
                    lines.append(f"gh issue edit {issue.number} --repo {self.repo} --add-label '{category}'")
                if len(issues) > 5:
                    lines.append(f"# ... and {len(issues) - 5} more")
                lines.append(f"```\n")

        # Priority labeling
        no_priority = [i for i in open_issues if not any(
            l.lower() in ['critical', 'high', 'medium', 'low', 'priority']
            for l in i.labels
        )]

        if no_priority:
            # Group by priority
            by_priority = defaultdict(list)
            for issue in no_priority:
                by_priority[issue.priority.value].append(issue)

            lines.append("**Add priority labels:**\n")
            for priority_level in ['critical', 'high', 'medium', 'low']:
                if priority_level in by_priority:
                    count = len(by_priority[priority_level])
                    lines.append(f"##### Label as `{priority_level}` priority ({count} issues)")
                    lines.append(f"```bash")
                    for issue in by_priority[priority_level][:5]:
                        lines.append(f"gh issue edit {issue.number} --repo {self.repo} --add-label '{priority_level}'")
                    if count > 5:
                        lines.append(f"# ... and {count - 5} more")
                    lines.append(f"```\n")

        return "\n".join(lines)

    def generate_report(self) -> str:
        """Generate markdown triage report"""
        lines = []

        # Summary
        lines.append("# GitHub Issue Triage Report\n")
        lines.append(f"**Repository:** {self.repo}\n")
        lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")

        # Count stats
        total = len(self.issues)
        open_issues = [i for i in self.issues if i.state.upper() == 'OPEN']
        closed_issues = [i for i in self.issues if i.state.upper() == 'CLOSED']

        lines.append("## Summary\n")
        lines.append(f"- **Total Issues:** {total}")
        lines.append(f"- **Open:** {len(open_issues)} | **Closed:** {len(closed_issues)}")

        # Category breakdown
        category_counts = defaultdict(int)
        for issue in self.issues:
            category_counts[issue.category] += 1
        top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        lines.append(f"- **Top Categories:** {', '.join(f'{cat.value} ({count})' for cat, count in top_categories)}")
        lines.append("")

        # Priority action items
        lines.append("## Priority Action Items\n")

        # Critical/High priority open issues
        critical_issues = [i for i in open_issues if i.priority in [Priority.CRITICAL, Priority.HIGH]]
        if critical_issues:
            lines.append(f"### {'🚨 ' if critical_issues else ''}Critical & High Priority ({len(critical_issues)})\n")
            for issue in sorted(critical_issues, key=lambda x: x.age_days, reverse=True):
                lines.append(f"- [#{issue.number}]({issue.url}) {issue.title}")
                lines.append(f"  - {issue.category.value.upper()} | {issue.priority.value.upper()} | Age: {issue.age_days} days")
                if issue.labels:
                    lines.append(f"  - Labels: {', '.join(issue.labels)}")
                lines.append("")

        # Stale issues needing review
        stale_issues = [i for i in open_issues if i.triage_status == TriagingStatus.STALE]
        if stale_issues:
            lines.append(f"### Stale Issues - Needs Review ({len(stale_issues)})\n")
            for issue in sorted(stale_issues, key=lambda x: x.days_since_update or 0, reverse=True)[:15]:
                days_stale = issue.days_since_update or 0
                lines.append(f"- [#{issue.number}]({issue.url}) {issue.title}")
                lines.append(f"  - Last updated {days_stale} days ago | {issue.category.value}")
                lines.append("")

        # Categories
        lines.append("## Categories\n")

        for category in Category:
            category_issues = [i for i in self.issues if i.category == category]
            if not category_issues:
                continue

            open_in_cat = [i for i in category_issues if i.state.upper() == 'OPEN']
            closed_in_cat = [i for i in category_issues if i.state.upper() == 'CLOSED']

            lines.append(f"### {category.value.title()} ({len(open_in_cat)} open, {len(closed_in_cat)} closed)\n")

            # Sort open by priority
            priority_order = {Priority.CRITICAL: 0, Priority.HIGH: 1, Priority.MEDIUM: 2, Priority.LOW: 3, Priority.INFORMATIONAL: 4}
            open_in_cat_sorted = sorted(open_in_cat, key=lambda x: priority_order.get(x.priority, 5))

            for issue in open_in_cat_sorted[:20]:  # Limit to 20 per category
                status_icon = {
                    TriagingStatus.NEEDS_TRIAGE: '🔍',
                    TriagingStatus.READY_FOR_DEV: '✅',
                    TriagingStatus.BLOCKED: '🚫',
                    TriagingStatus.STALE: '💤',
                    TriagingStatus.IN_PROGRESS: '🔧',
                }.get(issue.triage_status, '')

                lines.append(f"{status_icon} [#{issue.number}]({issue.url}) {issue.title}")
                lines.append(f"  <details><summary>Details</summary>")
                lines.append(f"  ")
                lines.append(f"  - **Priority:** {issue.priority.value}")
                lines.append(f"  - **Status:** {issue.triage_status.value}")
                lines.append(f"  - **Age:** {issue.age_days} days")
                lines.append(f"  - **Author:** {issue.author}")
                if issue.labels:
                    lines.append(f"  - **Labels:** {', '.join(issue.labels)}")
                lines.append(f"  </details>")
                lines.append("")

            if len(open_in_cat) > 20:
                lines.append(f"*... and {len(open_in_cat) - 20} more*\n")

        # Actionable recommendations
        lines.append(self.generate_actionable_recommendations())

        # Cleanup candidates
        lines.append("## Cleanup Candidates\n")

        duplicates = [i for i in self.issues if i.triage_status == TriagingStatus.DUPLICATE]
        if duplicates:
            lines.append(f"### Duplicates ({len(duplicates)})\n")
            for issue in duplicates:
                lines.append(f"- [#{issue.number}]({issue.url}) {issue.title}")

        invalid = [i for i in self.issues if i.triage_status == TriagingStatus.INVALID]
        if invalid:
            lines.append(f"\n### Invalid/Wontfix ({len(invalid)})\n")
            for issue in invalid:
                lines.append(f"- [#{issue.number}]({issue.url}) {issue.title}")

        lines.append("\n---\n")
        lines.append("*Report generated by BMad Issue Triage Tool*")

        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='Triage and categorize GitHub issues',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Triage open issues in current repo
  %(prog)s --state all               # All issues (including closed)
  %(prog)s --focus "installer"       # Filter for installer-related issues
  %(prog)s --repo user/repo --state closed
        """
    )

    parser.add_argument('--repo', help='Repository (default: detect from git)')
    parser.add_argument('--state', choices=['all', 'open', 'closed'], default='open',
                       help='Filter by state (default: open)')
    parser.add_argument('--focus', help='Focus context to filter issues')
    parser.add_argument('--output', '-o', help='Output file (default: _bmad-output/triage-reports/triage-<date>.md)')
    parser.add_argument('--json', action='store_true', help='Output as JSON')

    args = parser.parse_args()

    # Set default output to _bmad-output/triage-reports if not specified
    if not args.output and not args.json:
        os.makedirs('_bmad-output/triage-reports', exist_ok=True)
        output_date = datetime.now().strftime('%Y-%m-%d')
        args.output = f'_bmad-output/triage-reports/triage-{output_date}.md'

    triage = IssueTriage(repo=args.repo, state=args.state)
    triage.fetch_issues()
    triage.analyze_issues(focus_filter=args.focus)

    if args.json:
        # Output as JSON for further processing
        data = [
            {
                'number': i.number,
                'title': i.title,
                'state': i.state,
                'category': i.category.value,
                'priority': i.priority.value,
                'triage_status': i.triage_status.value,
                'age_days': i.age_days,
                'url': i.url,
                'labels': i.labels,
                'author': i.author
            }
            for i in triage.issues
        ]
        output = json.dumps(data, indent=2)
    else:
        output = triage.generate_report()

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        # Get relative path for nicer output
        rel_path = args.output.replace('./', '')
        print(f"✅ Report saved to: {rel_path}")
    else:
        print(output)


if __name__ == '__main__':
    main()
