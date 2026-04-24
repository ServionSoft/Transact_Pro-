# Database ERD diagrams

## Files

| File | Description |
|------|-------------|
| `full_erd.mmd` | Mermaid source — full connectivity overview (same graph as `DB/schema.md` §0). |
| `full_erd.svg` | Vector export (scales cleanly in docs/slides). |
| `full_erd.png` | Raster export (quick previews, Slack, etc.). |

## Regenerate

From this directory:

```bash
npx @mermaid-js/mermaid-cli@11.4.0 mmdc -i full_erd.mmd -o full_erd.svg
npx @mermaid-js/mermaid-cli@11.4.0 mmdc -i full_erd.mmd -o full_erd.png -b transparent
```

Requires Node.js + npm. First run may download Chromium for Puppeteer (large).

## Source of truth

- Detailed ERD blocks + column-level diagrams: `../../DB/schema.md` (mirror: `../schema.md`)
- Machine-readable schema + FK list: **`../../DB/schema.json`** only (`schema_version` **1.1.0** — document sets, library file scope; see `../product-summary.md`)

After editing `full_erd.mmd`, run the **Regenerate** commands above so `full_erd.svg` matches (CLI must run in an environment that can write the SVG; if the export is stale, regenerate locally).
