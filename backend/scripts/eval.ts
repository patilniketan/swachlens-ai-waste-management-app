// ============================================================
// EVALUATION HARNESS
// ============================================================
// Runs the REAL duplicate judge and the REAL analysis + priority scorer over
// hand-labelled CSVs and reports honest metrics:
//   duplicates: precision / recall / F1 ("yes" = duplicate; "unsure" = not)
//   priority:   confusion matrix + accuracy
// plus mean latency per AI call. Writes eval/results.json.
//
//   npm run eval                       # labelled rows only
//   npm run eval -- --include-examples # also the [EXAMPLE] format rows
//   npm run eval -- --only duplicates  # or: --only priority
//
// Rows starting with "[EXAMPLE]" are format illustrations, not real labels,
// and are skipped by default. Failed AI calls are reported and excluded from
// the metrics, never counted as predictions. See eval/README.md.
// ============================================================

import "dotenv/config";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

// Evaluate the live model, never the demo cache. Must precede the imports.
process.env.AI_MODE = "live";

const { analyzeComplaint, judgeDuplicates, isGeminiConfigured, GEMINI_MODEL } =
  await import("../src/services/ai.service.js");
const { scorePriority } = await import("../src/services/priority.service.js");
const {
  EVAL_DIR,
  EVAL_RESULTS_PATH,
  MIN_MEANINGFUL_ROWS,
  PRIORITY_LABELS,
  binaryMetrics,
  confusionMatrix,
  mean,
} = await import("../src/eval/results.js");
type EvalResults = import("../src/eval/results.js").EvalResults;
type PriorityLabel = import("../src/eval/results.js").PriorityLabel;

const EXAMPLE_PREFIX = "[EXAMPLE]";

const args = process.argv.slice(2);
const includeExamples = args.includes("--include-examples");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;

// ---------------- CSV ----------------

// RFC 4180: quoted fields, "" escapes, commas/newlines inside quotes.
function parseCsv(text: string): { line: number; cells: string[] }[] {
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const endCell = () => {
    cells.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (cells.some((value) => value.trim() !== "")) rows.push({ line: rowLine, cells });
    cells = [];
    rowLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === "\n") line++;
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      endCell();
    } else if (char === "\n") {
      line++;
      endRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell !== "" || cells.length) endRow();

  return rows;
}

function readCsv(file: string, columns: string[]) {
  const fullPath = path.join(EVAL_DIR, file);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`${file} not found in ${EVAL_DIR}`);
  }

  const [header, ...rows] = parseCsv(fs.readFileSync(fullPath, "utf8"));
  const names = header?.cells.map((name) => name.trim()) ?? [];

  if (columns.some((column, index) => names[index] !== column)) {
    throw new Error(`${file}: header must be "${columns.join(",")}" (found "${names.join(",")}")`);
  }

  return rows.map(({ line, cells }) => ({
    line,
    values: Object.fromEntries(columns.map((column, index) => [column, (cells[index] ?? "").trim()])),
  }));
}

const isExample = (text: string) => text.startsWith(EXAMPLE_PREFIX);

const shorten = (text: string, max = 140) =>
  text.length > max ? `${text.slice(0, max)}…` : text;
const stripExample = (text: string) =>
  isExample(text) ? text.slice(EXAMPLE_PREFIX.length).trim() : text;

const parseBoolean = (value: string) => {
  const normalized = value.toLowerCase();
  if (["true", "yes", "1", "y"].includes(normalized)) return true;
  if (["false", "no", "0", "n"].includes(normalized)) return false;
  return null;
};

// ---------------- runs ----------------

const timed = async <T>(work: () => Promise<T>) => {
  const start = performance.now();
  const result = await work();
  return { result, ms: performance.now() - start };
};

