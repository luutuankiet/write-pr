#!/usr/bin/env node
import { Command } from 'commander';
import { renderPR } from './render.js';
import { installSkill } from './install-skill.js';

const program = new Command();

program
  .name('write-pr')
  .description('Evidence-driven Pull Request templating for Claude Code agents')
  .version('0.1.0-alpha.0');

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
    installSkill({ global: opts.global, path: opts.path });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('write-pr:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
