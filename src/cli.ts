#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderPR } from './render.js';
import { installSkill } from './install-skill.js';

// Read version from package.json so the CLI version never drifts from npm release.
const here = dirname(fileURLToPath(import.meta.url));
const pkgVersion = (() => {
  // dist/cli.js → ../package.json. Same shape whether run from build output or npm install.
  for (const candidate of [join(here, '..', 'package.json'), join(here, '..', '..', 'package.json')]) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')).version as string;
    } catch {
      /* try next */
    }
  }
  return 'unknown';
})();

const program = new Command();

program
  .name('write-pr')
  .description('Evidence-driven Pull Request templating for Claude Code agents')
  .version(pkgVersion);

program
  .command('render')
  .description('Render a Nunjucks PR template to markdown')
  .requiredOption('--template <path>', 'Path to .j2 template file')
  .requiredOption('--evidence <dir>', 'Path to evidence directory (load_json/load_text resolve relative to this)')
  .requiredOption('--out <path>', 'Output markdown file path')
  .action(async (opts: { template: string; evidence: string; out: string }) => {
    await renderPR(opts.template, opts.evidence, opts.out);
  });

program
  .command('install-skill')
  .description('Install the bundled write-pr skill into a Claude Code skills directory')
  .option('-g, --global', 'Install to ~/.claude/skills/write-pr/')
  .option('-p, --path <dir>', 'Install to <dir>/.claude/skills/write-pr/')
  .action((opts: { global?: boolean; path?: string }) => {
    if (opts.global && opts.path) {
      console.error(
        'write-pr: --global and --path are mutually exclusive. Pick one (or omit both for cwd/.claude/skills).',
      );
      process.exit(2);
    }
    installSkill({ global: opts.global, path: opts.path });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('write-pr:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
