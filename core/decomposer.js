import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function buildSpecializedSubtask(parentTask, subtask, index) {
  const id = `${parentTask.id}-sub-${index + 1}`;
  const base = {
    id,
    parentTaskId: parentTask.id,
    goal: subtask.description,
    constraints: parentTask.constraints || [],
    successCriteria: [subtask.description],
    status: 'pending',
    subtaskKind: subtask.kind,
    priority: parentTask.priority || 'medium',
    riskLevel: parentTask.riskLevel || 'low',
    retries: 0,
    nextRetryAt: null,
    backoffReason: null
  };

  if (subtask.kind === 'inspect') {
    return {
      ...base,
      taskType: 'file-check',
      targetPath: parentTask.targetPath || path.join(process.cwd(), 'README.md')
    };
  }

  if (subtask.kind === 'verify') {
    if (parentTask.targetPath) {
      return {
        ...base,
        taskType: 'file-check',
        targetPath: parentTask.targetPath
      };
    }
    return {
      ...base,
      taskType: 'command-check',
      command: 'node --version'
    };
  }

  if (subtask.kind === 'execute') {
    return {
      ...base,
      taskType: 'environment-check',
      preset: parentTask.preset,
      checks: parentTask.checks || []
    };
  }

  if (subtask.kind === 'propose') {
    if (parentTask.targetPath && parentTask.targetPath.endsWith('.md')) {
      return {
        ...base,
        taskType: 'safe-local-fix',
        action: 'patch-markdown-section',
        targetPath: parentTask.targetPath,
        sectionTitle: 'Proposed Next Step',
        sectionContent: '- Review the current file and apply the smallest safe improvement needed.'
      };
    }
    if (parentTask.targetPath && parentTask.targetPath.endsWith('.json')) {
      return {
        ...base,
        taskType: 'safe-local-fix',
        action: 'patch-json',
        targetPath: parentTask.targetPath,
        patch: { proposedNextStep: 'Apply the smallest safe improvement and re-verify.' }
      };
    }
    return {
      ...base,
      taskType: 'command-check',
      command: 'node --version'
    };
  }

  return {
    ...base,
    taskType: 'generic-inspect'
  };
}

export function decomposeTask(task) {
  const goal = (task.goal || '').toLowerCase();
  const subtasks = [];

  if (goal.includes('inspect') && goal.includes('verify')) {
    subtasks.push(
      { kind: 'inspect', description: 'Inspect current state and identify constraints.' },
      { kind: 'propose', description: 'Propose a safe next step or fix.' },
      { kind: 'verify', description: 'Verify the final outcome explicitly.' }
    );
  } else if (goal.includes('environment')) {
    subtasks.push(
      { kind: 'inspect', description: 'Resolve environment preset or checks.' },
      { kind: 'execute', description: 'Run configured environment checks.' },
      { kind: 'verify', description: 'Verify all checks completed successfully.' }
    );
  }

  return {
    decomposed: subtasks.length > 0,
    subtasks
  };
}

export function materializeSubtasks(baseDir, task, decomposition) {
  if (!decomposition?.decomposed || !Array.isArray(decomposition.subtasks) || decomposition.subtasks.length === 0) {
    return { created: false, files: [], refreshed: false };
  }

  const subtaskDir = path.join(baseDir, 'tasks', 'generated');
  fs.mkdirSync(subtaskDir, { recursive: true });

  const files = [];
  let refreshed = false;

  decomposition.subtasks.forEach((subtask, index) => {
    const payload = buildSpecializedSubtask(task, subtask, index);
    const fileName = `${payload.id}.json`;
    const filePath = path.join(subtaskDir, fileName);

    let shouldWrite = true;
    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const comparableExisting = {
        ...existing,
        status: 'pending',
        retries: 0,
        nextRetryAt: null,
        backoffReason: null
      };
      const comparablePayload = {
        ...payload
      };
      shouldWrite = JSON.stringify(comparableExisting) !== JSON.stringify(comparablePayload);
      if (shouldWrite) refreshed = true;
    } else {
      refreshed = true;
    }

    if (shouldWrite) {
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    }

    files.push(filePath);
  });

  return { created: true, files, refreshed };
}

export function runGeneratedSubtasks(baseDir, parentTaskId) {
  const subtaskDir = path.join(baseDir, 'tasks', 'generated');
  if (!fs.existsSync(subtaskDir)) return { ran: 0, results: [] };
  const files = fs.readdirSync(subtaskDir)
    .filter((f) => f.endsWith('.json'))
    .filter((file) => {
      const payload = JSON.parse(fs.readFileSync(path.join(subtaskDir, file), 'utf8'));
      return payload.parentTaskId === parentTaskId;
    });

  const results = [];
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(subtaskDir, file), 'utf8'));
    if (['done', 'blocked', 'permanent-blocked'].includes(payload.status)) continue;
    const raw = execFileSync('node', ['core/runner.js', `--task=generated/${file}`], {
      cwd: baseDir,
      encoding: 'utf8'
    });
    results.push(JSON.parse(raw));
  }

  return { ran: results.length, results };
}

export function aggregateSubtaskResults(baseDir, parentTaskId) {
  const reportDir = path.join(baseDir, 'tasks', 'reports');
  const subtaskDir = path.join(baseDir, 'tasks', 'generated');
  if (!fs.existsSync(subtaskDir)) return { total: 0, done: 0, blocked: 0, needsFollowup: 0, details: [] };

  const files = fs.readdirSync(subtaskDir)
    .filter((f) => f.endsWith('.json'))
    .filter((file) => {
      const payload = JSON.parse(fs.readFileSync(path.join(subtaskDir, file), 'utf8'));
      return payload.parentTaskId === parentTaskId;
    });

  const details = files.map((file) => {
    const taskPayload = JSON.parse(fs.readFileSync(path.join(subtaskDir, file), 'utf8'));
    const reportPath = path.join(reportDir, `${taskPayload.id}.report.json`);
    const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
    return {
      id: taskPayload.id,
      subtaskKind: taskPayload.subtaskKind,
      taskType: taskPayload.taskType,
      status: taskPayload.status,
      review: report?.review?.review || null,
      outcome: report?.verification?.outcome || null
    };
  });

  return {
    total: details.length,
    done: details.filter((d) => d.status === 'done').length,
    blocked: details.filter((d) => d.status === 'blocked' || d.status === 'permanent-blocked').length,
    needsFollowup: details.filter((d) => d.status === 'needs_followup' || d.status === 'pending-retry').length,
    details
  };
}
