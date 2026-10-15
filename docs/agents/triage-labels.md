# Labels and readiness

This document maps workflow meaning to GitHub labels. Label creation/assignment requires task authority; creating setup labels does not authorize a backlog.

## Work roles

| Label | Description | Color |
| --- | --- | --- |
| `spec` | Product specification and acceptance criteria | `5319e7` |
| `implementation-step` | Bounded design, implementation, or validation work under a spec | `1d76db` |
| `needs-triage` | Scope or routing needs examination | `fbca04` |
| `needs-info` | Required decision or evidence is missing | `d4c5f9` |
| `ready-for-agent` | Actionable for an agent, subject to native blockers | `0e8a16` |
| `ready-for-human` | Next action requires a human decision or capability | `f9d0c4` |

Apply `spec` when creating a specification issue and read it back. Apply `implementation-step` to bounded tickets under a spec and read it back; those roles are mutually exclusive. Delivery PRs are not implementation-step issues. Determine roles from purpose and native relationships, not title prefixes or copied parent labels.

Readiness is evaluated separately from role. Reassess it against accepted criteria and completed dependencies. Child tickets may be actionable but still blocked; preserve native blockers. Confirm assignment changes by read-back.

## Release impact

Apply one resolved impact label to a delivered PR when it affects a release:

| Label | Description | Color |
| --- | --- | --- |
| `patch` | Backward-compatible bug fix | `0e8a16` |
| `minor` | Compatible feature; pre-1.0 features or breaking changes | `1d76db` |
| `major` | Incompatible public change at or after 1.0 | `b60205` |

The [workflow](workflow.md#versioning-and-releases) owns version semantics and publication authority. Choose the highest actual impact for the single package; a spec need not predict its eventual bump. Documentation or setup-only work may use no impact label.

## Default-label audit

Keep `accessibility`, `bug`, `documentation`, `duplicate`, `enhancement`, `invalid`, `question`, and `wontfix` with their existing GitHub metadata. The additional `accessibility` default was observed at repository creation and preserved. They retain their ordinary classification meanings; in particular, `wontfix` records explicitly declined work with rationale.

`good first issue` and `help wanted` were removed during setup after confirming no issue/PR assignments, as approved by SirDarcanos. Check all open and closed issue/PR assignments and automation before removal; a newly discovered use requires reconciliation. Preserve unexpected labels and report them rather than expanding cleanup authority.

No issue assignments, title migrations, parent changes, dependency changes, or backlog creation were approved as part of setup.
