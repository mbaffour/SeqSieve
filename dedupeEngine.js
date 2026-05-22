import {
  canonicalizeForReverseComplement,
  hashString,
  normalizeSequence,
  normalizeType,
  validateAlphabet
} from "./sequenceUtils.js";

export function dedupeRecords(records = [], options = {}) {
  const start = performance.now();
  const warnings = [];
  const groupsByKey = new Map();
  const mode = options.mode || "sequence";
  const format = options.format || "FASTA";
  const sequenceType = options.sequenceType || "Mixed/Unknown";
  const rcAllowed = options.reverseComplement && (sequenceType === "DNA" || sequenceType === "RNA");

  if (options.reverseComplement && !rcAllowed) {
    warnings.push("Reverse-complement matching was requested but only applies to DNA/RNA records; it was not used.");
  }
  if (format !== "FASTQ" && options.representativeRule === "highest_mean_quality") {
    warnings.push("Highest mean quality representative selection applies only to FASTQ; first occurrence was used.");
  }

  records.forEach((record) => {
    const alphabetWarnings = normalizeType(sequenceType) ? validateAlphabet(record.sequence, sequenceType) : [];
    alphabetWarnings.forEach((warning) => warnings.push(`Record ${record.index + 1} (${record.id}): ${warning}`));

    const normalized = normalizeSequence(record.sequence, options);
    let comparisonSequence = normalized;
    let orientation = "forward";
    if (rcAllowed && (mode === "sequence" || mode === "record")) {
      const canonical = canonicalizeForReverseComplement(normalized, sequenceType);
      comparisonSequence = canonical.canonicalSequence;
      orientation = canonical.orientation;
    }

    const key = makeKey(record, comparisonSequence, mode);
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        keyHash: hashString(key),
        records: [],
        memberOrientations: new Map(),
        normalizedLength: comparisonSequence.length
      });
    }
    const group = groupsByKey.get(key);
    group.records.push(record);
    group.memberOrientations.set(record.index, orientation);
  });

  const groups = [...groupsByKey.values()].map((group, index) => {
    const representativeRecord = selectRepresentative(group.records, options, format);
    const rename = options.representativeRule === "rename";
    const representativeId = rename ? `${options.renamePrefix || "rep_"}${String(index + 1).padStart(6, "0")}` : representativeRecord.id;
    const representativeHeader = rename
      ? `${representativeId} count=${group.records.length} original_representative=${representativeRecord.id}`
      : representativeRecord.header;

    const members = group.records.map((record) => ({
      originalIndex: record.index,
      originalId: record.id,
      originalHeader: record.header,
      sequenceLength: record.sequence.length,
      matchOrientation: group.memberOrientations.get(record.index) || "forward",
      isRepresentative: record.index === representativeRecord.index,
      meanQuality: record.meanQuality ?? ""
    }));

    return {
      groupId: `group_${String(index + 1).padStart(6, "0")}`,
      key: group.key,
      keyHash: group.keyHash,
      representativeRecord,
      representativeId,
      representativeHeader,
      representativeSequence: representativeRecord.sequence,
      representativeQuality: representativeRecord.quality || "",
      count: group.records.length,
      normalizedLength: group.normalizedLength,
      members
    };
  });

  const mappingRows = groups.flatMap((group) => group.members.map((member) => ({
    original_index: member.originalIndex + 1,
    original_id: member.originalId,
    original_header: member.originalHeader,
    representative_id: group.representativeId,
    representative_header: group.representativeHeader,
    group_id: group.groupId,
    sequence_length: member.sequenceLength,
    match_orientation: member.matchOrientation,
    is_representative: member.isRepresentative ? "yes" : "no",
    dedupe_key_hash: group.keyHash,
    count_for_representative: group.count,
    mean_quality: member.meanQuality
  })));

  const duplicateRows = groups.map((group) => ({
    group_id: group.groupId,
    representative_id: group.representativeId,
    count: group.count,
    member_ids: group.members.map((member) => member.originalId).join(";"),
    member_headers: group.members.map((member) => member.originalHeader).join(" || "),
    normalized_length: group.normalizedLength
  }));

  const countRows = groups.map((group) => ({
    representative_id: group.representativeId,
    count: group.count,
    representative_length: group.representativeSequence.length,
    representative_header: group.representativeHeader
  }));

  const runtimeMs = performance.now() - start;
  const duplicateRecordsCollapsed = records.length - groups.length;

  return {
    groups,
    representatives: groups.map((group) => group.representativeRecord),
    mappingRows,
    duplicateRows,
    countRows,
    warnings,
    summary: {
      inputRecords: records.length,
      uniqueRecords: groups.length,
      duplicateRecordsCollapsed,
      percentRedundancy: records.length ? (duplicateRecordsCollapsed / records.length) * 100 : 0,
      largestGroupSize: groups.length ? Math.max(...groups.map((group) => group.count)) : 0,
      dedupeMode: mode,
      representativeRule: options.representativeRule,
      reverseComplementUsed: Boolean(rcAllowed),
      sequenceType,
      format,
      runtimeMs
    }
  };
}

function makeKey(record, comparisonSequence, mode) {
  if (mode === "id") return `id:${record.id}`;
  if (mode === "record") return `record:${record.id}\u001f${comparisonSequence}`;
  return `sequence:${comparisonSequence}`;
}

function selectRepresentative(records, options, format) {
  const rule = options.representativeRule || "first";
  if (rule === "longest_sequence") {
    return [...records].sort((a, b) => b.sequence.length - a.sequence.length || a.index - b.index)[0];
  }
  if (rule === "longest_header") {
    return [...records].sort((a, b) => b.header.length - a.header.length || a.index - b.index)[0];
  }
  if (rule === "highest_mean_quality" && format === "FASTQ") {
    return [...records].sort((a, b) => (b.meanQuality || 0) - (a.meanQuality || 0) || a.index - b.index)[0];
  }
  return records[0];
}