async function evaluateDuplicates() {
  const rows = readCsv("duplicates.csv", ["textA", "textB", "distanceMeters", "isDuplicate"]);
  const problems: string[] = [];

  const parsed = rows.map(({ line, values }) => {
    const distance = Number(values.distanceMeters);
    const label = parseBoolean(values.isDuplicate ?? "");

    if (!values.textA || !values.textB) problems.push(`line ${line}: textA and textB are required`);
    if (!Number.isFinite(distance) || distance < 0) problems.push(`line ${line}: distanceMeters must be a number >= 0`);
    if (label === null) problems.push(`line ${line}: isDuplicate must be true or false`);

    return {
      line,
      example: isExample(values.textA ?? "") || isExample(values.textB ?? ""),
      textA: stripExample(values.textA ?? ""),
      textB: stripExample(values.textB ?? ""),
      distance,
      actual: label === true,
    };
  });

  if (problems.length) throw new Error(`duplicates.csv:\n  ${problems.join("\n  ")}`);

  const selected = parsed.filter((row) => includeExamples || !row.example);
  const pairs: { actual: boolean; predicted: boolean }[] = [];
  const latencies: number[] = [];
  const errors: string[] = [];
  let unsure = 0;

  for (const row of selected) {
    const { result, ms } = await timed(() =>
      judgeDuplicates(row.textB, [{ id: "A", description: row.textA, distanceMeters: row.distance }]),
    );

    const judgment = result.judgments?.find((item) => item.candidateId === "A");

    if (result.source === "fallback" || !judgment) {
      errors.push(`line ${row.line}: ${shorten(result.error ?? "no judgment returned")}`);
      process.stdout.write("x");
      continue;
    }

    latencies.push(ms);
    if (judgment.sameIssue === "unsure") unsure++;
    pairs.push({ actual: row.actual, predicted: judgment.sameIssue === "yes" });
    process.stdout.write(".");
  }

  process.stdout.write("\n");

  const metrics = binaryMetrics(pairs);

  return {
    errors,
    result: {
      csvRows: parsed.length,
      skippedExamples: parsed.length - selected.length,
      evaluated: pairs.length,
      failed: errors.length,
      unsure,
      truePositives: metrics.tp,
      falsePositives: metrics.fp,
      falseNegatives: metrics.fn,
      trueNegatives: metrics.tn,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      meanLatencyMs: mean(latencies),
    },
  };
}

async function evaluatePriority() {
  const rows = readCsv("priority.csv", ["description", "humanPriority"]);
  const problems: string[] = [];

  const parsed = rows.map(({ line, values }) => {
    const label = (values.humanPriority ?? "").toUpperCase() as PriorityLabel;

    if (!values.description) problems.push(`line ${line}: description is required`);
    if (!PRIORITY_LABELS.includes(label)) {
      problems.push(`line ${line}: humanPriority must be CRITICAL, STANDARD or TRIVIAL`);
    }

    return {
      line,
      example: isExample(values.description ?? ""),
      description: stripExample(values.description ?? ""),
      actual: label,
    };
  });

  if (problems.length) throw new Error(`priority.csv:\n  ${problems.join("\n  ")}`);

  const selected = parsed.filter((row) => includeExamples || !row.example);
  const pairs: { actual: PriorityLabel; predicted: PriorityLabel }[] = [];
  const latencies: number[] = [];
  const errors: string[] = [];

  for (const row of selected) {
    // Text only: the CSV has no photos.
    const { result, ms } = await timed(() => analyzeComplaint({ description: row.description }));

    if (result.source !== "gemini") {
      errors.push(`line ${row.line}: ${shorten(result.error ?? `analysis source was ${result.source}`)}`);
      process.stdout.write("x");
      continue;
    }

    latencies.push(ms);
    pairs.push({ actual: row.actual, predicted: scorePriority(result.features, 1).priority });
    process.stdout.write(".");
  }

  process.stdout.write("\n");

  const { confusion, accuracy } = confusionMatrix(pairs);

  return {
    errors,
    result: {
      csvRows: parsed.length,
      skippedExamples: parsed.length - selected.length,
      evaluated: pairs.length,
      failed: errors.length,
      confusion,
      accuracy,
      meanLatencyMs: mean(latencies),
    },
  };
}

// ---------------- report ----------------

const pct = (value: number | null) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);
const ms = (value: number | null) => (value === null ? "n/a" : `${Math.round(value)} ms`);

function banner(lines: string[]) {
  const width = Math.max(...lines.map((line) => line.length)) + 4;
  console.log(`\n${"!".repeat(width)}`);
  lines.forEach((line) => console.log(`! ${line.padEnd(width - 4)} !`));
  console.log(`${"!".repeat(width)}\n`);
}

