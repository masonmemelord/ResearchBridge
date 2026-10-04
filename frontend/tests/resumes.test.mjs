import test from "node:test";
import assert from "node:assert/strict";
import { parseResume, validateScan, validateResumeFile, RESUME_LIMIT_BYTES } from "../lib/resumes/contract.ts";
import { extractResume } from "../lib/resumes/pdf.ts";

const validScan = { summary: "Student with Python experience.", skills: ["Python"], education: [], experience: [], researchInterests: [], warnings: [] };

// Synthetic PDF fixture: no real student information, model, or external API.
function pdf(pages = 1, text = "Synthetic Student Resume: Python, SQL, statistics and microscopy research.") {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids = [];
  for (let i = 0; i < pages; i++) {
    const id = objects.length + 1;
    kids.push(`${id} 0 R`);
    const stream = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Count ${pages} /Kids [${kids.join(" ")}] >>`;
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(body)); body += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

test("accepts a PDF within the upload limit", () => assert.equal(validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: 100 }), null));
test("rejects disguised non-PDF MIME types", () => assert.match(validateResumeFile({ name: "resume.pdf", type: "text/html", size: 100 }), /Choose a PDF/));
test("rejects empty and oversized files", () => {
  for (const size of [0, RESUME_LIMIT_BYTES + 1]) assert.match(validateResumeFile({ name: "resume.pdf", type: "application/pdf", size }), /non-empty PDF/);
});
test("validates and deduplicates model output", () => assert.deepEqual(validateScan({ ...validScan, skills: ["Python", " Python "] }).skills, ["Python"]));
test("rejects missing, excessive and unexpected model fields", () => {
  for (const value of [null, {}, { ...validScan, tools: ["execute"] }, { ...validScan, skills: Array(21).fill("Python") }, { ...validScan, summary: "x".repeat(801) }, { ...validScan, education: [42] }]) {
    assert.throws(() => validateScan(value));
  }
});
test("invalid stored scan keeps download/delete metadata usable", () => {
  const result = parseResume({ id: "11111111-1111-4111-8111-111111111111", original_name: "resume.pdf", byte_size: 100,
    page_count: 1, extracted_text: "Synthetic student data", model: "qwen3:4b", created_at: new Date().toISOString(), scan_result: {} });
  assert.equal(result.scan_result.skills.length, 0); assert.match(result.scan_result.warnings[0], /unsupported format/);
  assert.equal(parseResume(null), null); assert.throws(() => parseResume({}));
});
test("extracts a real text PDF in the isolated worker", async () => {
  const result = await extractResume(pdf());
  assert.equal(result.pages, 1); assert.match(result.text, /Python/);
});
test("rejects a PDF over the five-page limit", async () => assert.rejects(extractResume(pdf(6)), /one to five/));
test("rejects PDFs without enough selectable text", async () => assert.rejects(extractResume(pdf(1, "")), /selectable text/));
test("rejects corrupt PDF bytes", async () => assert.rejects(extractResume(Buffer.from("%PDF-not-valid")), /could not be read/));
