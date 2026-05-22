import { parseHeader } from "./sequenceUtils.js";

export function parseFasta(text) {
  const warnings = [];
  const errors = [];
  const records = [];
  const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const idCounts = new Map();
  let current = null;
  let sawHeader = false;

  const finishRecord = (endLine) => {
    if (!current) return;
    current.endLine = endLine;
    current.sequence = current.sequenceLines.join("");
    current.rawSequenceLength = current.sequence.length;
    delete current.sequenceLines;
    if (!current.sequence.length) {
      current.warnings.push("Empty sequence");
      warnings.push(`Line ${current.startLine}: record "${current.id}" has an empty sequence.`);
    }
    records.push(current);
    idCounts.set(current.id, (idCounts.get(current.id) || 0) + 1);
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith(">")) {
      finishRecord(lineNumber - 1);
      sawHeader = true;
      const parsed = parseHeader(trimmed, ">");
      const fallbackId = parsed.id || `record_${records.length + 1}`;
      current = {
        index: records.length,
        id: fallbackId,
        header: parsed.header || fallbackId,
        description: parsed.description,
        sequence: "",
        rawSequenceLength: 0,
        startLine: lineNumber,
        endLine: lineNumber,
        warnings: [],
        sequenceLines: []
      };
      if (!parsed.id) {
        current.warnings.push("Header has no parsed ID");
        warnings.push(`Line ${lineNumber}: FASTA header has no parsed ID; assigned ${fallbackId}.`);
      }
      return;
    }

    if (!sawHeader || !current) {
      warnings.push(`Line ${lineNumber}: ignored text before first FASTA header.`);
      return;
    }

    if (/^[;#]/.test(trimmed)) {
      warnings.push(`Line ${lineNumber}: comment-like line was ignored inside record "${current.id}".`);
      return;
    }

    current.sequenceLines.push(trimmed);
  });

  finishRecord(lines.length);

  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);
  duplicateIds.forEach(([id, count]) => {
    warnings.push(`Duplicate ID "${id}" appears ${count} times.`);
  });

  const lengths = records.map((record) => record.rawSequenceLength);
  if (!records.length) errors.push("No valid FASTA records were found.");

  return {
    format: "FASTA",
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