async function main(): Promise<number> {
  console.log(`Model: ${GEMINI_MODEL} (AI_MODE=live)${includeExamples ? " · including [EXAMPLE] rows" : ""}`);

  if (!isGeminiConfigured()) {
    console.warn("No usable GEMINI_API_KEY: every AI call will fail and nothing can be scored.\n");
  }

  const warnings: string[] = [];
  let duplicates: EvalResults["duplicates"] = null;
  let priority: EvalResults["priority"] = null;

  try {
    if (only !== "priority") {
      console.log("\nDuplicates (judging each pair):");
      const run = await evaluateDuplicates();
      duplicates = run.result;
      if (run.errors.length) {
        warnings.push(`${run.errors.length} duplicate judgment(s) failed and were excluded. First: ${run.errors[0]}`);
      }
    }

    if (only !== "duplicates") {
      console.log("\nPriority (analysing each description):");
      const run = await evaluatePriority();
      priority = run.result;
      if (run.errors.length) {
        warnings.push(`${run.errors.length} priority analysis call(s) failed and were excluded. First: ${run.errors[0]}`);
      }
    }
  } catch (error) {
    console.error(`\nInvalid evaluation data: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const counts = [duplicates?.evaluated, priority?.evaluated].filter(
    (count): count is number => count !== undefined,
  );
  const smallest = counts.length ? Math.min(...counts) : 0;
  const meaningful = smallest >= MIN_MEANINGFUL_ROWS;

  if (!meaningful) {
    warnings.unshift(
      `Only ${smallest} labelled row(s) evaluated (minimum ${MIN_MEANINGFUL_ROWS}): these results are NOT statistically meaningful.`,
    );
  }

  if (includeExamples) {
    warnings.push("Includes [EXAMPLE] rows whose labels were written as format examples, not real labels.");
  }

  if (duplicates) {
    console.log("\n=== Duplicate detection ===");
    console.log(`rows: ${duplicates.csvRows} · skipped examples: ${duplicates.skippedExamples} · evaluated: ${duplicates.evaluated} · failed: ${duplicates.failed} · "unsure": ${duplicates.unsure}`);
    console.log(`TP ${duplicates.truePositives}  FP ${duplicates.falsePositives}  FN ${duplicates.falseNegatives}  TN ${duplicates.trueNegatives}`);
    console.log(`precision ${pct(duplicates.precision)} · recall ${pct(duplicates.recall)} · F1 ${pct(duplicates.f1)} · mean latency (successful calls) ${ms(duplicates.meanLatencyMs)}`);
  }

  if (priority) {
    console.log("\n=== Priority (actual rows x predicted columns) ===");
    console.log(`rows: ${priority.csvRows} · skipped examples: ${priority.skippedExamples} · evaluated: ${priority.evaluated} · failed: ${priority.failed}`);
    console.log(`${"".padEnd(10)}${PRIORITY_LABELS.map((label) => label.padStart(10)).join("")}`);
    for (const actual of PRIORITY_LABELS) {
      console.log(
        `${actual.padEnd(10)}${PRIORITY_LABELS.map((predicted) => String(priority!.confusion[actual][predicted]).padStart(10)).join("")}`,
      );
    }
    console.log(`accuracy ${pct(priority.accuracy)} · mean latency (successful calls) ${ms(priority.meanLatencyMs)}`);
  }

  if (warnings.length) banner(["WARNING", ...warnings]);

  const results: EvalResults = {
    generatedAt: new Date().toISOString(),
    model: GEMINI_MODEL,
    includesExamples: includeExamples,
    statisticallyMeaningful: meaningful,
    warnings,
    duplicates,
    priority,
  };

  // A run that scored nothing is not a result; keep any previous file.
  if (counts.every((count) => count === 0)) {
    console.log(`Nothing was evaluated, so ${EVAL_RESULTS_PATH} was not written.`);
    return 0;
  }

  fs.writeFileSync(EVAL_RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Results written to ${EVAL_RESULTS_PATH}`);

  return 0;
}

process.exitCode = await main();
