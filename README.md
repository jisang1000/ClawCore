# ClawCore

A guarded autonomous agent core for planning, execution, verification, maintenance, and bounded self-improvement.

## Purpose

ClawCore turns user goals into verified outcomes while staying bounded by fixed safety and approval policies.
It is intentionally designed for **strong autonomy inside clear guardrails**, not unrestricted self-modification.

## Core Principles

- Plan before long execution
- Verify outcomes before declaring completion
- Debug by root cause, not guesswork
- Learn from repeated failures and corrections
- Keep safety and approval policy fixed and auditable
- Allow limited self-improvement only in approved layers

## Current Capabilities

- structured task intake and schema validation
- simple web-app output is possible inside the ClawCore workspace (for example, `apps/paint/`)
- planner + orchestrator with goal signals, phase hints, replanning hints
- execution for command/file/directory/config/environment checks
- safe local fixes for JSON/YAML/Markdown/file/directory maintenance
- parent-child decomposition, generated subtask execution, and aggregation
- retry/backoff + blocked/permanent-blocked handling
- approval lifecycle: request / approve / reject / expire / rerequest
- approval audit trail and approval summary
- external-action mock execution with bounded external summary blocks
- lessons, candidate rules, adopted rules, maintenance triage, resolution planning
- dashboard summaries and structured report metadata (`schemaVersion: 0.2.0`)

## What It Must Not Do

- expand its own permissions
- rewrite safety policy autonomously
- self-replicate
- perform destructive or external actions without approval
- claim completion without verification

## Runtime Modules

- `planner.js`
- `executor.js`
- `verifier.js`
- `reviewer.js`
- `learner.js`
- `orchestrator.js`
- `replanner.js`
- `approval.js`
- `maintenance.js`
- `dependency-view.js`
- `external-report.js`
- `report-schema.js`

## Current Runtime Flow

1. load task
2. classify + validate schema
3. orchestrate + plan
4. evaluate approval/policy
5. execute task or child tasks
6. verify outcomes
7. review and optionally replan
8. log lesson + write report

## Repository Layout

- `core/` — runtime modules
- `policy/` — fixed policy layer
- `memory/` — lessons and self-improving memory
- `tasks/queue/` — main queued tasks
- `tasks/generated/` — generated child tasks
- `tasks/plans/` — generated plans
- `tasks/reports/` — generated reports, approval state, maintenance outputs
- `sandbox/` — isolated experimentation area
- `docs/` — architecture and implementation docs

## Current Status

ClawCore is now an **operational bounded-autonomy core** rather than only an MVP skeleton.
Most real operating tasks are completing successfully; the remaining blocked tasks are intentional test fixtures for approval/schema handling.
