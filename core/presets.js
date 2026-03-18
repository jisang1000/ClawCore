export function resolveEnvironmentPreset(task) {
  if (task.taskType !== 'environment-check') return task;
  if (Array.isArray(task.checks) && task.checks.length > 0) return task;

  const preset = task.preset || 'dev';
  const presets = {
    dev: [
      { name: 'node', command: 'node --version' },
      { name: 'python3', command: 'python3 --version' },
      { name: 'git', command: 'git --version' },
      { name: 'tmux', command: 'tmux -V' }
    ],
    obsidian: [
      { name: 'obsidian-app', command: 'ls /Applications | grep -i Obsidian' },
      { name: 'notesmd-cli', command: 'notesmd --help | head -n 1' }
    ],
    browser: [
      { name: 'node', command: 'node --version' },
      { name: 'python3', command: 'python3 --version' },
      { name: 'chrome-process', command: "ps aux | grep -i '[C]hrome' | head -n 1" }
    ]
  };

  if (!(preset in presets)) {
    task.resolvedPreset = null;
    return task;
  }

  task.checks = presets[preset];
  task.resolvedPreset = preset;
  return task;
}
