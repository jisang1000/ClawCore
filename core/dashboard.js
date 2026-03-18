import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');

const queueDir = path.join(baseDir, 'tasks', 'queue');
const generatedDir = path.join(baseDir, 'tasks', 'generated');
const approvalDir = path.join(baseDir, 'tasks', 'reports', 'approvals');
const adoptedRulesPath = path.join(baseDir, 'memory', 'self-improving', 'adopted-rules.json');
const candidateRulesPath = path.join(baseDir, 'sandbox', 'candidate-rules', 'candidates.json');

function readTaskDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
}

const tasks = [...readTaskDir(queueDir), ...readTaskDir(generatedDir)];
const approvals = fs.existsSync(approvalDir)
  ? fs.readdirSync(approvalDir).filter((f) => f.endsWith('.json')).map((file) => JSON.parse(fs.readFileSync(path.join(approvalDir, file), 'utf8')))
  : [];
const adoptedRules = fs.existsSync(adoptedRulesPath) ? JSON.parse(fs.readFileSync(adoptedRulesPath, 'utf8')) : [];
const candidateRules = fs.existsSync(candidateRulesPath) ? JSON.parse(fs.readFileSync(candidateRulesPath, 'utf8')) : [];
const blockedTasks = tasks.filter((t) => ['blocked', 'permanent-blocked', 'needs_followup', 'pending-retry'].includes(t.status));

const summary = {
  totalTasks: tasks.length,
  byStatus: tasks.reduce((acc, t) => {
    acc[t.status || 'unknown'] = (acc[t.status || 'unknown'] || 0) + 1;
    return acc;
  }, {}),
  pendingApprovals: approvals.filter((a) => a.status === 'pending-human-approval').length,
  expiredApprovals: approvals.filter((a) => a.status === 'expired').length,
  rejectedApprovals: approvals.filter((a) => a.status === 'rejected').length,
  adoptedRuleCount: adoptedRules.length,
  candidateRuleCount: candidateRules.length,
  generatedSubtaskCount: readTaskDir(generatedDir).length,
  highRiskTasks: tasks.filter((t) => t.riskLevel === 'high').map((t) => ({ id: t.id, status: t.status, taskType: t.taskType })),
  blockedTaskSummary: blockedTasks.map((t) => ({ id: t.id, status: t.status, nextRetryAt: t.nextRetryAt || null, backoffReason: t.backoffReason || null })),
  adoptedRules,
  topCandidateRules: candidateRules.slice(0, 5)
};

console.log(JSON.stringify(summary, null, 2));
