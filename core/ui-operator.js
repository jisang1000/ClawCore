import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const APP_PROFILES = {
  Safari: {
    focusRetryMs: 800,
    switchBeforeFocus: true,
    preferScreenCaptureFallback: true
  },
  Telegram: {
    focusRetryMs: 1200,
    switchBeforeFocus: true,
    preferScreenCaptureFallback: true
  },
  Finder: {
    focusRetryMs: 500,
    switchBeforeFocus: true,
    preferSwitchAppLaunchFallback: true
  }
};

function getAppProfile(step) {
  if (!step || !step.app) return null;
  return APP_PROFILES[step.app] || null;
}

function classifyFailure(step, result) {
  const text = `${result?.error || ''} ${result?.output || ''}`.toLowerCase();
  if (!result || result.ok) return null;
  if (text.includes('sigterm') || text.includes('terminated')) return 'sigterm';
  if (text.includes('timeout') || text.includes('timed out')) return 'timeout';
  if (text.includes('focus')) return 'focus-failure';
  if (text.includes('tcc') || text.includes('capture') || text.includes('screencapture')) return 'capture-failure';
  if (step?.kind === 'see' || step?.kind === 'image') return 'capture-failure';
  return 'command-error';
}

function runCommand(binary, args, displayCommand, { dryRun = false } = {}) {
  if (dryRun) {
    return { ok: true, simulated: true, command: displayCommand || [binary, ...args].join(' ') };
  }
  try {
    const out = execFileSync(binary, args, { encoding: 'utf8' });
    return {
      ok: true,
      simulated: false,
      command: displayCommand || [binary, ...args].join(' '),
      output: (out || '').toString().trim()
    };
  } catch (error) {
    return {
      ok: false,
      simulated: false,
      command: displayCommand || [binary, ...args].join(' '),
      output: (error.stdout || '').toString().trim(),
      error: (error.stderr || error.message || '').toString().trim()
    };
  }
}

function runPeekaboo(args, { dryRun = false } = {}) {
  if (args[0] === 'image' && args[1] === '--mode' && args[2] === 'screen') {
    const pathIndex = args.indexOf('--path');
    const outPath = pathIndex >= 0 ? args[pathIndex + 1] : '/tmp/ui-operator-screen.png';
    const captureBin = '/usr/sbin/screencapture';
    return runCommand(captureBin, ['-x', outPath], `${captureBin} -x ${outPath}`, { dryRun });
  }
  return runCommand('peekaboo', args, ['peekaboo', ...args].join(' '), { dryRun });
}

