import { APP_VERSION, wrapSequence } from "./sequenceUtils.js";
import { generateSummaryReport } from "./reportGenerator.js";

export function exportDeduplicatedFasta(result, options = {}) {
  const wrap = options.fastaLineWrap === "none" ? "none" : Number(options.fastaLineWrap || 60);
  return result.groups.map((group) => {
    const header = options.representativeRule === "rename"
      ? group.representativeHeader
      : `${group.representativeHeader} count=${group.count}`;
    return `>${header}\n${wrapSequence(group.representativeSequence, wrap)}`;
  }).join("\n") + "\n";
}

export function exportDeduplicatedFastq(result, options = {}) {
  return result.groups.map((group) => {
    const record = group.representativeRecord;
    const header = options.representativeRule === "rename" ? group.representativeHeader : record.header;
    return `@${header}\n${record.sequence}\n${record.plusLine || "+"}\n${record.quality || ""}`;
  }).join("\n") + "\n";
}

export function rowsToTsv(rows, columns) {
  const escape = (value) => String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    columns.join("\t"),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join("\t"))
  ].join("\n") + "\n";
}

export function exportMappingTsv(result) {
  return rowsToTsv(result.mappingRows, [
    "original_index",
    "original_id",
    "original_header",
    "representative_id",
    "representative_header",
    "group_id",
    "sequence_length",
    "match_orientation",
    "is_representative",
    "dedupe_key_hash",
    "count_for_representative",
    "mean_quality"
  ]);
}

export function exportDuplicateGroupsTsv(result) {
  return rowsToTsv(result.duplicateRows, [
    "group_id",
    "representative_id",
    "count",
    "member_ids",
    "member_headers",
    "normalized_length"
  ]);
}

export function exportCountsTsv(result) {
  return rowsToTsv(result.countRows, [
    "representative_id",
    "count",
    "representative_length",
    "representative_header"
  ]);
}

export function exportSummaryReport(payload) {
  return generateSummaryReport(payload);
}

export function exportReproducibilityJson({ settings, summary, warnings, inputMeta, groups }, includeGroups = true) {
  const payload = {
    app: "SeqSieve",
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    settings,
    summary,
    warnings,
    input: inputMeta,
    groups: includeGroups ? groups.map((group) => ({
      groupId: group.groupId,
      representativeId: group.representativeId,
      keyHash: group.keyHash,
      count: group.count,
      normalizedLength: group.normalizedLength,
      members: group.members
    })) : undefined
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function sanitizeFilename(name) {
  return String(name || "seqsieve")
    .replace(/\.(fa|fasta|faa|fna|ffn|fas|txt|fastq|fq|gz)$/i, "")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "seqsieve";
}

export function timestampedFilename(base, suffix) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${sanitizeFilename(base)}_${stamp}_${suffix}`;
}

export function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
