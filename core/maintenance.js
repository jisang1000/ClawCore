import fs from 'fs';
import path from 'path';

function normalizeRule(rule) {
  return rule
    .replace(/\s+/g, ' ')
    .replace(/\. Consider subtask flow: [^.]+/g, '')
    .trim();
}

function readTaskDirs(baseDir) {
  const queueDir = path.join(baseDir, 'tasks', 'queue');
  const generatedDir = path.join(baseDir, 'tasks', 'generated');
  const readDir = (dir) => fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')))
    : [];
  return [...readDir(queueDir), ...readDir(generatedDir)];
}

export function compactCandidateRules(baseDir) {
  const candidatePath = path.join(baseDir, 'sandbox', 'candidate-rules', 'candidates.json');
  if (!fs.existsSync(candidatePath)) return { ok: false, reason: 'candidate rules file not found' };
  const rules = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const merged = new Map();

  for (const item of rules) {
    const key = normalizeRule(item.rule);
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...item, rule: key });
    } else {
      prev.count = (prev.count || 0) + (item.count || 0);
      if ((item.updatedAt || '') > (prev.updatedAt || '')) prev.updatedAt = item.updatedAt;
      prev.lastSeenTask = item.lastSeenTask || prev.lastSeenTask;
    }
  }

  const compacted = [...merged.values()].sort((a, b) => (b.count || 0) - (a.count || 0));
  fs.writeFileSync(candidatePath, JSON.stringify(compacted, null, 2), 'utf8');
  return { ok: true, candidatePath, before: rules.length, after: compacted.length };
}

export function buildBlockedTaskTriage(baseDir) {
  const triagePath = path.join(baseDir, 'tasks', 'reports', 'maintenance', 'blocked-triage.json');
  const tasks = readTaskDirs(baseDir);
  const blocked = tasks.filter((t) => ['blocked', 'permanent-blocked', 'pending-retry', 'needs_followup'].includes(t.status));

  const classify = (task) => {
    if (task.status === 'blocked' && task.taskType === 'external-action') return 'approval-gated';
    if (task.status === 'blocked') return 'schema-or-policy';
    if (task.status === 'permanent-blocked') return 'retry-exhausted';
    if (task.status === 'pending-retry') return 'awaiting-retry-window';
    return 'needs-followup';
  };

  const summary = blocked.map((task) => ({
    id: task.id,
    taskType: task.taskType || null,
    status: task.status,
    category: classify(task),
    nextRetryAt: task.nextRetryAt || null,
    backoffReason: task.backoffReason || null
  }));

  fs.mkdirSync(path.dirname(triagePath), { recursive: true });
  fs.writeFileSync(triagePath, JSON.stringify(summary, null, 2), 'utf8');
  return { ok: true, triagePath, count: summary.length };
}

export function buildResolutionPlan(baseDir) {
  const resolutionPath = path.join(baseDir, 'tasks', 'reports', 'maintenance', 'resolution-plan.json');
  const tasks = readTaskDirs(baseDir);
  const blocked = tasks.filter((t) => ['blocked', 'permanent-blocked'].includes(t.status));

  const items = blocked.map((task) => {
    const goal = (task.goal || '').toLowerCase();
    const fixture = goal.includes('testing') || goal.includes('simulate') || goal.includes('verify approval') || goal.includes('validate schema');
    let disposition = 'manual-review';
    let rationale = 'Needs human review before changing state.';

    if (fixture && task.taskType === 'external-action') {
      disposition = 'keep-blocked-fixture';
      rationale = 'This task is a useful approval lifecycle test and should remain blocked by design.';
    } else if (fixture) {
      disposition = 'keep-blocked-fixture';
      rationale = 'This task intentionally validates schema/policy handling and should remain blocked by design.';
    } else if (task.status === 'permanent-blocked') {
      disposition = 'reset-or-retire';
      rationale = 'Retry-exhausted task should either be refreshed to the latest spec or retired from the queue.';
    }

    return {
      id: task.id,
      status: task.status,
      taskType: task.taskType || null,
      disposition,
      rationale
    };
  });

  fs.mkdirSync(path.dirname(resolutionPath), { recursive: true });
  fs.writeFileSync(resolutionPath, JSON.stringify(items, null, 2), 'utf8');
  return { ok: true, resolutionPath, count: items.length };
}
