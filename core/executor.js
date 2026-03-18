import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function safeRun(command) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return {
      ok: false,
      output: (error.stdout || '').toString().trim(),
      error: (error.stderr || error.message || '').toString().trim()
    };
  }
}

function patchMarkdownSection(filePath, sectionTitle, sectionContent) {
  const heading = `## ${sectionTitle}`;
  const incoming = `${heading}\n${sectionContent.trim()}\n`;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  if (!existing.includes(heading)) {
    const combined = existing.trim() ? `${existing.trim()}\n\n${incoming}` : incoming;
    fs.writeFileSync(filePath, `${combined.trim()}\n`, 'utf8');
    return { ok: true, mode: 'inserted' };
  }

  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}[\\s\\S]*?(?=\n## |$)`, 'm');
  const updated = existing.replace(regex, incoming.trim());
  fs.writeFileSync(filePath, `${updated.trim()}\n`, 'utf8');
  return { ok: true, mode: 'patched' };
}

function appendMarkdownBullets(filePath, sectionTitle, bullets) {
  const heading = `## ${sectionTitle}`;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const bulletText = bullets.map((b) => `- ${b}`).join('\n');

  if (!existing.includes(heading)) {
    const content = `${existing.trim()}\n\n${heading}\n${bulletText}\n`.trim();
    fs.writeFileSync(filePath, `${content}\n`, 'utf8');
    return { ok: true, mode: 'created-section', added: bullets.length };
  }

  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped}[\\s\\S]*?)(?=\n## |$)`, 'm');
  const match = existing.match(regex);
  const currentSection = match ? match[1] : `${heading}`;
  const updatedSection = `${currentSection.trim()}\n${bulletText}`;
  const updated = existing.replace(regex, updatedSection);
  fs.writeFileSync(filePath, `${updated.trim()}\n`, 'utf8');
  return { ok: true, mode: 'appended-bullets', added: bullets.length };
}

function dedupeMarkdownBullets(filePath, sectionTitle) {
  const heading = `## ${sectionTitle}`;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (!existing.includes(heading)) return { ok: true, mode: 'section-missing', removed: 0 };
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped}[\\s\\S]*?)(?=\n## |$)`, 'm');
  const match = existing.match(regex);
  const currentSection = match ? match[1] : `${heading}`;
  const lines = currentSection.split('\n');
  const seen = new Set();
  const out = [];
  let removed = 0;
  for (const line of lines) {
    if (!line.trim().startsWith('- ')) {
      out.push(line);
      continue;
    }
    if (seen.has(line.trim())) {
      removed += 1;
      continue;
    }
    seen.add(line.trim());
    out.push(line);
  }
  const updated = existing.replace(regex, out.join('\n').trim());
  fs.writeFileSync(filePath, `${updated.trim()}\n`, 'utf8');
  return { ok: true, mode: 'deduped', removed };
}

function parseYamlMap(filePath) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing ? existing.split('\n').filter(Boolean) : [];
  const map = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      map[key] = value;
    }
  }
  return map;
}

function writeYamlMap(filePath, map) {
  const out = Object.entries(map).map(([k, v]) => `${k}: ${v}`).join('\n');
  fs.writeFileSync(filePath, `${out}\n`, 'utf8');
}

function patchYamlFile(filePath, patch) {
  const map = parseYamlMap(filePath);
  Object.assign(map, patch || {});
  writeYamlMap(filePath, map);
  return { ok: true, keys: Object.keys(patch || {}) };
}

