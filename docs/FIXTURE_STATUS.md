# Fixture Status

## Purpose

These tasks remain blocked by design and should not be treated as unresolved product defects.
They are retained as regression fixtures for schema enforcement and approval lifecycle behavior.

## Intentional Fixtures

### `task-020`
- category: `schema-validation`
- role: invalid config-check fixture
- expected state: `blocked`

### `task-022`
- category: `schema-validation`
- role: invalid environment preset fixture
- expected state: `blocked`

### `task-023`
- category: `approval-lifecycle`
- role: rejection fixture
- expected state: `blocked`

### `task-024`
- category: `approval-lifecycle`
- role: expiry fixture
- expected state: `blocked`

### `task-006`
- category: `approval-gating`
- role: approval gating / retry-exhaustion fixture
- expected state: `permanent-blocked`

## Interpretation

If these tasks remain blocked while operating tasks are `done`, the system is behaving as expected.
They should only be removed if the fixture strategy changes, not because the runtime is broken.
