import { parseFasta } from "./fastaParser.js";
import { parseFastq } from "./fastqParser.js";
import { dedupeRecords } from "./dedupeEngine.js";
import { detectSequenceType } from "./sequenceUtils.js";

export const demoFasta = `>phage_tail_fiber_A source=M13
MKKLLFAIPLVVPFYSHS
>phage_tail_fiber_A_duplicate source=M13 replicate=2
MKKLLFAIPLVVPFYSHS
>capsid_protein source=M13
MKTAYIAKQRQISFVKSHFSRQDILDLW
>capsid_protein_lower source=curated_db
mktayiakqrqisfvkshfsrqdildlw
>hypothetical_protein
GGGAAAVVVTTT
`;

export const testFixtures = {
  simple_duplicates: `>seq1
MKTLLV
>seq2
MKTLLV
>seq3
MKAILV
`,
  duplicate_ids_different_sequences: `>seq1
AAAA
>seq1
TTTT
`,
  dna_reverse_complement_test: `>seqA
ATGC
>seqB
GCAT
`,
  case_sensitivity_test: `>lower
atgc
>upper
ATGC
`,
  protein_with_special_chars: `>prot1
MKTXXLV*
>prot2
MKTXXLV*
`,
  malformed_records: `Text before first header
>empty_record
>weird_chars
ATG??NN
>ok
ATGC
`,
  simple_fastq: `@read1
ACGT
+
!!!!
@read2
ACGT
+
IIII
@read3
TGCA
+
####
`
};

export function runValidationTests() {
  const tests = [
    {
      name: "simple FASTA duplicate collapse",
      run: () => {
        const parsed = parseFasta(testFixtures.simple_duplicates);
        const result = dedupeRecords(parsed.records, baseOptions({ sequenceType: "Protein" }));
        return expectSummary(result, { inputRecords: 3, uniqueRecords: 2, duplicateRecordsCollapsed: 1 });
      }
    },
    {
      name: "duplicate IDs differ by sequence mode",
      run: () => {
        const parsed = parseFasta(testFixtures.duplicate_ids_different_sequences);
        const sequenceResult = dedupeRecords(parsed.records, baseOptions({ mode: "sequence", sequenceType: "DNA" }));
        const idResult = dedupeRecords(parsed.records, baseOptions({ mode: "id", sequenceType: "DNA" }));
        return {
          pass: sequenceResult.summary.uniqueRecords === 2 && idResult.summary.uniqueRecords === 1 && parsed.warnings.some((w) => w.includes("Duplicate ID")),
          expected: "sequence mode 2 unique, ID mode 1 group, duplicate ID warning",
          observed: `sequence=${sequenceResult.summary.uniqueRecords}, id=${idResult.summary.uniqueRecords}, warnings=${parsed.warnings.length}`
        };
      }
    },
    {
      name: "DNA reverse complement",
      run: () => {
        const parsed = parseFasta(testFixtures.dna_reverse_complement_test);
        const off = dedupeRecords(parsed.records, baseOptions({ sequenceType: "DNA", reverseComplement: false }));
        const on = dedupeRecords(parsed.records, baseOptions({ sequenceType: "DNA", reverseComplement: true }));
        return {
          pass: off.summary.uniqueRecords === 2 && on.summary.uniqueRecords === 1,
          expected: "off=2 unique, on=1 unique",
          observed: `off=${off.summary.uniqueRecords}, on=${on.summary.uniqueRecords}`
        };
      }
    },
    {
      name: "case sensitivity",
      run: () => {
        const parsed = parseFasta(testFixtures.case_sensitivity_test);
        const insensitive = dedupeRecords(parsed.records, baseOptions({ sequenceType: "DNA", caseSensitive: false }));
        const sensitive = dedupeRecords(parsed.records, baseOptions({ sequenceType: "DNA", caseSensitive: true }));
        return {
          pass: insensitive.summary.uniqueRecords === 1 && sensitive.summary.uniqueRecords === 2,
          expected: "case-insensitive=1, case-sensitive=2",
          observed: `insensitive=${insensitive.summary.uniqueRecords}, sensitive=${sensitive.summary.uniqueRecords}`
        };
      }
    },
    {
      name: "protein special characters",
      run: () => {
        const parsed = parseFasta(testFixtures.protein_with_special_chars);
        const result = dedupeRecords(parsed.records, baseOptions({ sequenceType: "Protein" }));
        return {
          pass: result.summary.uniqueRecords === 1 && !result.warnings.some((w) => w.includes("Unexpected")),
          expected: "1 unique; X and * accepted as protein symbols",
          observed: `${result.summary.uniqueRecords} unique; warnings=${result.warnings.length}`
        };
      }
    },
    {
      name: "malformed FASTA warnings",
      run: () => {
        const parsed = parseFasta(testFixtures.malformed_records);
        const result = dedupeRecords(parsed.records, baseOptions({ sequenceType: "DNA" }));
        return {
          pass: parsed.records.length >= 2 && parsed.warnings.length > 0 && result.summary.inputRecords >= 2,
          expected: "warnings shown and no crash",
          observed: `${parsed.records.length} records, parser warnings=${parsed.warnings.length}, engine warnings=${result.warnings.length}`
        };
      }
    },
    {
      name: "FASTQ highest quality representative",
      run: () => {
        const parsed = parseFastq(testFixtures.simple_fastq);
        const type = detectSequenceType(parsed.records);
        const result = dedupeRecords(parsed.records, baseOptions({
          format: "FASTQ",
          sequenceType: type === "Mixed/Unknown" ? "DNA" : type,
          representativeRule: "highest_mean_quality"
        }));
        const firstGroup = result.groups.find((group) => group.count === 2);
        return {
          pass: result.summary.uniqueRecords === 2 && firstGroup?.representativeRecord.id === "read2",
          expected: "2 unique; read2 selected for duplicated ACGT",
          observed: `${result.summary.uniqueRecords} unique; representative=${firstGroup?.representativeRecord.id || "none"}`
        };
      }
    }
  ];

  return tests.map((test) => {
    try {
      const outcome = test.run();
      return { name: test.name, ...outcome };
    } catch (error) {
      return { name: test.name, pass: false, expected: "no exception", observed: error.message };
    }
  });
}

function baseOptions(overrides = {}) {
  return {
    format: "FASTA",
    mode: "sequence",
    caseSensitive: false,
    removeWhitespace: true,
    removeGaps: false,
    sequenceType: "DNA",
    reverseComplement: false,
    representativeRule: "first",
    renamePrefix: "rep_",
    preserveOriginalHeader: true,
    fastaLineWrap: 60,
    ...overrides
  };
}

function expectSummary(result, expected) {
  const observed = result.summary;
  const pass = Object.entries(expected).every(([key, value]) => observed[key] === value);
  return {
    pass,
    expected: JSON.stringify(expected),
    observed: JSON.stringify({
      inputRecords: observed.inputRecords,
      uniqueRecords: observed.uniqueRecords,
      duplicateRecordsCollapsed: observed.duplicateRecordsCollapsed
    })
  };
}
