import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function runPeekaboo(args, { dryRun = false } = {}) {
  if (dryRun) {
    return { ok: true, simulated: true, command: ['peekaboo', ...args].join(' ') };
  }
  try {
    const out = execFileSync('peekaboo', args, { encoding: 'utf8' });
    return { ok: true, simulated: false, command: ['peekaboo', ...args].join(' '), output: out.trim() };
  } catch (error) {
    return {
      ok: false,
      simulated: false,
      command: ['peekaboo', ...args].join(' '),
      output: (error.stdout || '').toString().trim(),
      error: (error.stderr || error.message || '').toString().trim()
    };
  }
}

function updateMetrics(planName, ok) {
  const metricsPath = path.resolve(process.cwd(), 'tasks/reports/metrics/ops-summary.json');
  let metrics = {
    desktopScenarios: { success: 0, partial: 0, failed: 0, lastUpdated: null },
    githubOps: { authEnabled: true, reposPushed: 2, lastUpdated: null },
    publishOps: { success: 1, failed: 2, lastPublishedSlug: 'jisang1000-verification-before-completion', lastUpdated: null },
    notes: []
  };

  if (fs.existsSync(metricsPath)) {
    try {
      metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch {}
  }

  if (!metrics.desktopScenarios) {
    metrics.desktopScenarios = { success: 0, partial: 0, failed: 0, lastUpdated: null };
  }

  if (ok) metrics.desktopScenarios.success += 1;
  else metrics.desktopScenarios.failed += 1;

  metrics.desktopScenarios.lastUpdated = new Date().toISOString();
  metrics.lastScenario = planName;

  fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
}

function buildArgs(step) {
  switch (step.kind) {
    case 'launch-app':
      return ['app', 'launch', step.app];
    case 'switch-app':
      return ['app', 'switch', '--to', step.app];
    case 'open-url':
      return ['open', step.url, '--app', step.app || 'Safari'];
    case 'see': {
      const args = ['see'];
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      if (step.annotate) args.push('--annotate');
      if (step.path) args.push('--path', step.path);
      return args;
    }
    case 'image': {
      const args = ['image'];
      if (step.mode) args.push('--mode', step.mode);
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      if (step.path) args.push('--path', step.path);
      if (step.format) args.push('--format', step.format);
      if (step.retina) args.push('--retina');
      return args;
    }
    case 'click': {
      const args = ['click'];
      if (step.on) args.push('--on', step.on);
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      if (step.coords) args.push('--coords', step.coords);
      return args;
    }
    case 'type': {
      const args = ['type', step.text || ''];
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      return args;
    }
    case 'press': {
      const args = ['press', step.key || 'return'];
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      return args;
    }
    case 'hotkey':
      return ['hotkey', '--keys', step.keys];
    case 'focus-window': {
      const args = ['window', 'focus'];
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      return args;
    }
    case 'sleep':
      return ['sleep', String((step.seconds || 1) * 1000)];
    default:
      throw new Error(`Unsupported UI step kind: ${step.kind}`);
  }
}

const planArg = process.argv.find((x) => x.startsWith('--plan='));
const dryRun = process.argv.includes('--dry-run');
if (!planArg) {
  console.error('Missing --plan=<file>');
  process.exit(1);
}

const planPath = path.resolve(process.cwd(), planArg.split('=')[1]);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const results = [];

for (const step of plan.steps || []) {
  const args = buildArgs(step);
  const result = runPeekaboo(args, { dryRun });
  results.push({ step, result });
  if (!result.ok) break;
}

const ok = results.every((r) => r.result.ok);
const reportPath = path.join(path.dirname(planPath), `${path.basename(planPath, '.json')}.report.json`);
fs.writeFileSync(reportPath, JSON.stringify({
  plan: plan.name || path.basename(planPath),
  dryRun,
  results,
  ok
}, null, 2), 'utf8');

if (!dryRun) {
  updateMetrics(plan.name || path.basename(planPath), ok);
}

console.log(JSON.stringify({ planPath, reportPath, dryRun, ok, steps: results.length }, null, 2));
