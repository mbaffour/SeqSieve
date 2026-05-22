import { APP_VERSION } from "./sequenceUtils.js";

export function generateMethodsParagraph(settings, summary) {
  const format = summary?.format || settings.format || "FASTA";
  const type = summary?.sequenceType || settings.sequenceType || "sequences";
  const mode = labelMode(settings.mode || summary?.dedupeMode || "sequence");
  const rep = labelRepresentative(settings.representativeRule || "first");
  const clauses = [];

  if (format === "FASTQ") {
    clauses.push(`FASTQ records were deduplicated by exact ${mode} using SeqSieve v${APP_VERSION}.`);
  } else if (type === "Protein") {
    clauses.push(`Protein sequences were deduplicated by exact ${mode} using SeqSieve v${APP_VERSION}.`);
  } else {
    clauses.push(`${type} sequences were deduplicated by exact normalized ${mode} using SeqSieve v${APP_VERSION}.`);
  }

  if (settings.reverseComplement && (type === "DNA" || type === "RNA")) {
    clauses.push("Reverse-complement-aware matching was enabled, and selected representative sequences were retained in their original orientation.");
  }

  clauses.push(`${rep} was retained as the representative rule.`);
  clauses.push("Original identifiers, full headers, duplicate group membership, and counts were preserved in mapping, duplicate-group, and count tables for downstream interpretation.");

  if (format === "FASTQ") {
    clauses.push("Because deduplication can alter apparent read abundance, count tables should be retained and interpreted alongside deduplicated outputs.");
  }

  return clauses.join(" ");
}

export function generateSummaryReport({ settings, summary, warnings = [], inputMeta = {}, methodsParagraph }) {
  const lines = [
    "SeqSieve Summary Report",
    `Version: ${APP_VERSION}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Input",
    `File name: ${inputMeta.name || "demo_or_pasted_input"}`,
    `File size: ${inputMeta.sizeLabel || inputMeta.size || "unknown"}`,
    `Format: ${summary.format}`,
    `Sequence type: ${summary.sequenceType}`,
    "",
    "Settings",
    `Deduplication mode: ${summary.dedupeMode}`,
    `Case handling: ${settings.caseSensitive ? "case-sensitive" : "case-insensitive"}`,
    `Whitespace handling: ${settings.removeWhitespace ? "remove internal whitespace" : "preserve whitespace"}`,
    `Gap handling: ${settings.removeGaps ? "remove gaps" : "preserve gaps"}`,
    `Reverse complement mode: ${summary.reverseComplementUsed ? "enabled" : "disabled"}`,
    `Representative rule: ${settings.representativeRule}`,
    "",
    "Results",
    `Input records: ${summary.inputRecords}`,
    `Unique records: ${summary.uniqueRecords}`,
    `Duplicate records collapsed: ${summary.duplicateRecordsCollapsed}`,
    `Percent redundancy: ${summary.percentRedundancy.toFixed(2)}%`,
    `Largest duplicate group: ${summary.largestGroupSize}`,
    `Runtime: ${summary.runtimeMs.toFixed(1)} ms`,
    "",
    "Methods-ready paragraph",
    methodsParagraph || generateMethodsParagraph(settings, summary),
    "",
    "Warnings"
  ];

  if (warnings.length) warnings.forEach((warning) => lines.push(`- ${warning}`));
  else lines.push("- No warnings reported.");
  return `${lines.join("\n")}\n`;
}

function labelMode(mode) {
  if (mode === "id") return "sequence identifier";
  if (mode === "record") return "full record identity, defined as identifier plus sequence";
  return "sequence identity";
}

function labelRepresentative(rule) {
  if (rule === "longest_sequence") return "The longest sequence in each duplicate group";
  if (rule === "longest_header") return "The record with the longest header in each duplicate group";
  if (rule === "highest_mean_quality") return "The read with the highest mean Phred+33 quality score in each duplicate group";
  if (rule === "rename") return "Representatives were renamed with a deterministic prefix";
  return "The first occurrence of each unique sequence";
}
