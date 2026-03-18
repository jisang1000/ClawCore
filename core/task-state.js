import fs from 'fs';
import path from 'path';

function resolveTaskPath(baseDir, taskFile) {
  const queuePath = path.join(baseDir, 'tasks', 'queue', taskFile);
  if (fs.existsSync(queuePath)) return queuePath;
  const generatedPath = path.join(baseDir, 'tasks', 'generated', path.basename(taskFile));
  if (fs.existsSync(generatedPath)) return generatedPath;
  return queuePath;
}

export function updateTaskStatus(baseDir, taskFile, status) {
  const taskPath = resolveTaskPath(baseDir, taskFile);
  if (!fs.existsSync(taskPath)) return false;
  const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
  task.status = status;
  fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), 'utf8');
  return true;
}
