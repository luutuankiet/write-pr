# Placeholder Vocabulary

Quick reference for write-pr template variables, globals, and filters.

## Globals (always in template scope)

| Name | Type | Source |
|---|---|---|
| `meta` | object | Frontmatter YAML, parsed |
| `load_json(path)` | function | Read + parse JSON from `<evidence_dir>/<path>` |
| `load_text(path)` | function | Read text from `<evidence_dir>/<path>` |
| `evidence_dir` | string | Absolute path to `--evidence` arg |

## Filters

### `md_table(data, columns?, align?)`
JSON array → markdown table.
- `columns`: explicit column order (default: auto-detect from first row, insertion order)
- `align`: 'L' | 'R' | 'C' global OR per-column `{col: Align}` (default: numeric cols R, others L)

```jinja
[[ rows | md_table ]]
[[ rows | md_table(columns=['name', 'count']) ]]
[[ rows | md_table(align={count: 'R', status: 'C'}) ]]
```

### `json_pretty(data, indent?, fold?, summary?)`
Value → fenced ```json block, optional `<details>` fold.
- `indent`: default 2
- `fold`: default false — wraps in `<details><summary>JSON</summary>...`
- `summary`: default 'JSON' — `<summary>` label when fold=true

### `gh_callout(type, text)`
- `type`: TIP | NOTE | IMPORTANT | WARNING | CAUTION (case-insensitive)
- `text`: body; multi-line gets `> ` prefix per line

```jinja
[[ 'TIP' | gh_callout('Schema change is backwards compatible.') ]]
```

**GOTCHA:** doesn't render styled inside `<details>` — see `callout-gotcha.md`.

### `mermaid(path)`
Read `.mmd` file (relative to evidence dir; absolute paths honored) → fenced ```mermaid block.

### `code_expand(path, lines?, lang?, root_path?, annotate?)`
Read source file (relative to frontmatter.root_path) → fenced code block with `# <path>:<lines>` header.
- `lines`: 'N-M' or `[N, M]`; omit for whole file
- `lang`: override auto-detect (default: detected from extension)
- `root_path`: per-call override of frontmatter (or `evidence_dir` for self-contained examples)
- `annotate`: `{lineNum: 'note text'}` map; appends ` <comment> <- text` to the matching line

### `ci_summary(runResults, our_models)`
dbt `run_results.json` → status counts table + errors block + (optional) our-models breakdown.
- Two-arg form: `[[ runs | ci_summary(['model.proj.foo']) ]]`
- Opts form: `[[ runs | ci_summary({our_models: [...], message_cap: 300}) ]]`

## Custom delimiters (MANDATORY)

| Default Jinja | write-pr | Reason |
|---|---|---|
| `{{ var }}` | `[[ var ]]` | Avoid dbt-Jinja collision in code fences |
| `{% if %}` | `[% if %]` | Same |
| `{# comment #}` | `[# comment #]` | Same |

See `template-gotchas.md` for the two edge cases that bite (`[[[ ... ]]]` and literal-filter-in-prose).
