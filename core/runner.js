import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPlan } from './planner.js';
import { executePlan } from './executor.js';
import { verifyExecution } from './verifier.js';
import { reviewRun } from './reviewer.js';
import { logLesson } from './learner.js';
import { orchestrate } from './orchestrator.js';
import { buildReplan } from './replanner.js';
import { compactCandidateRules, buildBlockedTaskTriage, buildResolutionPlan } from './maintenance.js';
import { buildDependencyView, summarizeChildren } from './dependency-view.js';
import { loadPolicies, evaluateApproval } from './policy.js';
import { updateTaskStatus } from './task-state.js';
import { createApprovalRequest, getApprovalState, summarizeApprovalAudit } from './approval.js';
import { recommendTaskShape } from './classifier.js';
import { resolveEnvironmentPreset } from './presets.js';
import { validateTaskSchema } from './schema.js';
import { decomposeTask, materializeSubtasks, runGeneratedSubtasks, aggregateSubtaskResults } from './decomposer.js';
import { buildExternalActionSummary } from './external-report.js';
import { buildReportMeta } from './report-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const taskArg = process.argv.find((x) => x.startsWith('--task='));
const selectedTask = taskArg ? taskArg.split('=')[1] : 'sample-task.json';

function resolveTaskPath(baseDir, selectedTask) {
  const direct = path.join(baseDir, 'tasks', 'queue', selectedTask);
  if (fs.existsSync(direct)) return direct;
  const generated = path.join(baseDir, 'tasks', 'generated', path.basename(selectedTask));
  if (fs.existsSync(generated)) return generated;
  return direct;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

const taskPath = resolveTaskPath(baseDir, selectedTask);
const isGeneratedTask = taskPath.includes(`${path.sep}tasks${path.sep}generated${path.sep}`);
updateTaskStatus(baseDir, selectedTask, 'running');
const rawTask = readJson(taskPath);
const task = resolveEnvironmentPreset(recommendTaskShape(rawTask));
const schema = validateTaskSchema(task);
const decomposition = isGeneratedTask ? { decomposed: false, subtasks: [] } : decomposeTask(task);
const subtaskGeneration = schema.ok && !isGeneratedTask ? materializeSubtasks(baseDir, task, decomposition) : { created: false, files: [] };
const subtaskRun = schema.ok && decomposition.decomposed ? runGeneratedSubtasks(baseDir, task.id) : { ran: 0, results: [] };
const subtaskAggregation = decomposition.decomposed ? aggregateSubtaskResults(baseDir, task.id) : { total: 0, done: 0, blocked: 0, needsFollowup: 0, details: [] };
const childSummary = summarizeChildren(subtaskAggregation);
const dependencyView = buildDependencyView(task, decomposition, subtaskAggregation);
const policies = loadPolicies(baseDir);
const approval = evaluateApproval(task);
const approvalState = getApprovalState(baseDir, task.id);
const orchestration = orchestrate(task, baseDir);
const externalActionSummary = buildExternalActionSummary(baseDir, task, approvalState);
const plan = createPlan(task, baseDir);

let executedSteps;
let verification;
let review;
let approvalRequestPath = null;
let approvalAudit = null;
let maintenance = null;

if (!schema.ok) {
  executedSteps = [
    { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: 'Task schema inspection completed.' },
    { id: 'step-2', action: 'schema-validation', status: 'blocked', note: schema.errors.join(' ') },
    { id: 'step-3', action: 'verify-outcome', status: 'blocked', note: 'Verification blocked because task schema is invalid.' }
  ];
  verification = {
    taskId: task.id,
    outcome: 'invalid_task_schema',
    verified: ['Initial task inspection completed.'],
    unverified: schema.errors
  };
  review = reviewRun(task, verification, { schema, decomposition, approvalState, subtaskAggregation });
} else {
  if (task.id === 'task-027') {
    const compacted = compactCandidateRules(baseDir);
    const triage = buildBlockedTaskTriage(baseDir);
    maintenance = { compacted, triage };
  }
  if (task.id === 'task-028') {
    const triage = buildBlockedTaskTriage(baseDir);
    const resolution = buildResolutionPlan(baseDir);
    maintenance = { triage, resolution };
  }
  if (task.id === 'task-033') {
    approvalAudit = summarizeApprovalAudit(baseDir);
  }
  executedSteps = executePlan(plan, { dryRun, task, approval, baseDir });
  verification = verifyExecution(task, executedSteps, { dryRun, approval, subtaskAggregation });
  if (task.id === 'task-027' && maintenance?.compacted?.ok && maintenance?.triage?.ok) {
    verification.verified.push('Maintenance outputs generated successfully.');
    verification.unverified = verification.unverified.filter((x) => x !== 'Concrete real-world outcome still requires a more specific task type or executor.');
    verification.outcome = verification.unverified.length === 0 ? 'success' : verification.outcome;
  }
  if (task.id === 'task-028' && maintenance?.triage?.ok && maintenance?.resolution?.ok) {
    verification.verified.push('Blocked-task resolution planning outputs generated successfully.');
    verification.unverified = verification.unverified.filter((x) => x !== 'Concrete real-world outcome still requires a more specific task type or executor.');
    verification.outcome = verification.unverified.length === 0 ? 'success' : verification.outcome;
  }
  if (task.id === 'task-033' && approvalAudit?.ok) {
    verification.verified.push('Approval audit summary generated successfully.');
    verification.unverified = verification.unverified.filter((x) => x !== 'Concrete real-world outcome still requires a more specific task type or executor.');
    verification.outcome = verification.unverified.length === 0 ? 'success' : verification.outcome;
  }
  review = reviewRun(task, verification, { schema, decomposition, approvalState, subtaskAggregation });
}

const replan = buildReplan(task, { verification, review, orchestration, subtaskAggregation });
const reportMeta = buildReportMeta(task, { approvalState, externalActionSummary });

if (approval.approvalRequired && !approval.allowedToExecute && approvalState.status !== 'expired') {
  const approvalRequest = createApprovalRequest(baseDir, task, approval);
  approvalRequestPath = approvalRequest.filePath;
  approvalAudit = approvalAudit || {};
  approvalAudit.requestAuditPath = approvalRequest.auditPath;
}

const finalStatus = !schema.ok
  ? 'blocked'
  : approvalState.status === 'expired'
    ? 'blocked'
    : approval.approvalRequired && !approval.allowedToExecute
      ? 'blocked'
      : review.review === 'ready'
        ? 'done'
        : 'needs_followup';
updateTaskStatus(baseDir, selectedTask, finalStatus);

const planOut = path.join(baseDir, 'tasks', 'plans', `${task.id}.plan.json`);
const reportOut = path.join(baseDir, 'tasks', 'reports', `${task.id}.report.json`);

writeJson(planOut, plan);
writeJson(reportOut, {
  task,
  schema,
  decomposition,
  dependencyView,
  childSummary,
  subtaskGeneration,
  subtaskRun,
  subtaskAggregation,
  policies,
  approval,
  approvalState,
  approvalRequestPath,
  approvalAudit,
  externalActionSummary,
  orchestration,
  replan,
  maintenance,
  executedSteps,
  verification,
  review,
  mode: dryRun ? 'dry-run' : 'normal'
});

const lessonPath = logLesson(task, review, baseDir);

console.log(JSON.stringify({
  reportMeta,
  taskId: task.id,
  taskFile: selectedTask,
  mode: dryRun ? 'dry-run' : 'normal',
  taskType: task.taskType,
  recommendation: task.recommendation || null,
  resolvedPreset: task.resolvedPreset || null,
  schema,
  decomposition,
  dependencyView,
  childSummary,
  subtaskGeneration,
  subtaskRun,
  subtaskAggregation,
  approval,
  approvalState,
  approvalRequestPath,
  approvalAudit,
  externalActionSummary,
  orchestration,
  replan,
  maintenance,
  finalStatus,
  planOut,
  reportOut,
  lessonPath,
  review,
  verification
}, null, 2));
