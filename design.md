# SeqSieve Design System Contract

SeqSieve is a browser-based scientific instrument for exact sequence deduplication. This contract defines the visual language, component behavior, accessibility rules, and content tone used by the app.

## 1. Brand Essence

SeqSieve filters computational redundancy while preserving biological provenance. The interface should feel like a precision lab instrument: calm, trustworthy, reproducible, and biology-aware.

Core metaphor:
- Molecular mesh: redundancy passes through a precise sieve.
- Sequence bands: unique records and duplicate groups remain traceable.
- Hyper-realistic lab imagery: generated photos should feel playful, premium, and scientifically grounded without inventing product claims.
- Laboratory notebook clarity: every setting and output is explicit.

## 2. Design Principles

- Preserve context: counts, original IDs, headers, and group membership are always visible or exportable.
- Be honest: exact deduplication is distinct from similarity clustering and never implied to replace CD-HIT, MMseqs2, VSEARCH, or usearch-like workflows.
- Reveal provenance: representative choices and normalization settings are documented in the UI and exports.
- Stay local: privacy and browser-only processing are first-class interface facts.
- Keep density readable: scientific tools can be information-rich without becoming tiny or cluttered.

## 3. Color Tokens

Dark theme is the primary identity.

```css
:root {
  --bg: #0b1020;
  --bg-mesh: #0d1428;
  --surface: #111827;
  --surface-elevated: #172033;
  --surface-soft: #1e293b;
  --surface-glass: rgba(17, 24, 39, 0.78);
  --text: #e5eef9;
  --text-muted: #a7b4c8;
  --text-faint: #72819a;
  --border: #2d3a50;
  --border-strong: #40516d;
  --accent: #38d9a9;
  --accent-strong: #20c997;
  --accent-soft: rgba(56, 217, 169, 0.14);
  --cyan: #67e8f9;
  --cyan-soft: rgba(103, 232, 249, 0.13);
  --violet: #a78bfa;
  --amber: #fbbf24;
  --red: #f87171;
  --success: #38d9a9;
  --warning: #fbbf24;
  --danger: #f87171;
}
```

Light theme uses a clean white/gray base with the same scientific accents.

```css
[data-theme="light"] {
  --bg: #f7fafc;
  --bg-mesh: #eef4f7;
  --surface: #ffffff;
  --surface-elevated: #f1f5f9;
  --surface-soft: #e8eef5;
  --surface-glass: rgba(255, 255, 255, 0.82);
  --text: #0f172a;
  --text-muted: #475569;
  --text-faint: #64748b;
  --border: #cbd5e1;
  --border-strong: #94a3b8;
}
```

## 4. Typography Tokens

- Sans stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono stack: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`
- Display: 44 px desktop, 32 px mobile, 1.02 line height.
- Section heading: 24-30 px, 1.18 line height.
- Card heading: 16-18 px, 1.3 line height.
- Body: 15-16 px, 1.6 line height.
- Small labels: 12-13 px, uppercase only for short metadata labels.
- Tables: 13 px, readable row height, no compressed scientific data.

## 5. Spacing, Radius, Shadow Tokens

Spacing scale:
- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-12: 48px`
- `--space-16: 64px`

Radius:
- Small: `8px`
- Medium: `14px`
- Large: `22px`
- Pill: `999px`

Shadows:
- Soft elevation only.
- Use border and background shifts before heavy shadows.
- No harsh floating SaaS card stacks.

## 6. Component Rules

- Header: compact, persistent orientation. Brand, tagline, local-only badge, theme toggle, and links.
- Upload dropzone: large, keyboard reachable, high-contrast focus ring, clear drag state.
- Settings cards: grouped by scientific intent, not arbitrary form layout.
- Toggle groups: selected state uses accent outline and soft fill.
- Buttons: primary actions use green accent; secondary actions use surface/border; destructive reset uses red only when needed.
- Progress: show stage, percent, and runtime together.
- Stat cards: compact scientific readouts with label, value, and context.
- Warnings: amber for caution, red for blocking errors; include text labels and icons or labels so color is not the only signal.
- Tabs: native button tabs with selected `aria-selected`.
- Tables: first 100 rows in preview, horizontally scrollable, filterable, sortable where useful.
- Code/FASTA preview: monospace, line wrapping controlled, never tiny.
- Visual assets: use compressed local imagery with descriptive alt text unless the image is decorative. Images must support scientific meaning, not replace functional controls.
- Export panel: grouped download buttons with explicit file types.
- Education cards: concise, collapsible, and honest about limitations.

## 7. Accessibility Rules

- Use semantic landmarks: header, main, section, footer.
- Every input has a visible label.
- Keyboard focus uses an accent outline with contrast in both themes.
- Drag-and-drop is additive; file picker must be equally capable.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone for warnings, status, or selected controls.
- Tables keep headers visible to screen readers.
- Interactive controls meet a minimum target size of 40 px.

## 8. Content Tone Rules

- Direct, scientific, and reproducible.
- Avoid hype, AI language, and vague claims.
- Prefer "exact sequence identity" over ambiguous "similarity."
- Explain caveats where they matter, especially FASTQ abundance and reverse-complement matching.
- Mention external clustering tools only as separate approximate methods.

## 9. Anti-Patterns

- Generic blue SaaS dashboards.
- Toy-like neon palettes.
- Silent data loss.
- Collapsing biological context without mapping exports.
- Similarity clustering language for exact deduplication.
- Walls of text before the user can act.
- Tiny unreadable tables.
- Hidden uploads, analytics, tracking, or network dependencies.

## 10. UI Copy Examples

- "Deduplicate sequences. Preserve context."
- "Runs locally in your browser. No sequence data are uploaded."
- "Exact deduplication collapses identical records only."
- "Clustering non-identical sequences by percent identity requires tools such as CD-HIT, MMseqs2, VSEARCH, or usearch-like workflows."
- "Representative sequences stay in their selected original orientation."
- "Warnings were found. Review them before using exports downstream."
