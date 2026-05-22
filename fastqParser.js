import { parseHeader } from "./sequenceUtils.js";

export function parseFastq(text) {
  const warnings = [];
  const errors = [];
  const records = [];
  const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const nonTrailingLines = trimTrailingBlankLines(lines);
  const idCounts = new Map();

  for (let i = 0; i < nonTrailingLines.length; i += 4) {
    const startLine = i + 1;
    const headerLine = nonTrailingLines[i];
    const sequenceLine = nonTrailingLines[i + 1];
    const plusLine = nonTrailingLines[i + 2];
    const qualityLine = nonTrailingLines[i + 3];

    if (headerLine === undefined || headerLine.trim() === "") continue;
    if (!headerLine.startsWith("@")) {
      warnings.push(`Line ${startLine}: expected FASTQ header beginning with @; record skipped.`);
      continue;
    }
    if (sequenceLine === undefined || plusLine === undefined || qualityLine === undefined) {
      warnings.push(`Line ${startLine}: incomplete FASTQ record; record skipped.`);
      break;
    }

    const parsed = parseHeader(headerLine, "@");
    const recordWarnings = [];
    if (!plusLine.startsWith("+")) recordWarnings.push("Plus line does not begin with +");
    if (sequenceLine.length !== qualityLine.length) {
      recordWarnings.push(`Sequence length (${sequenceLine.length}) differs from quality length (${qualityLine.length})`);
    }

    const id = parsed.id || `read_${records.length + 1}`;
    if (!parsed.id) recordWarnings.push("Header has no parsed ID");
    const record = {
      index: records.length,
      id,
      header: parsed.header || id,
      description: parsed.description,
      sequence: sequenceLine.trim(),
      rawSequenceLength: sequenceLine.trim().length,
      plusLine,
      quality: qualityLine.trim(),
      meanQuality: meanPhred33(qualityLine.trim()),
      startLine,
      endLine: startLine + 3,
      warnings: recordWarnings
    };

    recordWarnings.forEach((warning) => warnings.push(`Line ${startLine}: ${warning} for "${record.id}".`));
    records.push(record);
    idCounts.set(record.id, (idCounts.get(record.id) || 0) + 1);
  }

  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);
  duplicateIds.forEach(([id, count]) => warnings.push(`Duplicate ID "${id}" appears ${count} times.`));

  if (!records.length) errors.push("No valid FASTQ records were found.");
  const lengths = records.map((record) => record.rawSequenceLength);

  return {
    format: "FASTQ",
    records,
    warnings,
    errors,
    stats: {
      totalRecords: records.length,
      emptyRecords: records.filter((record) => record.rawSequenceLength === 0).length,
      duplicateIds: duplicateIds.length,
      minLength: lengths.length ? Math.min(...lengths) : 0,
      maxLength: lengths.length ? Math.max(...lengths) : 0,
      meanLength: lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0
    }
  };
}

function meanPhred33(quality) {
  if (!quality.length) return 0;
  let total = 0;
  for (const char of quality) total += Math.max(0, char.charCodeAt(0) - 33);
  return total / quality.length;
}

function trimTrailingBlankLines(lines) {
  const copy = [...lines];
  while (copy.length && copy[copy.length - 1].trim() === "") copy.pop();
  return copy;
}
