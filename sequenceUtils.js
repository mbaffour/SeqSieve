export const APP_VERSION = "0.1.0";

const DNA_CODES = new Set("ACGTRYSWKMBDHVN-.".split(""));
const RNA_CODES = new Set("ACGURYSWKMBDHVN-.".split(""));
const PROTEIN_CODES = new Set("ABCDEFGHIKLMNPQRSTVWXYZJUO*-.".split(""));

const DNA_COMPLEMENT = {
  A: "T", T: "A", C: "G", G: "C", R: "Y", Y: "R", S: "S", W: "W",
  K: "M", M: "K", B: "V", V: "B", D: "H", H: "D", N: "N",
  "-": "-", ".": "."
};

const RNA_COMPLEMENT = {
  A: "U", U: "A", C: "G", G: "C", R: "Y", Y: "R", S: "S", W: "W",
  K: "M", M: "K", B: "V", V: "B", D: "H", H: "D", N: "N",
  "-": "-", ".": "."
};

export function normalizeSequence(sequence, options = {}) {
  const {
    caseSensitive = false,
    removeWhitespace = true,
    removeGaps = false
  } = options;

  let normalized = String(sequence ?? "");
  if (removeWhitespace) normalized = normalized.replace(/\s+/g, "");
  if (removeGaps) normalized = normalized.replace(/[-.]/g, "");
  if (!caseSensitive) normalized = normalized.toUpperCase();
  return normalized;
}

export function detectSequenceType(records = []) {
  const sequences = records.map((record) => record.sequence || "").join("").replace(/\s+/g, "").toUpperCase();
  if (!sequences) return "Mixed/Unknown";

  let dna = 0;
  let rna = 0;
  let protein = 0;
  let informative = 0;

  for (const char of sequences) {
    if (!char.trim()) continue;
    informative += 1;
    if (DNA_CODES.has(char)) dna += 1;
    if (RNA_CODES.has(char)) rna += 1;
    if (PROTEIN_CODES.has(char)) protein += 1;
  }

  if (!informative) return "Mixed/Unknown";
  const dnaRatio = dna / informative;
  const rnaRatio = rna / informative;
  const proteinRatio = protein / informative;
  const hasT = sequences.includes("T");
  const hasU = sequences.includes("U");

  if (hasT && hasU) return proteinRatio > 0.95 ? "Protein" : "Mixed/Unknown";
  if (rnaRatio >= 0.9 && hasU && !hasT) return "RNA";
  if (dnaRatio >= 0.9 && !hasU) return "DNA";
  if (proteinRatio >= 0.85) return "Protein";
  return "Mixed/Unknown";
}

export function validateAlphabet(sequence, type = "Mixed/Unknown") {
  const warnings = [];
  const normalizedType = normalizeType(type);
  if (!normalizedType) return warnings;
  const alphabet = normalizedType === "DNA" ? DNA_CODES : normalizedType === "RNA" ? RNA_CODES : PROTEIN_CODES;
  const unexpected = new Map();

  for (const rawChar of String(sequence ?? "")) {
    if (/\s/.test(rawChar)) continue;
    const char = rawChar.toUpperCase();
    if (!alphabet.has(char)) unexpected.set(rawChar, (unexpected.get(rawChar) || 0) + 1);
  }

  if (unexpected.size) {
    const rendered = [...unexpected.entries()].map(([char, count]) => `${JSON.stringify(char)} x${count}`).join(", ");
    warnings.push(`Unexpected character(s) for ${normalizedType}: ${rendered}`);
  }
  return warnings;
}

export function reverseComplement(sequence, type = "DNA") {
  const normalizedType = normalizeType(type);
  if (normalizedType !== "DNA" && normalizedType !== "RNA") return sequence;
  const complement = normalizedType === "RNA" ? RNA_COMPLEMENT : DNA_COMPLEMENT;
  const chars = String(sequence ?? "").split("");
  const output = [];

  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const char = chars[i];
    const upper = char.toUpperCase();
    const comp = complement[upper] || "N";
    output.push(char === upper ? comp : comp.toLowerCase());
  }

  return output.join("");
}

export function canonicalizeForReverseComplement(sequence, type = "DNA") {
  const rc = reverseComplement(sequence, type);
  if (rc < sequence) {
    return { canonicalSequence: rc, orientation: "reverse_complement" };
  }
  return { canonicalSequence: sequence, orientation: "forward" };
}

export function normalizeType(type) {
  if (type === "DNA" || type === "RNA" || type === "Protein") return type;
  return null;
}

export function hashString(value) {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function wrapSequence(sequence, width = 60) {
  const text = String(sequence ?? "");
  if (!width || width === "none") return text;
  const size = Number(width);
  if (!Number.isFinite(size) || size <= 0) return text;
  const lines = [];
  for (let i = 0; i < text.length; i += size) lines.push(text.slice(i, i + size));
  return lines.join("\n");
}

export function parseHeader(headerLine, marker) {
  const header = String(headerLine ?? "").replace(marker, "").trim();
  const firstSpace = header.search(/\s/);
  const id = firstSpace === -1 ? header : header.slice(0, firstSpace);
  const description = firstSpace === -1 ? "" : header.slice(firstSpace).trim();
  return {
    header,
    id,
    description
  };
}

export function bytesToHuman(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