export function executePlan(plan, { dryRun = false, task = null, approval = null, baseDir = null } = {}) {
  if (dryRun) return plan.steps.map((step) => ({ ...step, status: 'simulated-complete', note: 'Dry-run mode: execution simulated.' }));

  if (approval?.approvalRequired && !approval?.allowedToExecute) {
    return [
      { id: 'step-1', action: 'policy-check', success: 'Approval requirements are evaluated before execution.', status: 'complete', note: approval.reason },
      { id: 'step-2', action: 'block-or-request-approval', success: 'Task is blocked or routed to approval if required.', status: 'blocked', note: 'Execution blocked pending approval.' },
      { id: 'step-3', action: 'verify-outcome', success: 'The intended result is verified or explicitly marked unverified.', status: 'blocked', note: 'Final verification blocked because execution did not proceed.' }
    ];
  }

  if (task?.taskType === 'external-action' && task.mockOnly === true && baseDir) {
    const mockDir = path.join(baseDir, 'tasks', 'reports', 'mock-external');
    fs.mkdirSync(mockDir, { recursive: true });
    const mockPath = path.join(mockDir, `${task.id}.mock.json`);
    const payload = {
      taskId: task.id,
      action: task.action,
      target: task.target,
      payload: task.payload || null,
      executed: false,
      simulated: true,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(mockPath, JSON.stringify(payload, null, 2), 'utf8');
    return [
      { id: 'step-1', action: 'policy-check', success: 'Approval requirements are evaluated before execution.', status: 'complete', note: approval.reason },
      { id: 'step-2', action: 'mock-external-action', success: 'External action is simulated without actually sending anything.', status: 'complete', note: `Mock external report created: ${mockPath}` },
      { id: 'step-3', action: 'verify-outcome', success: 'The intended result is verified or explicitly marked unverified.', status: 'complete', note: 'Mock external action verified.' }
    ];
  }

  if (task?.taskType === 'command-check' && task.command) {
    const result = safeRun(task.command);
    return [
      { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Prepared command check for: ${task.command}` },
      { id: 'step-2', action: 'run-command-check', status: result.ok ? 'complete' : 'blocked', note: result.ok ? result.output : (result.error || 'Command failed') },
      { id: 'step-3', action: 'verify-outcome', status: result.ok ? 'complete' : 'blocked', note: result.ok ? 'Command execution verified.' : 'Verification failed because command execution failed.' }
    ];
  }

  if (task?.taskType === 'file-check' && task.targetPath) {
    const exists = fs.existsSync(task.targetPath);
    return [
      { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Checked file path: ${task.targetPath}` },
      { id: 'step-2', action: 'run-file-check', status: exists ? 'complete' : 'blocked', note: exists ? 'File exists.' : 'File does not exist.' },
      { id: 'step-3', action: 'verify-outcome', status: exists ? 'complete' : 'blocked', note: exists ? 'File existence verified.' : 'Verification failed because file was not found.' }
    ];
  }

  if (task?.taskType === 'directory-check' && task.targetPath) {
    const exists = fs.existsSync(task.targetPath) && fs.statSync(task.targetPath).isDirectory();
    return [
      { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Checked directory path: ${task.targetPath}` },
      { id: 'step-2', action: 'run-directory-check', status: exists ? 'complete' : 'blocked', note: exists ? 'Directory exists.' : 'Directory does not exist.' },
      { id: 'step-3', action: 'verify-outcome', status: exists ? 'complete' : 'blocked', note: exists ? 'Directory existence verified.' : 'Verification failed because directory was not found.' }
    ];
  }

  if (task?.taskType === 'config-check' && task.targetPath) {
    let ok = false;
    let note = 'Unknown config check result.';
    try {
      if (fs.existsSync(task.targetPath)) {
        const obj = JSON.parse(fs.readFileSync(task.targetPath, 'utf8'));
        const missing = (task.requiredKeys || []).filter((k) => !(k in obj));
        ok = missing.length === 0;
        note = ok ? 'All required config keys are present.' : `Missing keys: ${missing.join(', ')}`;
      } else {
        note = 'Config file does not exist.';
      }
    } catch (error) {
      note = `Config parse/check failed: ${error.message}`;
    }
    return [
      { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Checked config path: ${task.targetPath}` },
      { id: 'step-2', action: 'run-config-check', status: ok ? 'complete' : 'blocked', note },
      { id: 'step-3', action: 'verify-outcome', status: ok ? 'complete' : 'blocked', note: ok ? 'Config verification completed.' : 'Verification failed because config requirements were not satisfied.' }
    ];
  }

  if (task?.taskType === 'environment-check' && Array.isArray(task.checks)) {
    const results = task.checks.map((c) => ({ name: c.name, ...safeRun(c.command) }));
    const failed = results.filter((r) => !r.ok);
    const note = results.map((r) => `${r.name}: ${r.ok ? r.output : 'FAIL'}`).join(' | ');
    return [
      { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Environment checks identified: ${task.checks.map((c) => c.name).join(', ')}` },
      { id: 'step-2', action: 'run-environment-checks', status: failed.length === 0 ? 'complete' : 'blocked', note },
      { id: 'step-3', action: 'verify-outcome', status: failed.length === 0 ? 'complete' : 'blocked', note: failed.length === 0 ? 'Environment checks verified.' : `Verification failed for: ${failed.map((f) => f.name).join(', ')}` }
    ];
  }

  if (task?.taskType === 'safe-local-fix' && task.targetPath) {
    try {
      fs.mkdirSync(path.dirname(task.targetPath), { recursive: true });
      if (task.action === 'ensure-file') {
        if (!fs.existsSync(task.targetPath)) fs.writeFileSync(task.targetPath, task.content || '', 'utf8');
      } else if (task.action === 'ensure-json-file') {
        if (!fs.existsSync(task.targetPath)) fs.writeFileSync(task.targetPath, JSON.stringify(task.content || {}, null, 2), 'utf8');
      } else if (task.action === 'ensure-json-key') {
        const existing = fs.existsSync(task.targetPath) ? JSON.parse(fs.readFileSync(task.targetPath, 'utf8')) : {};
        if (!(task.key in existing)) existing[task.key] = task.value;
        fs.writeFileSync(task.targetPath, JSON.stringify(existing, null, 2), 'utf8');
      } else if (task.action === 'ensure-markdown-file') {
        if (!fs.existsSync(task.targetPath)) fs.writeFileSync(task.targetPath, task.content || '# New Note\n', 'utf8');
      } else if (task.action === 'append-markdown-bullets') {
        const result = appendMarkdownBullets(task.targetPath, task.sectionTitle || 'Notes', task.bullets || []);
        const exists = fs.existsSync(task.targetPath);
        return [
          { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
          { id: 'step-2', action: 'apply-safe-local-fix', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? `Markdown bullets ${result.mode}.` : 'Markdown append failed.' },
          { id: 'step-3', action: 'verify-outcome', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? 'Markdown bullet append verification completed.' : 'Verification failed because markdown append failed.' }
        ];
      } else if (task.action === 'dedupe-markdown-bullets') {
        const result = dedupeMarkdownBullets(task.targetPath, task.sectionTitle || 'Notes');
        const exists = fs.existsSync(task.targetPath);
        return [
          { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
          { id: 'step-2', action: 'apply-safe-local-fix', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? `Removed duplicate bullets: ${result.removed}` : 'Markdown dedupe failed.' },
          { id: 'step-3', action: 'verify-outcome', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? 'Markdown bullet dedupe verification completed.' : 'Verification failed because markdown dedupe failed.' }
        ];
      } else if (task.action === 'ensure-dir') {
        fs.mkdirSync(task.targetPath, { recursive: true });
      } else if (task.action === 'ensure-yaml-file') {
        if (!fs.existsSync(task.targetPath)) fs.writeFileSync(task.targetPath, task.content || '', 'utf8');
      } else if (task.action === 'ensure-yaml-key') {
        const map = parseYamlMap(task.targetPath);
        if (!(task.key in map)) map[task.key] = task.value;
        writeYamlMap(task.targetPath, map);
      } else if (task.action === 'patch-json') {
        const existing = fs.existsSync(task.targetPath)
          ? JSON.parse(fs.readFileSync(task.targetPath, 'utf8'))
          : {};
        const merged = { ...existing, ...(task.patch || {}) };
        fs.writeFileSync(task.targetPath, JSON.stringify(merged, null, 2), 'utf8');
      } else if (task.action === 'patch-markdown-section') {
        const result = patchMarkdownSection(task.targetPath, task.sectionTitle || 'Updated Section', task.sectionContent || '- updated by ClawCore');
        const exists = fs.existsSync(task.targetPath);
        return [
          { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
          { id: 'step-2', action: 'apply-safe-local-fix', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? `Markdown section ${result.mode}.` : 'Markdown patch failed.' },
          { id: 'step-3', action: 'verify-outcome', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? 'Markdown section verification completed.' : 'Verification failed because markdown patch failed.' }
        ];
      } else if (task.action === 'patch-yaml') {
        const result = patchYamlFile(task.targetPath, task.patch || {});
        const exists = fs.existsSync(task.targetPath);
        return [
          { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
          { id: 'step-2', action: 'apply-safe-local-fix', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? `YAML keys patched: ${result.keys.join(', ')}` : 'YAML patch failed.' },
          { id: 'step-3', action: 'verify-outcome', status: result.ok && exists ? 'complete' : 'blocked', note: result.ok ? 'YAML patch verification completed.' : 'Verification failed because YAML patch failed.' }
        ];
      }
      const exists = fs.existsSync(task.targetPath);
      return [
        { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
        { id: 'step-2', action: 'apply-safe-local-fix', status: exists ? 'complete' : 'blocked', note: exists ? 'Safe local fix applied or target already existed.' : 'Failed to ensure target exists.' },
        { id: 'step-3', action: 'verify-outcome', status: exists ? 'complete' : 'blocked', note: exists ? 'Local target existence verified.' : 'Verification failed because target does not exist.' }
      ];
    } catch (error) {
      return [
        { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: `Target path: ${task.targetPath}` },
        { id: 'step-2', action: 'apply-safe-local-fix', status: 'blocked', note: error.message },
        { id: 'step-3', action: 'verify-outcome', status: 'blocked', note: 'Verification failed because local fix failed.' }
      ];
    }
  }

  return [
    { id: 'step-1', action: 'inspect-current-state', status: 'complete', note: 'Generic task inspected in fallback executor.' },
    { id: 'step-2', action: 'propose-safe-next-step', status: 'complete', note: 'Fallback executor proposed a next-step path instead of taking unsafe action.' },
    { id: 'step-3', action: 'verify-outcome', status: 'blocked', note: 'Fallback executor cannot fully verify without a concrete task type.' }
  ];
}
