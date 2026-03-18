import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rerequestApproval } from './approval.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const taskArg = process.argv.find((x) => x.startsWith('--taskId='));
const reasonArg = process.argv.find((x) => x.startsWith('--reason='));
const reason = reasonArg ? reasonArg.split('=').slice(1).join('=') : null;

if (!taskArg) {
  console.error('Missing --taskId=<id>');
  process.exit(1);
}

const taskId = taskArg.split('=')[1];
const queueDir = path.join(baseDir, 'tasks', 'queue');
const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json'));
const target = files.find((file) => {
  const obj = JSON.parse(fs.readFileSync(path.join(queueDir, file), 'utf8'));
  return obj.id === taskId;
});
if (!target) {
  console.error('Task not found');
  process.exit(1);
}
const taskPath = path.join(queueDir, target);
const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
task.status = 'blocked';
task.approved = false;
task.resumeRequested = false;
task.approvalDecisionReason = reason;
fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), 'utf8');

const result = rerequestApproval(baseDir, taskId, reason);
console.log(JSON.stringify({ taskId, target, result }, null, 2));
