import path from 'path';
import { fileURLToPath } from 'url';
import { adoptCandidateRule } from './rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const ruleArg = process.argv.find((x) => x.startsWith('--rule='));

if (!ruleArg) {
  console.error('Missing --rule=<text>');
  process.exit(1);
}

const ruleText = ruleArg.slice('--rule='.length);
const result = adoptCandidateRule(baseDir, ruleText);
console.log(JSON.stringify(result, null, 2));
