# SeqSieve

SeqSieve is a static, browser-based exact sequence deduplication tool for FASTA and FASTQ records. It is designed for phage biology, microbial genomics, protein family analysis, FASTA database cleanup, amplicon dereplication, HMM preparation, BLAST hit cleanup, and general bioinformatics workflows.

SeqSieve processes files locally in your browser. Sequence data are not uploaded to a server.

## Launch Blog and Tutorials

- App: `index.html`
- Announcement and tutorial blog: `blog.html`
- Markdown tutorials: `TUTORIALS.md`
- Contribution guide: `CONTRIBUTING.md`
- Roadmap: `ROADMAP.md`
- Changelog: `CHANGELOG.md`

## Why It Exists

Bioinformatics cleanup often requires removing computational redundancy without destroying biological context. SeqSieve collapses exact duplicates while preserving original IDs, full headers, duplicate group membership, representative choices, counts, settings, warnings, and reproducible reports.

## Supported Formats

- FASTA: `.fa`, `.fasta`, `.faa`, `.fna`, `.ffn`, `.fas`, `.txt`
- FASTQ: `.fastq`, `.fq`
- Gzip: `.gz` files are supported in browsers with native `DecompressionStream` support

The app has no backend, no database, no analytics, and no tracking code.

## Deduplication Modes

- By sequence content: records with identical normalized sequence content are grouped.
- By sequence ID: records with the same parsed identifier are grouped.
- By full record: records with the same parsed identifier and identical normalized sequence are grouped.

SeqSieve performs exact deduplication. It is not a replacement for CD-HIT, MMseqs2, VSEARCH, or other approximate similarity-clustering tools when the goal is to group non-identical sequences by percent identity or coverage.

## Normalization

Settings include:

- Case-insensitive or case-sensitive comparison
- Remove internal whitespace
- Preserve or remove gaps
- Auto, DNA, RNA, or Protein sequence type
- Optional reverse-complement-aware comparison for DNA/RNA

Reverse-complement-aware deduplication uses a canonical comparison key but keeps the selected representative sequence in its original orientation.

## Representative Selection

SeqSieve can retain:

- First occurrence
- Longest sequence
- Longest header
- Highest mean Phred+33 quality for FASTQ
- Deterministic renamed representatives such as `rep_000001`

Representative choice is recorded in exported reports.

## FASTQ Caveats

Deduplicating FASTQ reads may remove apparent abundance. Counts and mapping tables should be retained and interpreted alongside deduplicated outputs. The highest mean quality option computes mean Phred+33 quality for representative selection among exact duplicate sequences.

## Outputs

SeqSieve exports:

- Deduplicated FASTA
- Deduplicated FASTQ for FASTQ inputs
- Mapping TSV from original records to representatives
- Duplicate groups TSV
- Counts TSV
- Summary report TXT
- Reproducibility JSON
- Methods-ready paragraph

Preview tables show the first 100 rows for responsiveness. Downloads include the full result.

## Example Workflows

- Phage protein database cleanup: deduplicate exact protein sequences, preserve all source headers, and export counts for representative families.
- HMM preparation: collapse exact duplicates before alignment or profile construction while retaining provenance.
- BLAST hit cleanup: remove exact redundant hit sequences and keep a mapping table from original accession to representative.
- Amplicon dereplication: collapse exact sequence variants carefully, retaining counts for abundance-aware interpretation.
- Reverse-complement-aware DNA cleanup: deduplicate records that differ only by strand orientation.

## Methods Language

Example protein FASTA language:

> Protein sequences were deduplicated by exact sequence identity using SeqSieve v0.1.0. The first occurrence of each unique sequence was retained as the representative sequence. Original identifiers, full headers, duplicate group membership, and counts were preserved in mapping, duplicate-group, and count tables for downstream interpretation.

Example DNA reverse-complement language:

> DNA sequences were deduplicated by exact normalized sequence identity using SeqSieve v0.1.0. Reverse-complement-aware matching was enabled, and selected representative sequences were retained in their original orientation. Original identifiers, full headers, duplicate group membership, and counts were preserved in mapping, duplicate-group, and count tables for downstream interpretation.

## Browser Limitations

SeqSieve runs entirely in browser memory. Large files above 50 MB may stress some systems; files above 250 MB should be handled with caution. Compressed files may expand substantially after decompression.

## Validation Tests

The browser test runner checks:

- Simple FASTA duplicate collapse
- Duplicate IDs with different sequences
- DNA reverse-complement matching
- Case-sensitive versus case-insensitive behavior
- Protein symbols including `X` and `*`
- Malformed FASTA warnings
- FASTQ duplicate reads with highest-quality representative selection

Fixture files are stored in `test-data/`.

## Reporting Errors and Requesting Improvements

Use the GitHub issue templates:

- Bug report: parser, dedupe, export, UI, browser, or scientific correctness issues
- Feature request: workflow-driven improvements
- Documentation improvement: README, blog, tutorials, or methods wording

Please avoid sharing private sequence data. A minimal safe example is best.

## GitHub Pages Deployment

No build step is required.

1. Commit the repository with `index.html` at the root.
2. Push to `https://github.com/mbaffour/SeqSieve`.
3. In GitHub, open Settings -> Pages.
4. Select the branch and root folder.
5. The app should be available at `https://mbaffour.github.io/SeqSieve/`.
6. The announcement blog should be available at `https://mbaffour.github.io/SeqSieve/blog.html`.

Local preview:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Design System

The design contract is documented in `design.md`. The CSS is token-driven and includes dark and light themes, accessible focus states, responsive tables, dashboard panels, warning states, and a scientific visual identity.

## Roadmap

See `ROADMAP.md`.

## Contributing

Contributions should preserve the core principle: remove computational redundancy without destroying biological context. Please add validation tests for parser, deduplication, export, or UI changes.

## License

MIT License. See `LICENSE`.
