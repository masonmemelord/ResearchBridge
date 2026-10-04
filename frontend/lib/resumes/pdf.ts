import { Worker } from "node:worker_threads";
import path from "node:path";

/** Isolated parser: fixed worker code, bounded V8 heap and wall-clock time. */
export function extractResume(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), "lib/resumes/pdf-worker.cjs"), {
      workerData: { bytes }, resourceLimits: { maxOldGenerationSizeMb: 128 },
      // Discard parser diagnostics rather than logging private document content.
      stdout: true, stderr: true,
    });
    worker.stdout.resume();
    worker.stderr.resume();
    let settled = false;
    const timer = setTimeout(() => finish(new Error("PDF processing timed out. Try a simpler PDF.")), 15000);
    function finish(error?: Error, result?: { text: string; pages: number }) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else if (result) resolve(result);
    }
    worker.once("message", (result) => {
      if (typeof result.error === "string") finish(new Error(result.error));
      else if (typeof result.text === "string" && Number.isInteger(result.pages)) finish(undefined, result);
      else finish(new Error("PDF processing failed."));
    });
    worker.once("error", () => finish(new Error("PDF processing failed. Try a simpler PDF.")));
    worker.once("exit", () => finish(new Error("PDF processing stopped unexpectedly.")));
  });
}
