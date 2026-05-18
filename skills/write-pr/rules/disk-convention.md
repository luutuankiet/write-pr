# Disk Convention

write-pr expects a specific `evidence/` layout (relative to your `pr.md.j2`):

```
<pr-work-dir>/
├── pr.md.j2
└── evidence/
    ├── queries/      *.json from BQ / DuckDB / SQL runs (bq --format=prettyjson dumps)
    ├── code/         optional cache; usually read live from working tree via code_expand
    ├── images/       optional; usually skip in favor of paste-to-GitHub
    ├── diagrams/     *.mmd Mermaid sources
    └── ci_runs/      *.json from CI run results (dbt run_results.json, GH Actions artifacts)
```

## Why this layout

| Subdir | Loaded via | Purpose |
|---|---|---|
| `queries/` | `load_json('queries/q_X.json')` | Tabular data — feeds `md_table` filter |
| `code/` | `load_text('code/X.py')` OR `code_expand` from source tree | Code blocks |
| `diagrams/` | `'diagrams/X.mmd' \| mermaid` | Fenced mermaid blocks |
| `ci_runs/` | `load_json('ci_runs/run_X.json') \| ci_summary([...])` | dbt CI summary |
| `images/` | Usually unused — see below | — |

## Images: don't template them

Convention: paste images directly into the GitHub PR body editor. GitHub auto-uploads to user-attachments and inserts `<img>` HTML. Don't try to template image refs — you can't predict the URL until upload time.

If you DO need templated images (e.g. asset URLs you control), use `snippets/before_after_img_table.j2`.

## CWD vs evidence dir vs root_path

Three distinct concepts:

| Concept | What | Resolution |
|---|---|---|
| `--evidence <dir>` | Where `load_json` / `load_text` / `mermaid` resolve paths | Per-render flag |
| `frontmatter.root_path` | Where `code_expand` resolves paths | Per-template YAML |
| `process.cwd()` | Where npx is invoked from | Where snippet-include discovery walks up from |

Keep them distinct: evidence dir for synthetic / dumped artifacts; root_path for live source tree.
