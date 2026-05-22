# Contributing to SeqSieve

Thank you for helping improve SeqSieve.

SeqSieve has one core rule: remove computational redundancy without destroying biological context.

## Good Issues

Good reports include:

- A small safe FASTA or FASTQ example
- Browser and operating system
- Selected settings
- Expected result
- Observed result
- Which output is affected: preview, FASTA/FASTQ export, mapping TSV, groups TSV, counts TSV, summary TXT, JSON, or methods paragraph

## Feature Requests

Please describe the biological workflow first. Useful context includes:

- Data type
- Typical record count and file size
- Downstream tool or analysis
- Why exact deduplication is appropriate
- Whether counts, mappings, or representative choice are scientifically important

## Development

SeqSieve is static HTML, CSS, and vanilla JavaScript.

Run locally:

```bash
python -m http.server 8000
```

Run validation tests:

```bash
npm test
```

No build step is required.

## Pull Request Checklist

- Preserve local-only processing.
- Do not add analytics or tracking.
- Add or update validation tests for parser, dedupe, export, or report changes.
- Keep exact deduplication distinct from similarity clustering.
- Preserve original IDs, headers, counts, and duplicate group membership.
- Update `README.md`, `TUTORIALS.md`, or `blog.html` when user-facing behavior changes.
