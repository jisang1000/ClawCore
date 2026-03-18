import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const queueDir = path.join(baseDir, 'tasks', 'queue');
const generatedDir = path.join(baseDir, 'tasks', 'generated');

function priorityRank(priority = 'medium') {
  return priority === 'high' ? 0 : priority === 'low' ? 2 : 1;
}

function readTaskEntries(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      return {
        file: `${prefix}${file}`,
        priority: raw.priority || 'medium',
        riskLevel: raw.riskLevel || 'medium',
        status: raw.status || 'pending',
        retries: raw.retries || 0,
        maxRetries: raw.maxRetries || 1,
        nextRetryAt: raw.nextRetryAt || null,
        resumeRequested: raw.resumeRequested === true
      };
    });
}

function loadTasks() {
  return [...readTaskEntries(queueDir), ...readTaskEntries(generatedDir, 'generated/')]
    .filter((task) => {
      if (task.resumeRequested) return true;
      if (task.status !== 'pending-retry') return true;
      if (!task.nextRetryAt) return true;
      return new Date(task.nextRetryAt).getTime() <= Date.now();
    })
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.file.localeCompare(b.file));
}

function resolveTaskPath(taskFile) {
  if (taskFile.startsWith('generated/')) return path.join(generatedDir, path.basename(taskFile));
  return path.join(queueDir, taskFile);
}

const tasks = loadTasks();
const results = [];

for (const item of tasks) {
  const raw = execFileSync('node', ['core/runner.js', `--task=${item.file}`], {
    cwd: baseDir,
    encoding: 'utf8'
  });
  const result = JSON.parse(raw);
  results.push(result);

  const taskPath = resolveTaskPath(item.file);
  const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
  if (task.resumeRequested) task.resumeRequested = false;

  if (task.parentTaskId && task.status === 'needs_followup') {
    const currentRetries = task.retries || 0;
    const maxRetries = task.maxRetries || 2;
    if (currentRetries < maxRetries) {
      task.retries = currentRetries + 1;
      task.status = 'pending-retry';
      task.nextRetryAt = new Date(Date.now() + 30_000).toISOString();
    } else {
      task.status = 'permanent-blocked';
      task.backoffReason = 'Child retry limit reached.';
      task.nextRetryAt = null;
    }
  } else if (task.status === 'needs_followup') {
    const currentRetries = task.retries || 0;
    const maxRetries = task.maxRetries || 1;
    if (currentRetries < maxRetries) {
      task.retries = currentRetries + 1;
      task.status = 'pending-retry';
      task.nextRetryAt = new Date(Date.now() + 60_000).toISOString();
    } else {
      task.status = 'permanent-blocked';
      task.backoffReason = 'Retry limit reached.';
      task.nextRetryAt = null;
    }
  }

  fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), 'utf8');
}

console.log(JSON.stringify({ ran: tasks.length, tasks, results }, null, 2));
