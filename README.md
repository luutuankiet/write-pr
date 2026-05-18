# write-pr

Evidence-driven Pull Request templating for Claude Code agents.

**Quality bar:** 3-tier evidence stack (per-product → exhaustive schema audit → canonical multiset decomposition) + inline `file:line` citations + vanilla `<details>` collapsible sections + spoon-fed SQL with result tables.

## Quick start

```bash
# Install bundled skill into the current project
npx -y @luutuankiet/write-pr install-skill

# Or globally
npx -y @luutuankiet/write-pr install-skill --global

# Render a PR template (after the agent has written one)
npx -y @luutuankiet/write-pr render \
  --template pr.md.j2 \
  --evidence ./evidence \
  --out PR.md
```

## How it works

**Two-step compile pattern** — the value is freeing agent context from raw tool I/O.

1. **Agent gathers evidence** on the working host: runs queries, reads files, fetches CI artifacts. Dumps results to disk as JSON / `.mmd` / `.sql` under `evidence/`.
2. **Agent writes the template** (`pr.md.j2`) referencing disk paths via Nunjucks helpers like `[[ load_json('queries/q1.json') | md_table ]]`.
3. **`npx ... render`** reads JSON from disk, applies filters, writes final markdown. The agent never holds the raw tool I/O in context.

## Custom Jinja delimiters (mandatory)

Templates use `[[ ]]` for variables and `[% %]` for blocks. Default `{{ }}` collides with dbt-Jinja inside code-fence evidence (silently renders to empty string).

## What ships in the skill bundle

- `SKILL.md` — agent-facing workflow entry point
- `rules/` — rules of thumb (private-notation pre-render check, callout-inside-details gotcha, root_path convention, etc.)
- `snippets/` — composable `.j2` section patterns (TL;DR table, before/after code, design decision, numbered validation, CI failure analysis, etc.)
- `examples/minimal/` — fully synthetic worked example (≈1.5k)

See [`skills/write-pr/SKILL.md`](skills/write-pr/SKILL.md) for the agent-facing entry point.

## License

MIT — see [`LICENSE`](LICENSE).
