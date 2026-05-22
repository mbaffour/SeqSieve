# SeqSieve Tutorials

These tutorials mirror the browser workflow and use the fixture files in `test-data/`.

## Tutorial 1: Exact FASTA Deduplication

Use this when you want to collapse identical sequence content while preserving provenance.

1. Open `index.html` through GitHub Pages or a local server.
2. Upload `test-data/simple_duplicates.fasta`.
3. Keep format as `Auto` or choose `FASTA`.
4. Set deduplication mode to `By sequence content`.
5. Keep `Case-insensitive` off and `Remove internal whitespace` on.
6. Click `Deduplicate`.
7. Confirm:
   - Input records: 3
   - Unique representatives: 2
   - Duplicates collapsed: 1
8. Download:
   - Deduplicated FASTA
   - Mapping TSV
   - Duplicate groups TSV
   - Counts TSV
   - Summary report TXT
   - Reproducibility JSON

## Tutorial 2: Duplicate IDs With Different Sequences

Use this to understand why sequence deduplication and ID deduplication are different.

1. Upload `test-data/duplicate_ids_different_sequences.fasta`.
2. Run with `By sequence content`.
3. Confirm that two unique sequence representatives remain.
4. Change deduplication mode to `By sequence ID`.
5. Run again.
6. Confirm that records with the same parsed ID are grouped.
7. Review warnings for duplicate IDs.

## Tutorial 3: Reverse-Complement-Aware DNA Deduplication

Use this when forward and reverse-complement DNA/RNA records should be treated as equivalent.

1. Upload `test-data/dna_reverse_complement_test.fasta`.
2. Set sequence type to `DNA`.
3. Run with reverse complement off and confirm two unique records.
4. Turn on `Treat reverse complements as duplicates`.
5. Run again and confirm one unique representative.
6. Open the mapping table and inspect `match_orientation`.

The representative sequence remains in its selected original orientation. SeqSieve uses the canonicalized sequence only for comparison.

## Tutorial 4: Case Sensitivity

Use this when case encodes meaning in your data, or when you need strict byte-like comparison after whitespace/gap normalization.

1. Upload `test-data/case_sensitivity_test.fasta`.
2. Run with default case-insensitive comparison and confirm one unique representative.
3. Enable `Case-sensitive`.
4. Run again and confirm two unique representatives.

## Tutorial 5: Protein Symbols

Use this to verify protein records with common ambiguous or stop symbols.

1. Upload `test-data/protein_with_special_chars.fasta`.
2. Set sequence type to `Protein`.
3. Run deduplication.
4. Confirm one unique representative.
5. Confirm that `X` and `*` are not flagged as unexpected protein characters.

## Tutorial 6: FASTQ Quality-Aware Representatives

Use this when identical reads have different quality strings.

1. Upload `test-data/simple_fastq.fastq`.
2. Set format to `FASTQ`.
3. Set representative rule to `Highest mean quality for FASTQ`.
4. Run deduplication.
5. Confirm that the duplicate read with the higher mean Phred+33 score is selected.
6. Keep the counts table with downstream interpretation.

FASTQ deduplication can alter apparent read abundance. Retain mapping and counts exports.

## Tutorial 7: Warnings and Malformed Records

Use this to understand how SeqSieve reports questionable inputs.

1. Upload `test-data/malformed_records.fasta`.
2. Run analysis.
3. Open the `Warnings` tab.
4. Review warnings for:
   - Text before the first FASTA header
   - Empty sequence records
   - Unexpected sequence characters
5. Correct source records where appropriate and rerun.

## Reporting a Problem From a Tutorial

When reporting an issue, include:

- Tutorial name
- Fixture file or minimal input
- Browser and operating system
- Selected settings
- Expected result
- Observed result
- Whether the problem affects parsing, grouping, previews, exports, or scientific interpretation
