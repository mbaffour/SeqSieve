import { parseFasta } from "./fastaParser.js";
import { parseFastq } from "./fastqParser.js";
import { dedupeRecords } from "./dedupeEngine.js";
import { detectSequenceType } from "./sequenceUtils.js";

self.onmessage = (event) => {
  const { text, options } = event.data;
  try {
    progress("Reading", 8);
    const format = resolveFormat(text, options.format);
    progress("Parsing", 22);
    const parsed = format === "FASTQ" ? parseFastq(text) : parseFasta(text);
    if (parsed.errors.length) {
      self.postMessage({ type: "error", error: parsed.errors.join(" ") });
      return;
    }

    progress("Normalizing", 44);
    const detectedType = options.sequenceType === "Auto" ? detectSequenceType(parsed.records) : options.sequenceType;
    progress("Deduplicating", 68);
    const result = dedupeRecords(parsed.records, {
      ...options,
      format,
      sequenceType: detectedType
    });

    progress("Generating report", 88);
    result.warnings = [
      ...parsed.warnings,
      ...parsed.records.flatMap((record) => record.warnings?.map((warning) => `Record ${record.index + 1} (${record.id}): ${warning}`) || []),
      ...result.warnings
    ];
    result.summary.format = format;
    result.summary.sequenceType = detectedType;
    progress("Complete", 100);
    self.postMessage({ type: "complete", parsedStats: parsed.stats, result });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message || String(error) });
  }
};

function progress(stage, percent) {
  self.postMessage({ type: "progress", stage, percent });
}

function resolveFormat(text, selected) {
  if (selected === "FASTA" || selected === "FASTQ") return selected;
  const trimmed = String(text ?? "").trimStart();
  if (trimmed.startsWith("@")) return "FASTQ";
  return "FASTA";
}
