/* eslint-disable @typescript-eslint/no-require-imports */
const { parentPort, workerData } = require("node:worker_threads");
const { PDFParse } = require("pdf-parse");

async function extract() {
  const parser = new PDFParse({
    data: new Uint8Array(workerData.bytes), isEvalSupported: false,
    useSystemFonts: false, disableFontFace: true, verbosity: 0,
  });
  try {
    const info = await parser.getInfo();
    if (info.total < 1 || info.total > 5) {
      parentPort.postMessage({ error: "Choose a PDF with one to five pages." });
      return;
    }
    const result = await parser.getText({ pageJoiner: "\n" });
    const text = result.text.replace(/\u0000/g, "").trim();
    if (text.length < 30) {
      parentPort.postMessage({ error: "This PDF has too little selectable text. Export a text-based PDF; image-only scans need OCR, which is not included yet." });
    } else if (text.length > 20000) {
      parentPort.postMessage({ error: "This PDF contains too much text. Upload a shorter résumé." });
    } else {
      parentPort.postMessage({ text, pages: info.total });
    }
  } catch {
    parentPort.postMessage({ error: "The PDF could not be read. Remove password protection or export a fresh PDF." });
  } finally {
    await parser.destroy();
  }
}
void extract();
