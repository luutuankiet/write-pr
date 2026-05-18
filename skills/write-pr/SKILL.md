---
name: write-pr
description: Render evidence-driven Pull Requests with inline file:line citations, spoon-fed SQL+results, vanilla <details> collapsible sections, and dbt-Jinja-safe templating. Use proactively when writing a PR for a non-trivial code change that deserves a detailed evidence trail — refactors, performance work, schema migrations, model parity validations. Companion to npm package @luutuankiet/write-pr.
---

# write-pr — Evidence-Driven PR Templating

## What this is

A two-step compile pattern for writing Pull Requests at the density of a 3-tier evidence stack — without paying for raw tool I/O in agent context.

Reference quality bar: SCD-2 pre-explode refactor PR with per-product SUM validation, exhaustive 56-field schema audit, canonical multiset decomposition, plus CI-run failure attribution. 62 KB / 890 lines. Zero reviewer context-switching.

## When to use this skill

Proactively, when:
- Writing a PR for a non-trivial refactor, perf optimization, schema migration, or data-pipeline change
- The reviewer needs to see SQL + results inline (not "here's a BQ link, go run it yourself")
- You have file:line citations that need to be expanded with code context
- The PR has multi-section structure (TL;DR / Changes / Validation / Decisions / Appendix)
- You want to fold long evidence blocks into vanilla GitHub `<details>` for scannability

Skip this skill for trivial PRs (typo fixes, single-line config tweaks, dependency bumps).

## The two-step compile pattern

```
Agent → 1. Gather evidence on the working host:
          - Run BQ/DuckDB queries → dump prettyjson to evidence/queries/*.json
          - Fetch CI artifacts → save to evidence/ci_runs/*.json
          - Author mermaid diagrams → save to evidence/diagrams/*.mmd
        2. Write pr.md.j2 referencing those disk paths via Nunjucks helpers
        3. Invoke: npx -y @luutuankiet/write-pr render \
             --template pr.md.j2 \
             --evidence ./evidence \
             --out PR.md
        4. Pre-flight check (rg for private notation, see rules/private-notation.md)
        5. Paste rendered PR.md into GitHub PR body
```

The render script reads the disk evidence and applies filters — your context never holds raw tool I/O.

## Custom Jinja delimiters (MANDATORY)

Templates use `[[ ]]` for variables and `[% %]` for blocks.

```jinja
[[ load_json('queries/q1.json') | md_table ]]

[% if meta.foo %][[ meta.foo ]][% endif %]

[# this is a comment #]
```

**Why:** default `{{ }}` collides with dbt-Jinja inside code-fence evidence and silently renders to empty string.

## Filter reference (Phase 1)

| Filter | Use | Example |
|---|---|---|
| `md_table` | JSON array → markdown table | `[[ load_json('q.json') \| md_table ]]` |

Phases 2-3 add: `code_expand`, `ci_summary`, `gh_callout`, `json_pretty`, `mermaid`.

## Snippets (composable section patterns)

Phase 3 will ship 10 snippets at `snippets/*.j2`. For now, see `examples/minimal/pr.md.j2` for a worked example of the rendering mechanic.

## Rules of thumb (stubs for Phase 2)

- `rules/workflow.md` — full agent workflow
- `rules/disk-convention.md` — evidence/ directory layout
- `rules/placeholder-vocab.md` — filter signatures + examples
- `rules/private-notation.md` — pre-render grep checklist (NEVER ship LOG-NNN / TASK-NNN / gsd-lite refs)
- `rules/callout-gotcha.md` — GitHub `[!TIP]` does NOT render inside `<details>` (plain text only)
- `rules/root-path.md` — frontmatter `root_path:` for repo-relative file:line cites

## Quick test (verify install)

```bash
# Render the bundled minimal example
cd <your-project>
npx -y @luutuankiet/write-pr render \
  --template .claude/skills/write-pr/examples/minimal/pr.md.j2 \
  --evidence .claude/skills/write-pr/examples/minimal/evidence \
  --out /tmp/test-pr.md
diff /tmp/test-pr.md .claude/skills/write-pr/examples/minimal/pr.rendered.md
# Expected: zero diff output
```
