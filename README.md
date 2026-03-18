# ClawCore

A guarded autonomous agent core for planning, execution, verification, maintenance, and bounded self-improvement.

## Purpose

ClawCore turns user goals into verified outcomes while staying bounded by fixed safety and approval policies.
It is intentionally designed for **strong autonomy inside clear guardrails**, not unrestricted self-modification.

## What ClawCore Is

ClawCore is a bounded-autonomy runtime for structured task execution.

It is designed to:
- intake tasks in a structured format
- plan before long execution
- enforce approval and policy checks
- execute safe local work
- decompose larger tasks into child work
- verify outcomes before declaring completion
- learn from repeated failures inside approved boundaries

## Core Principles

- Plan before long execution
- Verify outcomes before declaring completion
- Debug by root cause, not guesswork
- Learn from repeated failures and corrections
- Keep safety and approval policy fixed and auditable
- Allow limited self-improvement only in approved layers

## What It Must Not Do

- expand its own permissions
- rewrite safety policy autonomously
- self-replicate
- perform destructive or external actions without approval
- claim completion without verification

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

## Quick Start

### Requirements

- Node.js with ESM support
- a local ClawCore workspace checkout

### Install

```bash
cd ClawCore
npm install
```

### Run the main runner

```bash
npm start
```

### Run all queued work

```bash
npm run run-all
```

### Open the dashboard

```bash
npm run dashboard
```

### Run the desktop operator

```bash
npm run ui-operator -- --plan=operators/desktop/demo-open-safari.json
```

## Available Commands

From `package.json`:

- `npm start` → `node core/runner.js`
- `npm run dry-run` → `node core/runner.js --dry-run`
- `npm run run-all` → `node core/run-all.js`
- `npm run approve-task` → `node core/approve-task.js`
- `npm run re-request-approval` → `node core/re-request-approval.js`
- `npm run adopt-rule` → `node core/adopt-rule.js`
- `npm run dashboard` → `node core/dashboard.js`
- `npm run migrate-approvals` → `node core/approval-migrate.js`
- `npm run ui-operator` → `node core/ui-operator.js`

## Example Task Flow

1. load task
2. classify + validate schema
3. orchestrate + plan
4. evaluate approval/policy
5. execute task or child tasks
6. verify outcomes
7. review and optionally replan
8. log lesson + write report

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

## Repository Layout

- `core/` — runtime modules
- `policy/` — fixed policy layer
- `docs/` — architecture and implementation notes
- `apps/` — simple local app outputs and demos
- `operators/` — desktop operator plans and examples
- `tasks/queue/` — queued tasks and fixture tasks tracked in the repo

The repository intentionally ignores local runtime state such as logs, memory, sandbox outputs, generated task artifacts, and report files.

## Current Status

ClawCore is now an **operational bounded-autonomy core** rather than only an MVP skeleton.
Most real operating tasks are completing successfully; the remaining blocked tasks are intentional fixture cases for approval/schema handling and regression coverage.

## Known Limitations

- approval and external-action boundaries are intentionally strict
- some blocked tasks are preserved on purpose as regression fixtures
- desktop automation still depends on local OS permissions and environment setup
- this repository is a bounded local execution core, not an unrestricted autonomous agent
