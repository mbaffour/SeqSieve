import { parseFasta } from "./fastaParser.js";
import { parseFastq } from "./fastqParser.js";
import { dedupeRecords } from "./dedupeEngine.js";
import { APP_VERSION, bytesToHuman, detectSequenceType } from "./sequenceUtils.js";
import {
  downloadTextFile,
  exportCountsTsv,
  exportDeduplicatedFasta,
  exportDeduplicatedFastq,
  exportDuplicateGroupsTsv,
  exportMappingTsv,
  exportReproducibilityJson,
  exportSummaryReport,
  sanitizeFilename,
  timestampedFilename
} from "./exporters.js";
import { generateMethodsParagraph } from "./reportGenerator.js";
import { demoFasta, runValidationTests } from "./validationTests.js";

const state = {
  file: null,
  inputText: "",
  inputMeta: {},
  settings: null,
  result: null,
  methodsParagraph: "",
  summaryReport: "",
  activeTab: "deduped",
  worker: null,
  runtimeTimer: null,
  startedAt: 0,
  sort: {}
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  fileInput: $("#fileInput"),
  dropzone: $("#dropzone"),
  pasteInput: $("#pasteInput"),
  fileMeta: $("#fileMeta"),
  formatPill: $("#formatPill"),
  themeToggle: $("#themeToggle"),
  demoButton: $("#demoButton"),
  uploadShortcut: $("#uploadShortcut"),
  analyzeButton: $("#analyzeButton"),
  dedupeButton: $("#dedupeButton"),
  cancelButton: $("#cancelButton"),
  resetButton: $("#resetButton"),
  runTestsButton: $("#runTestsButton"),
  runTestsHero: $("#runTestsHero"),
  testResults: $("#testResults"),
  workerStatus: $("#workerStatus"),
  stageLabel: $("#stageLabel"),
  runtimeLabel: $("#runtimeLabel"),
  progressFill: $("#progressFill"),
  progressBar: $(".progress-bar"),
  statsGrid: $("#statsGrid"),
  previewContent: $("#previewContent"),
  previewFilter: $("#previewFilter"),
  uniqueDuplicateViz: $("#uniqueDuplicateViz"),
  topGroupsViz: $("#topGroupsViz"),
  distributionViz: $("#distributionViz")
};

init();

function init() {
  renderEmptyState();
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.demoButton.addEventListener("click", loadDemo);
  elements.uploadShortcut.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.pasteInput.addEventListener("input", handlePasteInput);
  elements.analyzeButton.addEventListener("click", () => runAnalysis("analyze"));
  elements.dedupeButton.addEventListener("click", () => runAnalysis("dedupe"));
  elements.cancelButton.addEventListener("click", cancelRun);
  elements.resetButton.addEventListener("click", resetApp);
  elements.runTestsButton.addEventListener("click", renderValidationTests);
  elements.runTestsHero.addEventListener("click", renderValidationTests);
  elements.previewFilter.addEventListener("input", renderPreview);
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));
  $$(".export-buttons button").forEach((button) => {
    if (button.dataset.export) button.addEventListener("click", () => handleExport(button.dataset.export));
    if (button.dataset.copy) button.addEventListener("click", () => handleCopy(button.dataset.copy));
  });
  setupDragDrop();
}

function toggleTheme() {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
}

function setupDragDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove("dragover");
    });
  });
  elements.dropzone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (file) setFile(file);
  });
}

function handleFileSelection(event) {
  const [file] = event.target.files;
  if (file) setFile(file);
}

function setFile(file) {
  state.file = file;
  state.inputText = "";
  elements.pasteInput.value = "";
  const estimatedFormat = estimateFormatFromName(file.name);
  state.inputMeta = {
    name: file.name,
    size: file.size,
    sizeLabel: bytesToHuman(file.size),
    estimatedFormat
  };
  elements.formatPill.textContent = estimatedFormat;
  renderFileMeta();
}

function handlePasteInput() {
  state.file = null;
  state.inputText = elements.pasteInput.value;
  state.inputMeta = {
    name: "pasted_sequences",
    size: new Blob([state.inputText]).size,
    sizeLabel: bytesToHuman(new Blob([state.inputText]).size),
    estimatedFormat: estimateFormatFromText(state.inputText)
  };
  elements.formatPill.textContent = state.inputMeta.estimatedFormat || "Pasted";
  renderFileMeta();
}

