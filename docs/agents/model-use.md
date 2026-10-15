# Auxiliary model-use policy

## Approved mode: none

This policy concerns additional model consultations and assessment services beyond the primary coding assistant requested by the user.

There is no standing permission for autonomous auxiliary model requests, whether local or hosted. Across the project, the shared authorized allowance is **zero requests, zero retries, zero evidence-correction calls, and zero spend in any currency**. Service startup, downloads, installation, credential changes, and substitution are not authorized.

Provider/model identities, endpoints, service owners, and budget ledgers are not applicable because no route is permitted. Hand-offs, resumed sessions, and workers do not create fresh allowances. Delegation separately requires explicit approval under the [workflow](workflow.md).

Use ordinary engineering inspection, deterministic checks, and direct reasoning as the fallback. If those cannot answer a consequential question, describe the evidence gap and request approval rather than invoking a service.

## Changing this policy

A new route requires explicit approval covering the assessment skill and exact model/provider/endpoint; permitted purpose and evidence; disclosure and retention exclusions; finite shared attempts, retries, corrections, spend, scope and expiry; delegation accounting; service lifecycle ownership; and allowed fallback. Publish only the approved delta here.

An explicit user assessment request grants only its named bounded assessment within runtime and skill restrictions. It does not authorize other services, installation, broader disclosure, or future autonomous use. For an unavailable explicitly requested assessment, offer a direct fallback and wait unless the user already authorized it.

Keep credentials and private conversation evidence outside repository documents. No assessment payload/result retention is authorized by this standing policy. If another party proposes a consultation, check this policy before sending any data.

## Rationale and approval

Ordinary engineering and rendering tests meet this package's current needs. Additional model services are unnecessary for its baseline workflow.

SirDarcanos approved the setup plan and these boundaries in the project setup conversation on 2026-10-15 (“Yes all approved”). The policy remains in force until explicitly revised; a setup rerun does not renew or expand permission. This document establishes authority, not runtime enforcement.
