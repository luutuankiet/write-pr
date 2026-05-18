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

## Filter reference

| Filter | Use | Example |
|---|---|---|
| `md_table` | JSON array → markdown table | `[[ load_json('q.json') \| md_table ]]` |
| `json_pretty` | Value → fenced \`\`\`json block, optional `<details>` fold | `[[ obj \| json_pretty(fold=true) ]]` |
| `gh_callout` | GitHub callout (TIP/NOTE/IMPORTANT/WARNING/CAUTION) | `[[ 'TIP' \| gh_callout('schema is bw-compat') ]]` |
| `mermaid` | Read `.mmd` file → fenced \`\`\`mermaid block | `[[ 'diagrams/flow.mmd' \| mermaid ]]` |
| `code_expand` | Read source file → fenced code block w/ file:line header | `[[ 'src/foo.sql' \| code_expand(lines='10-25') ]]` |
| `ci_summary` | dbt `run_results.json` → status + errors + our-models | `[[ load_json('ci_runs/r.json') \| ci_summary(['model.proj.foo']) ]]` |

Full signatures: `rules/placeholder-vocab.md`. Two known custom-delim edge cases: `rules/template-gotchas.md`.

## Snippets (composable section patterns)

10 snippets at `snippets/*.j2` covering the most-frequent sections from a survey of 7 real PRs (5/7: TL;DR + Validation + Changes; 4/7: Before/After + Checklist; 3/7: Mermaid flowchart):

| Snippet | Section | Filters used |
|---|---|---|
| `tldr_kv_table.j2` | Top-of-PR metrics summary | `md_table` |
| `manifest_tip_header.j2` | TIP callout + ticket link | `gh_callout` |
| `before_after_img_table.j2` | 2-col before/after screenshots | — |
| `before_after_code.j2` | Stacked before/after code | — |
| `design_decision.j2` | Options table + chosen + rationale | `md_table` |
| `numbered_validation.j2` | `### N. <Title>` sub-section | — |
| `mermaid_flowchart.j2` | Fenced mermaid block from `.mmd` | `mermaid` |
| `sql_appendix.j2` | Q-numbered SQL with file:line header | `code_expand` |
| `ci_failure_section.j2` | dbt CI run attribution | `ci_summary`, `load_json` |
| `checklist.j2` | Bottom-of-PR reviewer checklist | — |

Two usage modes: copy-paste (most agents) or `[% include 'snippets/X.j2' %]` (the renderer walks up from cwd / template dir to find the install location). See `snippets/README.md`.

## Rules of thumb

- `rules/workflow.md` — the 5-step agent workflow (gather → template → render → pre-flight greps → paste)
- `rules/disk-convention.md` — evidence/ directory layout (queries/code/diagrams/ci_runs/images) + cwd vs evidence vs root_path
- `rules/placeholder-vocab.md` — full filter + global signatures with examples
- `rules/private-notation.md` — pre-render grep checklist (NEVER ship LOG-NNN / TASK-NNN / gsd-lite refs) + client-info scrubbing
- `rules/callout-gotcha.md` — GitHub `[!TIP]` does NOT render styled inside `<details>` (plain text only); put callouts outside
- `rules/root-path.md` — frontmatter `root_path:` for repo-relative file:line citations
- `rules/template-gotchas.md` — two custom-delim edge cases (`[[[ ]]]` trap, literal-filter-in-prose) + workarounds

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
