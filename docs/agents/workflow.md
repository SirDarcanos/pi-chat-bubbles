# Workflow

## Authority

SirDarcanos owns product, design, release, and repository-policy decisions. Agents may inspect and implement a requested change and run safe local checks. Obtain explicit approval before commits, pushes, PR creation or merge, publishing, deployment, spending, destructive operations, credential changes, global installations, or delegation. The [model-use policy](model-use.md) governs auxiliary assessments separately.

The initial setup approval on 2026-10-15 permits the documented dependency installation, GitHub configuration, first commit, and first push. It is not continuing authority for later commits or releases. Preserve unrelated work and ask when approval or ownership is unclear.

## Delivery

Use short-lived feature branches and pull requests into `main`. There is no persistent development branch. The agreed main-branch controls require a PR and the `checks` CI job, with zero mandatory reviewer approvals, no bypass actors, and blocked force-pushes/deletion. Check live GitHub rules before relying on enforcement; desired policy alone is not evidence.

The executable check definitions live in [package.json](../../package.json) and [CI](../../.github/workflows/checks.yml). Use a clean `npm ci` when validating dependency changes; the package must not depend on global Pi symlinks. Run typecheck and tests for delivery. Inspect `npm pack --dry-run --json` when changing packaging.

Choose regression tests by the failure being protected, not a coverage quota. For rendering changes, inspect a rendered fixture and test relevant widths, streaming, theme updates, terminal markers, and reload restoration. Request a live screenshot when terminal behavior cannot be established locally. Automated preview success does not prove the user's terminal looks correct.

Before an approved commit/push, inspect the exact staged file list and diff for logs, secrets, private paths, generated previews, and unintended changes. Report checks actually run, failures, and limitations. Independent review or auxiliary services require their own approval.

## Versioning and releases

The release unit is the npm package `pi-chat-bubbles`. [package.json](../../package.json) owns the version, with matching lockfile metadata; [CHANGELOG.md](../../CHANGELOG.md) owns hand-maintained notable change history. There is no release automation.

Use Semantic Versioning:
- Before 1.0: compatible fixes increment patch; features and incompatible behavior changes increment minor. Call out breaking changes explicitly.
- At/after 1.0: fixes increment patch, compatible features increment minor, incompatible changes increment major.
- Moving to 1.0 requires an explicit maintainer decision.

Classify delivered PRs using [release-impact labels](triage-labels.md); resolve the highest actual impact rather than inferring a bump from issue type. Labels are not release authorization.

Add a concise Unreleased entry for notable user-facing changes. Documentation-only or internal changes may need no entry; explain why. Preserve released history and record release dates only when supported by an actual release.

Version bumps, tags, GitHub releases, and npm publication each require explicit approval. Release preparation checks the aggregate changelog, clean-install checks, package contents, and current name/credential availability. Setup does not provision npm credentials or trusted publishing.

Preserve the `pi-package` keyword and declared `pi.extensions` entry in the published manifest. [Pi's package documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md#create-a-package) identifies that keyword as the gallery-discovery requirement. The [Packages page](https://pi.dev/packages) lists npm-published packages; GitHub availability and local metadata alone do not establish a live listing. After an approved npm publication, verify public registry metadata and the gallery listing separately, reporting pending indexing rather than claiming discovery before it is observed.

## Documentation maintenance

Update the authoritative home when an approved change alters its facts:
- Product scope or operating constraints: [project context](project.md), then user-facing README details.
- Delivery, checks, or release policy: this document and the executable configuration.
- Model permission: [model-use policy](model-use.md), only with exact approval.
- Tracker roles or relationships: [tracker guidance](issue-tracker.md) and [labels](triage-labels.md).
- Notable public behavior: changelog and relevant README sections.

Report documentation impact with each delivery, including a reason when no update is needed. Resolve code/doc conflicts within authority; do not silently turn observed behavior into accepted policy.

No glossary or ADR is required for the current setup. If future work needs changes to domain meanings or an enduring architectural decision, discover and read the maintained `domain-modeling` skill before proposing that work. An unavailable companion blocks that route rather than authorizing a substitute.
