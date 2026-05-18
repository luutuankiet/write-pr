# Release Notes Index

Append-only narrative release notes for `@luutuankiet/write-pr`.

## Authoring
- **One file per release.** Name: `vX.Y.Z.md` (matches the git tag exactly). No overwrites.
- **Audience:** human first, then agents picking up context six months later.
- **Structure:** TL;DR → Why this release exists → Highlights table → How it works (Mermaid) → Before/After → Configuration → Upgrade notes → Files changed → Hard truth (optional).
- **Voice:** pitch, not changelog. If a line could be a commit subject (`feat: add X`), cut it or rewrite it.
- **Diagrams:** Mermaid only — GitHub renders it natively in release bodies. Never ASCII art.

## Publishing
The `.github/workflows/publish.yml` workflow reads `releases/${{ github.ref_name }}.md` via `gh release create --notes-file` when a tag is pushed. **Missing file = workflow fails loudly** — every tag MUST have a hand-written narrative entry committed BEFORE the tag is pushed.

Trigger sequence:
```bash
# 1. Write releases/vX.Y.Z.md
# 2. Bump version in package.json (npm version X.Y.Z --no-git-tag-version)
# 3. Commit both
git add releases/vX.Y.Z.md package.json
git commit -m "chore: release vX.Y.Z"
git push

# 4. Tag and push
git tag vX.Y.Z
git push origin vX.Y.Z
# CI does: build → release → publish (OIDC provenance)
```

## Index
| Version | Date | Theme |
|---|---|---|
| [v0.1.0-alpha.1](./v0.1.0-alpha.1.md) | 2026-05-18 | OIDC publish verification - no functional change |
| [v0.1.0-alpha.0](./v0.1.0-alpha.0.md) | 2026-05-18 | Initial alpha: render CLI + install-skill CLI + bundled minimal example + 1 filter (md_table) + 18 vitest cases |
