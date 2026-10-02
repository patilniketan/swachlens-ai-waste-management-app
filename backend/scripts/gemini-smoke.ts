// ============================================================
// GEMINI SMOKE TEST
// ============================================================
// Makes ONE real analysis call (photo + description) and prints the
// structured result, or the exact error. Never uses the demo cache.
//
//   npx tsx scripts/gemini-smoke.ts [path/to/photo.jpg] ["description"]
//
// Exit codes: 0 = success, 1 = call failed, 2 = no usable API key.
// ============================================================

import "dotenv/config";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

// Must be set before ai.service / ai.cache are loaded.
process.env.AI_MODE = "live";

const { analyzeComplaint, isGeminiConfigured, GEMINI_MODEL, GEMINI_TIMEOUT_MS } =
  await import("../src/services/ai.service.js");

const imagePath =
  process.argv[2] ??
  path.join(process.cwd(), "src", "uploads", "seed", "construction-debris.png");

const description =
  process.argv[3] ??
  "Bricks and broken tiles dumped on the lane outside the school gate, cars cannot pass.";

// Returns the exit code. process.exitCode (not process.exit) lets open HTTP
// sockets close cleanly; exiting mid-close trips a libuv assertion on Windows.
async function main(): Promise<number> {
  console.log(`Model:   ${GEMINI_MODEL} (timeout ${GEMINI_TIMEOUT_MS}ms)`);
  console.log(`Image:   ${imagePath}`);
  console.log(`Text:    ${description}`);

  if (!isGeminiConfigured()) {
    console.error(
      "\nNo usable GEMINI_API_KEY (missing, empty, or an example placeholder). " +
        "No request was made.",
    );
    return 2;
  }

  const extension = path.extname(imagePath).toLowerCase();
  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  const startedAt = performance.now();

  const result = await analyzeComplaint({
    description,
    image: { data: fs.readFileSync(imagePath), mimeType },
  });

  const elapsedMs = Math.round(performance.now() - startedAt);

  if (result.source !== "gemini") {
    console.error(`\nFAILED after ${elapsedMs}ms (source=${result.source})`);
    console.error(`Error: ${result.error ?? "(no error message)"}`);
    return 1;
  }

  console.log(`\nOK in ${elapsedMs}ms (source=${result.source})`);
  console.log(JSON.stringify(result.features, null, 2));
  return 0;
}

process.exitCode = await main();
