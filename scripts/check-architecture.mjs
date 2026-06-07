#!/usr/bin/env node

/**
 * Architecture boundary checker.
 * Reports violations of the rule:
 *   Core (lib/, services/, components/layout/, components/ui/) must NOT import from activities/pickem/
 *
 * Usage: node scripts/check-architecture.mjs
 * Returns exit code 0 if no violations, 1 if violations found.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const CORE_DIRECTORIES = [
  'lib',
  'services',
  'components/layout',
  'components/ui',
  'components/auth',
  'components/brand',
];

const DISALLOWED_PATTERNS = [
  /from\s+['"]@\/activities\/pickem/,
  /from\s+['"]@\/components\/pickem/,
  /from\s+['"]@\/app\/actions\/scoring/,
  /from\s+['"]@\/app\/actions\/results-data/,
  /from\s+['"]@\/app\/actions\/participant/,
  /from\s+['"]@\/app\/actions\/tiebreaker/,
  /from\s+['"]@\/app\/actions\/creator-profile/,
];

const ALLOWED_OVERRIDES = [];

function findFiles(dir, baseDir = ROOT) {
  const fullPath = join(baseDir, dir);
  if (!existsSync(fullPath)) return [];

  const entries = [];
  const readDir = (currentPath, relativePath) => {
    const items = readdirSync(currentPath, { withFileTypes: true });
    for (const item of items) {
      const full = join(currentPath, item.name);
      const rel = relativePath ? `${relativePath}/${item.name}` : item.name;
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        readDir(full, rel);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
        entries.push({ full, relative: rel });
      }
    }
  };

  try {
    readDir(fullPath, dir);
  } catch (e) {
    console.error(`Warning: could not read directory ${fullPath}: ${e.message}`);
  }
  return entries;
}

let violations = [];
const filesToCheck = CORE_DIRECTORIES.flatMap(dir => findFiles(dir));

for (const file of filesToCheck) {
  if (ALLOWED_OVERRIDES.some(o => file.relative === o)) continue;

  try {
    const content = readFileSync(file.full, 'utf-8');
    for (const pattern of DISALLOWED_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          file: file.relative,
          match: pattern.source,
        });
        break;
      }
    }
  } catch (e) {
    // skip binary or unreadable files
  }
}

if (violations.length > 0) {
  console.log('❌ Architecture boundary violations found:\n');
  for (const v of violations) {
    console.log(`  ${v.file}`);
    console.log(`    → imports matching: ${v.match}\n`);
  }
  console.log(`Total: ${violations.length} violation(s)`);
  process.exit(1);
} else {
  console.log('✅ No architecture boundary violations found.');
  process.exit(0);
}
