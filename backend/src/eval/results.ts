import { readFile } from "fs/promises";
import path from "path";

// Written by scripts/eval.ts, read by GET /api/admin/eval/latest. Relative to
// the backend working directory, like uploads.
export const EVAL_DIR = path.join(process.cwd(), "eval");
export const EVAL_RESULTS_PATH = path.join(EVAL_DIR, "results.json");

// Below this many evaluated rows, results are flagged as not meaningful.
export const MIN_MEANINGFUL_ROWS = 20;

export type PriorityLabel = "CRITICAL" | "STANDARD" | "TRIVIAL";

export const PRIORITY_LABELS: PriorityLabel[] = ["CRITICAL", "STANDARD", "TRIVIAL"];

export interface DuplicateEvalResult {
  csvRows: number;
  skippedExamples: number;
  // Rows the model actually judged (failed calls are excluded from metrics).
  evaluated: number;
  failed: number;
  // "unsure" answers count as "not a duplicate" in the metrics.
  unsure: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  // Over successful AI calls only.
  meanLatencyMs: number | null;
}

export interface PriorityEvalResult {
  csvRows: number;
  skippedExamples: number;
  evaluated: number;
  failed: number;
  // confusion[actual][predicted]
  confusion: Record<PriorityLabel, Record<PriorityLabel, number>>;
  accuracy: number | null;
  // Over successful AI calls only.
  meanLatencyMs: number | null;
}

export interface EvalResults {
  generatedAt: string;
  model: string;
  includesExamples: boolean;
  statisticallyMeaningful: boolean;
  warnings: string[];
  duplicates: DuplicateEvalResult | null;
  priority: PriorityEvalResult | null;
}

// ---------------- metrics (pure) ----------------

const ratio = (numerator: number, denominator: number) =>
  denominator === 0 ? null : numerator / denominator;

export const binaryMetrics = (pairs: { actual: boolean; predicted: boolean }[]) => {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const { actual, predicted } of pairs) {
    if (actual && predicted) tp++;
    else if (!actual && predicted) fp++;
    else if (actual && !predicted) fn++;
    else tn++;
  }

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 =
    precision !== null && recall !== null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  return { tp, fp, fn, tn, precision, recall, f1 };
};

export const emptyConfusion = () =>
  Object.fromEntries(
    PRIORITY_LABELS.map((actual) => [
      actual,
      Object.fromEntries(PRIORITY_LABELS.map((predicted) => [predicted, 0])),
    ]),
  ) as Record<PriorityLabel, Record<PriorityLabel, number>>;

export const confusionMatrix = (
  pairs: { actual: PriorityLabel; predicted: PriorityLabel }[],
) => {
  const confusion = emptyConfusion();
  let correct = 0;

  for (const { actual, predicted } of pairs) {
    confusion[actual][predicted]++;
    if (actual === predicted) correct++;
  }

  return { confusion, accuracy: ratio(correct, pairs.length) };
};

export const mean = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

// ---------------- reading (backend endpoint) ----------------

// The latest results, or null when eval has not been run (or the file is
// unreadable). Never throws: a bad file just means "not evaluated".
export const readLatestResults = async (): Promise<EvalResults | null> => {
  try {
    const parsed = JSON.parse(await readFile(EVAL_RESULTS_PATH, "utf8")) as Partial<EvalResults>;

    return typeof parsed.generatedAt === "string" ? (parsed as EvalResults) : null;
  } catch (error) {
    if ((error as { code?: unknown })?.code !== "ENOENT") {
      console.error("Could not read eval results:", error);
    }

    return null;
  }
};
