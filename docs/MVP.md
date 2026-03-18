# ClawCore MVP Specification

## Product Goal

Create a bounded autonomous agent core that can interpret a task, plan it, execute it with tools, verify the result, review the outcome, and learn from repeated patterns without modifying its own safety boundaries.

## MVP Scope (Implemented)

### Included
- task intake + schema validation
- plan generation with phase hints and replanning hints
- ordered execution
- verification pass
- review pass
- lesson logging
- policy checks before risky actions
- subtask decomposition + generated child execution
- approval lifecycle with audit trail
- maintenance triage + resolution planning

### Excluded
- unrestricted self-modification
- autonomous policy rewriting
- permission escalation
- autonomous public/external messaging
- unsupervised long-duration goal expansion

## MVP Success Criteria (Current State)

A successful ClawCore run can:
1. receive a structured task
2. produce a short execution plan
3. execute local checks/fixes and bounded mock external flows
4. verify whether the intended result actually happened
5. summarize verified vs unverified results
6. log lessons and candidate rules
7. route approval-gated tasks through explicit approval state

## Current Runtime Flow

```text
Task In
  -> Classify / Validate
  -> Plan / Orchestrate
  -> Policy / Approval Check
  -> Execute
  -> Verify
  -> Review / Replan
  -> Learn
  -> Report Out
```

## Data Model Notes

### task
- main queue task or generated child task
- may include priority, riskLevel, retries, taskType, action, approval fields

### plan
- includes ordered steps
- may include `phaseHints` and `replanningHints`

### report
- includes `reportMeta.schemaVersion`
- includes approval state, orchestration, replan, child summary, and optional external-action summary

## Policy Boundary

ClawCore enforces:
- no destructive action without approval
- no external action without approval
- no self-policy changes
- no self-permission changes

## Current Outcome

The MVP layer is complete and has grown into an operating bounded-autonomy core with maintenance, approval auditing, generated subtasks, and richer executor actions.