function renderFileMeta(extraWarnings = []) {
  const meta = state.inputMeta || {};
  const warnings = [];
  if ((meta.size || 0) > 250 * 1024 * 1024) warnings.push("Strong warning: compressed or plain input may exceed browser memory on some machines.");
  else if ((meta.size || 0) > 50 * 1024 * 1024) warnings.push("Large file warning: browser memory limits vary by machine.");
  if ((meta.name || "").endsWith(".gz")) warnings.push("Gzip input is decompressed locally and may expand substantially in memory.");
  warnings.push(...extraWarnings);
  elements.fileMeta.innerHTML = [
    `<span>File name: ${escapeHtml(meta.name || "none")}</span>`,
    `<span>Size: ${escapeHtml(meta.sizeLabel || "0 B")}</span>`,
    `<span>Estimated format: ${escapeHtml(meta.estimatedFormat || "waiting")}</span>`,
    ...warnings.map((warning) => `<span class="warning-text">${escapeHtml(warning)}</span>`)
  ].join("");
}

function loadDemo() {
  elements.pasteInput.value = demoFasta;
  handlePasteInput();
  elements.pasteInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function runAnalysis(intent) {
  try {
    setBusy(true);
    state.startedAt = performance.now();
    state.runtimeTimer = window.setInterval(updateRuntime, 80);
    setProgress("Reading", 5);
    const { text, warnings } = await getInputText();
    if (!text.trim()) throw new Error("Provide a FASTA or FASTQ file, or paste sequence text before running SeqSieve.");
    state.inputText = text;
    if (warnings.length) renderFileMeta(warnings);
    const options = collectOptions();
    await runWithWorkerOrFallback(text, options, warnings);
    elements.stageLabel.textContent = intent === "analyze" ? "Analysis complete" : "Deduplication complete";
  } catch (error) {
    showError(error.message || String(error));
  } finally {
    setBusy(false);
  }
}

async function getInputText() {
  const warnings = [];
  if (state.file) {
    if (state.file.name.toLowerCase().endsWith(".gz")) {
      if (!("DecompressionStream" in window)) {
        throw new Error("This browser does not support native gzip decompression. Use an uncompressed FASTA/FASTQ file.");
      }
      warnings.push("Gzip file decompressed locally in browser memory.");
      const stream = state.file.stream().pipeThrough(new DecompressionStream("gzip"));
      return { text: await new Response(stream).text(), warnings };
    }
    return { text: await state.file.text(), warnings };
  }
  return { text: elements.pasteInput.value, warnings };
}

function collectOptions() {
  return {
    format: $("#format").value,
    mode: $("#mode").value,
    caseSensitive: $("#caseSensitive").checked,
    removeWhitespace: $("#removeWhitespace").checked,
    removeGaps: $("#removeGaps").checked,
    sequenceType: $("#sequenceType").value,
    reverseComplement: $("#reverseComplement").checked,
    representativeRule: $("#representativeRule").value,
    renamePrefix: $("#renamePrefix").value || "rep_",
    preserveOriginalHeader: true,
    fastaLineWrap: $("#fastaLineWrap").value
  };
}

function runWithWorkerOrFallback(text, options, inputWarnings = []) {
  return new Promise((resolve, reject) => {
    if (!window.Worker) {
      try {
        completeAnalysis(runDirect(text, options, inputWarnings), options);
        resolve();
      } catch (error) {
        reject(error);
      }
      return;
    }

    const worker = new Worker("./worker.js", { type: "module" });
    state.worker = worker;
    elements.workerStatus.textContent = "Worker running";
    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "progress") setProgress(message.stage, message.percent);
      if (message.type === "error") {
        worker.terminate();
        state.worker = null;
        reject(new Error(message.error));
      }
      if (message.type === "complete") {
        worker.terminate();
        state.worker = null;
        message.result.warnings = [...inputWarnings, ...message.result.warnings];
        completeAnalysis(message.result, options);
        resolve();
      }
    };
    worker.onerror = () => {
      worker.terminate();
      state.worker = null;
      try {
        completeAnalysis(runDirect(text, options, inputWarnings), options);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    worker.postMessage({ text, options });
  });
}

function runDirect(text, options, inputWarnings = []) {
  setProgress("Parsing", 22);
  const format = resolveFormat(text, options.format);
  const parsed = format === "FASTQ" ? parseFastq(text) : parseFasta(text);
  if (parsed.errors.length) throw new Error(parsed.errors.join(" "));
  setProgress("Normalizing", 44);
  const detectedType = options.sequenceType === "Auto" ? detectSequenceType(parsed.records) : options.sequenceType;
  setProgress("Deduplicating", 68);
  const result = dedupeRecords(parsed.records, { ...options, format, sequenceType: detectedType });
  result.warnings = [
    ...inputWarnings,
    ...parsed.warnings,
    ...parsed.records.flatMap((record) => record.warnings?.map((warning) => `Record ${record.index + 1} (${record.id}): ${warning}`) || []),
    ...result.warnings
  ];
  result.summary.format = format;
  result.summary.sequenceType = detectedType;
  setProgress("Generating report", 88);
  return result;
}

function completeAnalysis(result, options) {
  setProgress("Complete", 100);
  state.result = result;
  state.settings = { ...options };
  state.methodsParagraph = generateMethodsParagraph(options, result.summary);
  state.summaryReport = exportSummaryReport({
    settings: options,
    summary: result.summary,
    warnings: result.warnings,
    inputMeta: state.inputMeta,
    methodsParagraph: state.methodsParagraph
  });
  renderResults();
}

function renderResults() {
  renderStats();
  renderVisualizations();
  renderPreview();
}

function renderStats() {
  const summary = state.result?.summary;
  if (!summary) {
    elements.statsGrid.innerHTML = "";
    return;
  }
  const stats = [
    ["Input records", summary.inputRecords],
    ["Unique representatives", summary.uniqueRecords],
    ["Duplicates collapsed", summary.duplicateRecordsCollapsed],
    ["Percent redundancy", `${summary.percentRedundancy.toFixed(1)}%`],
    ["Largest group", summary.largestGroupSize],
    ["Sequence type", summary.sequenceType],
    ["Format", summary.format],
    ["Warnings", state.result.warnings.length],
    ["Runtime", `${summary.runtimeMs.toFixed(1)} ms`]
  ];
  elements.statsGrid.innerHTML = stats.map(([label, value]) => `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderVisualizations() {
  const result = state.result;
  if (!result) {
    elements.uniqueDuplicateViz.innerHTML = empty("Run SeqSieve to see redundancy.");
    elements.topGroupsViz.innerHTML = empty("No groups yet.");
    elements.distributionViz.innerHTML = empty("No distribution yet.");
    return;
  }
  const unique = result.summary.uniqueRecords;
  const duplicates = result.summary.duplicateRecordsCollapsed;
  const total = Math.max(result.summary.inputRecords, 1);
  elements.uniqueDuplicateViz.innerHTML = [
    vizRow("Unique", unique, (unique / total) * 100, "var(--accent)"),
    vizRow("Collapsed", duplicates, (duplicates / total) * 100, "var(--amber)")
  ].join("");

  const top = [...result.groups].sort((a, b) => b.count - a.count || a.groupId.localeCompare(b.groupId)).slice(0, 10);
  const max = Math.max(...top.map((group) => group.count), 1);
  elements.topGroupsViz.innerHTML = top.map((group) => rankLine(group.representativeId, group.count, (group.count / max) * 100)).join("") || empty("No duplicate groups.");

  const buckets = new Map();
  result.groups.forEach((group) => buckets.set(group.count, (buckets.get(group.count) || 0) + 1));
  const rows = [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  const maxBucket = Math.max(...rows.map(([, count]) => count), 1);
  elements.distributionViz.innerHTML = rows.map(([size, count]) => rankLine(`${size} member${size === 1 ? "" : "s"}`, count, (count / maxBucket) * 100)).join("");
}

function renderPreview() {
  const result = state.result;
  if (!result) {
    elements.previewContent.innerHTML = `<div class="empty-state">Run analysis to preview deduplicated sequences, tables, warnings, methods text, and JSON metadata.</div>`;
    return;
  }
  const filter = elements.previewFilter.value.trim().toLowerCase();
  const tab = state.activeTab;
  if (tab === "deduped") {
    const content = result.summary.format === "FASTQ"
      ? exportDeduplicatedFastq(result, state.settings)
      : exportDeduplicatedFasta(result, state.settings);
    elements.previewContent.innerHTML = `<pre class="code-block">${escapeHtml(limitLines(content, 120))}</pre>`;
  } else if (tab === "mapping") renderTable(result.mappingRows, filter);
  else if (tab === "groups") renderTable(result.duplicateRows, filter);
  else if (tab === "counts") renderTable(result.countRows, filter);
  else if (tab === "warnings") renderWarnings(result.warnings, filter);
  else if (tab === "methods") elements.previewContent.innerHTML = `<pre class="code-block">${escapeHtml(state.methodsParagraph)}</pre>`;
  else if (tab === "json") {
    const json = exportReproducibilityJson({
      settings: state.settings,
      summary: result.summary,
      warnings: result.warnings,
      inputMeta: state.inputMeta,
      groups: result.groups
    }, false);
    elements.previewContent.innerHTML = `<pre class="code-block">${escapeHtml(json)}</pre>`;
  }
}

function renderTable(rows, filter) {
  let visible = rows || [];
  if (filter) visible = visible.filter((row) => Object.values(row).join(" ").toLowerCase().includes(filter));
  const columns = Object.keys(visible[0] || rows[0] || {});
  if (!columns.length) {
    elements.previewContent.innerHTML = `<div class="empty-state">No rows to preview.</div>`;
    return;
  }
  const sortKey = state.sort[state.activeTab];
  if (sortKey) {
    visible = [...visible].sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }));
  }
  const limited = visible.slice(0, 100);
  elements.previewContent.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((column) => `<th data-sort="${escapeHtml(column)}">${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${limited.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="empty-state">Showing ${limited.length} of ${visible.length} matching rows. Exports include all rows.</div>
  `;
  elements.previewContent.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      state.sort[state.activeTab] = th.dataset.sort;
      renderPreview();
    });
  });
}

function renderWarnings(warnings, filter) {
  const visible = (warnings || []).filter((warning) => !filter || warning.toLowerCase().includes(filter));
  elements.previewContent.innerHTML = visible.length
    ? `<ul class="warning-list">${visible.slice(0, 100).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
    : `<div class="empty-state">No warnings match the current filter.</div>`;
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  $$(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  renderPreview();
}

function handleExport(type) {
  if (!state.result) {
    showError("Run analysis before exporting.");
    return;
  }
  const base = sanitizeFilename(state.inputMeta.name || "seqsieve");
  const settings = state.settings || collectOptions();
  const payload = {
    settings,
    summary: state.result.summary,
    warnings: state.result.warnings,
    inputMeta: state.inputMeta,
    groups: state.result.groups,
    methodsParagraph: state.methodsParagraph
  };

  if (type === "fasta") downloadTextFile(timestampedFilename(base, "deduplicated.fasta"), exportDeduplicatedFasta(state.result, settings), "text/x-fasta");
  if (type === "fastq") {
    if (state.result.summary.format !== "FASTQ") {
      showError("FASTQ export is available only for FASTQ inputs.");
      return;
    }
    downloadTextFile(timestampedFilename(base, "deduplicated.fastq"), exportDeduplicatedFastq(state.result, settings), "text/plain");
  }
  if (type === "mapping") downloadTextFile(timestampedFilename(base, "mapping.tsv"), exportMappingTsv(state.result), "text/tab-separated-values");
  if (type === "groups") downloadTextFile(timestampedFilename(base, "duplicate_groups.tsv"), exportDuplicateGroupsTsv(state.result), "text/tab-separated-values");
  if (type === "counts") downloadTextFile(timestampedFilename(base, "counts.tsv"), exportCountsTsv(state.result), "text/tab-separated-values");
  if (type === "summary") downloadTextFile(timestampedFilename(base, "summary.txt"), state.summaryReport, "text/plain");
  if (type === "json") downloadTextFile(timestampedFilename(base, "reproducibility.json"), exportReproducibilityJson(payload, true), "application/json");
}

async function handleCopy(type) {
  if (!state.result) {
    showError("Run analysis before copying report text.");
    return;
  }
  const text = type === "methods" ? state.methodsParagraph : state.summaryReport;
  const label = type === "methods" ? "Methods" : "Summary";
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    setProgress(`${label} copied`, 100);
  } catch (error) {
    // Clipboard access can be blocked (insecure context, denied permission, or
    // older browsers); fall back to downloading the text so it is never lost.
    const base = sanitizeFilename(state.inputMeta.name || "seqsieve");
    const suffix = type === "methods" ? "methods.txt" : "summary.txt";
    downloadTextFile(timestampedFilename(base, suffix), text, "text/plain");
    setProgress(`${label} downloaded (clipboard unavailable)`, 100);
  }
}

function renderValidationTests() {
  const results = runValidationTests();
  const passCount = results.filter((result) => result.pass).length;
  elements.testResults.innerHTML = `
    <p>${passCount} of ${results.length} validation tests passed.</p>
    <table>
      <thead><tr><th>Test</th><th>Status</th><th>Expected</th><th>Observed</th></tr></thead>
      <tbody>
        ${results.map((result) => `
          <tr>
            <td>${escapeHtml(result.name)}</td>
            <td class="${result.pass ? "pass" : "fail"}">${result.pass ? "PASS" : "FAIL"}</td>
            <td>${escapeHtml(result.expected)}</td>
            <td>${escapeHtml(result.observed)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  $("#tests").scrollIntoView({ behavior: "smooth" });
}

function cancelRun() {
  if (state.worker) {
    state.worker.terminate();
    state.worker = null;
  }
  setBusy(false);
  setProgress("Canceled", 0);
}

function resetApp() {
  cancelRun();
  state.file = null;
  state.inputText = "";
  state.inputMeta = {};
  state.settings = null;
  state.result = null;
  state.methodsParagraph = "";
  state.summaryReport = "";
  elements.fileInput.value = "";
  elements.pasteInput.value = "";
  elements.previewFilter.value = "";
  elements.formatPill.textContent = "No file";
  renderFileMeta();
  renderEmptyState();
  setProgress("Waiting", 0);
}

function renderEmptyState() {
  elements.statsGrid.innerHTML = [
    ["Input records", "0"],
    ["Unique representatives", "0"],
    ["Duplicates collapsed", "0"],
    ["Warnings", "0"]
  ].map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
  renderVisualizations();
  renderPreview();
}

function setBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.dedupeButton.disabled = isBusy;
  elements.cancelButton.disabled = !isBusy;
  elements.workerStatus.textContent = isBusy ? "Running" : "Worker ready";
  if (!isBusy && state.runtimeTimer) {
    clearInterval(state.runtimeTimer);
    state.runtimeTimer = null;
    updateRuntime();
  }
}

function updateRuntime() {
  if (!state.startedAt) return;
  elements.runtimeLabel.textContent = `${(performance.now() - state.startedAt).toFixed(0)} ms`;
}

function setProgress(stage, percent) {
  elements.stageLabel.textContent = stage;
  elements.progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  elements.progressBar.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function showError(message) {
  setProgress("Error", 0);
  elements.previewContent.innerHTML = `<div class="empty-state"><strong>Error:</strong> ${escapeHtml(message)}</div>`;
}

function estimateFormatFromName(name = "") {
  const lower = name.toLowerCase();
  if (/\.(fastq|fq)(\.gz)?$/.test(lower)) return "FASTQ";
  if (/\.(fa|fasta|faa|fna|ffn|fas|txt)(\.gz)?$/.test(lower)) return "FASTA";
  return "Unknown";
}

function estimateFormatFromText(text = "") {
  const trimmed = text.trimStart();
  if (!trimmed) return "waiting";
  if (trimmed.startsWith("@")) return "FASTQ";
  if (trimmed.startsWith(">")) return "FASTA";
  return "Unknown";
}

function resolveFormat(text, selected) {
  if (selected === "FASTA" || selected === "FASTQ") return selected;
  return estimateFormatFromText(text) === "FASTQ" ? "FASTQ" : "FASTA";
}

function vizRow(label, value, percent, color) {
  return `
    <div class="viz-row">
      <span>${escapeHtml(label)}</span>
      <span class="viz-track"><span class="viz-fill" style="width:${percent}%;background:${color}"></span></span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function rankLine(label, value, percent) {
  return `
    <div class="rank-line">
      <span>${escapeHtml(label)}</span>
      <span class="viz-track"><span class="viz-fill" style="width:${percent}%"></span></span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function empty(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function limitLines(text, maxLines) {
  const lines = String(text).split("\n");
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join("\n")}\n... preview truncated; exports include full output.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.SeqSieve = { version: APP_VERSION, runValidationTests };
