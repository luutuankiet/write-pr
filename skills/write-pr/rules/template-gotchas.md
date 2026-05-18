# Template Gotchas (custom delimiter edge cases)

write-pr uses `[[ ]]` for variables and `[% %]` for blocks (custom delimiters to dodge dbt-Jinja `{{ }}` collisions in code fences). This shifts the collision surface — here are the patterns that bite.

## Gotcha 1: `[[[ ... ]]]` triple-bracket trap

Looks like nested brackets; the parser sees variable-start + bad expression.

### Symptom

```jinja
- [[[ 'x' if checked else ' ' ]]] Item label
```

Nunjucks lexer sees `[[` (variable start), then content begins with `[`, then tries to parse `[ 'x' if checked else ' '` as an expression — fails with `unexpected token: [`.

### Workaround

Use `[% if %]` / `[% else %]` blocks that emit literal `[x]` / `[ ]`:

```jinja
- [% if checked %][x][% else %][ ][% endif %] Item label
```

The `[%` block-start is unambiguous (distinct from `[[` variable-start), and the block body is plain literal text.

This is exactly what `snippets/checklist.j2` does.

## Gotcha 2: Literal `[[ ... | filter ]]` in prose triggers eval

If you want to DOCUMENT a filter call in prose (e.g. "use `[[ foo | md_table ]]` to render a table"), the parser will try to evaluate `foo | md_table` at render time.

### Symptom

```jinja
The shorthand is [[ rows | md_table ]] which produces a markdown table.
```

At render time, `rows` is undefined → blank output (with `throwOnUndefined: false`) or error.

### Workaround A: prose paraphrase

Just say it in English:

```jinja
The shorthand is `rows | md_table` (pipe the array into the md_table filter)
which produces a markdown table.
```

### Workaround B: string-literal interpolation

Wrap the literal in a string-literal variable interpolation. The outer `[[ ]]` interpolates; the string content (with its own `[[ ]]`) emits unchanged.

```jinja
Use `[[ "[[ rows | md_table ]]" ]]` to render a table.
Use `[[ "[[ obj | json_pretty ]]" ]]` to render JSON.
```

Rendered: `` Use `[[ rows | md_table ]]` to render a table. ``

### Why NOT `[% raw %]`

Nunjucks `{% raw %}` / `{% endraw %}` does NOT work with custom delimiters. The raw-mode lexer hard-codes default `{% endraw %}` as the scanner target — it ignores the configured `blockStart` / `blockEnd`. With write-pr's `[% %]`, the parser sees `[% raw %]` as a regular block tag, then later trips on `[% endraw %]` with `unknown block tag: endraw`. Use the string-literal pattern above instead.

## Pre-render check

To catch undefined-variable silently-empty renders early, render to /tmp and grep:

```bash
write-pr render --template pr.md.j2 --evidence ./evidence --out /tmp/preview.md
rg -n '\[\[ ' /tmp/preview.md
# Expected: zero matches — any leftover `[[ ` means an unparsed variable
```