function updateMetrics(planName, ok, results) {
  const metricsPath = path.resolve(process.cwd(), 'tasks/reports/metrics/ops-summary.json');
  let metrics = {
    desktopScenarios: { success: 0, partial: 0, failed: 0, lastUpdated: null },
    scenarioStats: {},
    githubOps: { authEnabled: true, reposPushed: 2, lastUpdated: null },
    publishOps: { success: 1, failed: 2, lastPublishedSlug: 'jisang1000-verification-before-completion', lastUpdated: null },
    notes: []
  };

  if (fs.existsSync(metricsPath)) {
    try {
      metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch {}
  }

  if (!metrics.desktopScenarios) metrics.desktopScenarios = { success: 0, partial: 0, failed: 0, lastUpdated: null };
  if (!metrics.scenarioStats) metrics.scenarioStats = {};
  if (!metrics.scenarioStats[planName]) {
    metrics.scenarioStats[planName] = {
      runs: 0,
      success: 0,
      failed: 0,
      fallbackUsed: 0,
      lastStatus: null,
      lastError: null,
      lastFailureKind: null,
      lastUpdated: null,
      appProfilesUsed: []
    };
  }

  const stat = metrics.scenarioStats[planName];
  stat.runs += 1;
  stat.lastStatus = ok ? 'success' : 'failed';
  stat.lastUpdated = new Date().toISOString();

  const fallbackUsed = results.some((r) => !!r.fallback);
  if (fallbackUsed) stat.fallbackUsed += 1;

  const profiles = [...new Set(results.map((r) => r.appProfile).filter(Boolean))];
  stat.appProfilesUsed = profiles;

  const failedEntry = results.find((r) => (r.fallback ? !r.fallback.result.ok : !r.result.ok));
  if (failedEntry) {
    const failedResult = failedEntry.fallback ? failedEntry.fallback.result : failedEntry.result;
    const failedStep = failedEntry.fallback ? failedEntry.fallback.step : failedEntry.step;
    stat.lastError = failedResult.error || failedResult.output || null;
    stat.lastFailureKind = classifyFailure(failedStep, failedResult);
  } else {
    stat.lastError = null;
    stat.lastFailureKind = null;
  }

  if (ok) {
    metrics.desktopScenarios.success += 1;
    stat.success += 1;
  } else {
    metrics.desktopScenarios.failed += 1;
    stat.failed += 1;
  }

  metrics.desktopScenarios.lastUpdated = new Date().toISOString();
  metrics.lastScenario = planName;
  metrics.lastAppProfilesUsed = profiles;

  fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
}

function buildArgs(step) {
  switch (step.kind) {
    case 'launch-app': return ['app', 'launch', step.app];
    case 'switch-app': return ['app', 'switch', '--to', step.app];
    case 'open-url': return ['open', step.url, '--app', step.app || 'Safari'];
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
    case 'hotkey': return ['hotkey', '--keys', step.keys];
    case 'focus-window': {
      const args = ['window', 'focus'];
      if (step.app) args.push('--app', step.app);
      if (step.windowTitle) args.push('--window-title', step.windowTitle);
      return args;
    }
    case 'sleep': return ['sleep', String((step.seconds || 1) * 1000)];
    default: throw new Error(`Unsupported UI step kind: ${step.kind}`);
  }
}

function profilePreludeSteps(step) {
  const profile = getAppProfile(step);
  if (!profile || !step.app) return [];
  const steps = [];
  if (profile.switchBeforeFocus && step.kind === 'focus-window') {
    steps.push({ kind: 'switch-app', app: step.app, _profilePrelude: true });
    if (profile.focusRetryMs) {
      steps.push({ kind: 'sleep', seconds: profile.focusRetryMs / 1000, _profilePrelude: true });
    }
  }
  return steps;
}

function fallbackForStep(step, result) {
  const profile = getAppProfile(step);

  if (step.kind === 'launch-app' && step.app && !result.ok) {
    return {
      kind: 'switch-app',
      step: { kind: 'switch-app', app: step.app },
      note: 'launch-app failed, falling back to switch-app'
    };
  }

  if (step.kind === 'see' && !result.ok) {
    const err = `${result.error || ''} ${result.output || ''}`;
    if (/TCC|capture|거절|screen/i.test(err) || profile?.preferScreenCaptureFallback) {
      const fallbackPath = (step.path || '/tmp/ui-operator-see.png').replace(/\.png$/, '-fallback.png');
      return {
        kind: 'image',
        step: { kind: 'image', mode: 'screen', path: fallbackPath },
        note: 'see failed, falling back to native screen capture'
      };
    }
  }

  if (step.kind === 'focus-window' && !result.ok && step.app) {
    return {
      kind: 'switch-app',
      step: { kind: 'switch-app', app: step.app },
      note: 'focus-window failed, falling back to switch-app'
    };
  }

  if (step.kind === 'launch-app' && !result.ok && step.app && profile?.preferSwitchAppLaunchFallback) {
    return {
      kind: 'switch-app',
      step: { kind: 'switch-app', app: step.app },
      note: 'app profile prefers switch-app fallback after launch failure'
    };
  }

  return null;
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
  const prelude = profilePreludeSteps(step);
  let preludeFailed = false;
  for (const pstep of prelude) {
    const pargs = buildArgs(pstep);
    const presult = runPeekaboo(pargs, { dryRun });
    results.push({ step: pstep, result: presult, appProfile: pstep.app || null, prelude: true });
    if (!presult.ok) {
      preludeFailed = true;
      break;
    }
  }
  if (preludeFailed) break;

  const args = buildArgs(step);
  const result = runPeekaboo(args, { dryRun });
  const fallback = !result.ok ? fallbackForStep(step, result) : null;
  const appProfile = step.app || null;

  if (!result.ok && fallback) {
    const fallbackArgs = buildArgs(fallback.step);
    const fallbackResult = runPeekaboo(fallbackArgs, { dryRun });
    results.push({ step, result, fallback: { note: fallback.note, step: fallback.step, result: fallbackResult }, appProfile });
    if (!fallbackResult.ok) break;
    continue;
  }

  results.push({ step, result, appProfile });
  if (!result.ok) break;
}

const ok = results.every((r) => (r.fallback ? r.fallback.result.ok : r.result.ok));
const reportPath = path.join(path.dirname(planPath), `${path.basename(planPath, '.json')}.report.json`);
fs.writeFileSync(reportPath, JSON.stringify({
  plan: plan.name || path.basename(planPath),
  dryRun,
  results,
  ok
}, null, 2), 'utf8');

if (!dryRun) updateMetrics(plan.name || path.basename(planPath), ok, results);

console.log(JSON.stringify({ planPath, reportPath, dryRun, ok, steps: results.length }, null, 2));
