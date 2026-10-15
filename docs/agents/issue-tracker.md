# Issue tracker

Use [GitHub Issues](https://github.com/SirDarcanos/pi-chat-bubbles/issues) for this repository. Use the existing authorized GitHub CLI account; access availability does not grant permission to mutate issues or PRs.

Before creating or changing issues, obtain approval for the bounded scope and apply the [label roles](triage-labels.md). Use concise descriptive titles without mandatory prefixes. A standalone bug or small change does not need a speculative spec hierarchy.

## Native relationships

GitHub sub-issues represent spec ownership; blocked-by/blocking edges represent execution dependencies. Labels, checklists, and “blocked by” prose supplement those relationships rather than replacing them.

For approved graph changes:
1. Read current issues, native parents/blockers, and all response pages. Resolve repository identity and numeric database IDs; issue numbers are not database IDs.
2. Preserve existing unrelated edges. Ask before reparenting or removing a relationship. Check self-links and cycles across both current and proposed edges.
3. Use current GitHub sub-issue/dependency APIs for missing approved edges only.
4. Read back both directions: child parent and parent children; dependent blockers and blocker dependents. Compare actual IDs.

If the API, permissions, or platform cannot support a relationship, report the blocker and request an alternative. Do not claim a text-only dependency is a native edge. No relationship writes or live test issues were part of setup, so live graph behavior remains unverified.

## Readiness and completion

A readiness label means the criteria, decisions, and evidence support that role's next action. Actual unresolved blockers still control scheduling. A ready parent spec permits coordination of eligible children, not duplicate implementation of the parent.

Issue closure and merged PRs are not sufficient verification. Report acceptance evidence and remaining work; reassess readiness after material decisions or merges. Mutate issue state or labels only within the current task's approval.
