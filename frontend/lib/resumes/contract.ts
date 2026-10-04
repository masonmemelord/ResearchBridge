export const RESUME_LIMIT_BYTES = 3 * 1024 * 1024;
export const RESUME_MAX_PAGES = 5;
export const RESUME_MAX_TEXT = 20000;
export const RESUME_BUCKET = "student-resumes";

export type ResumeScan = {
  summary: string;
  skills: string[];
  education: string[];
  experience: string[];
  researchInterests: string[];
  warnings: string[];
};
export type StudentResume = {
  id: string;
  original_name: string;
  byte_size: number;
  page_count: number;
  extracted_text: string;
  scan_result: ResumeScan;
  model: string;
  created_at: string;
};

export const SCAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", maxLength: 800 },
    skills: { type: "array", maxItems: 20, items: { type: "string", maxLength: 80 } },
    education: { type: "array", maxItems: 8, items: { type: "string", maxLength: 200 } },
    experience: { type: "array", maxItems: 10, items: { type: "string", maxLength: 300 } },
    researchInterests: { type: "array", maxItems: 10, items: { type: "string", maxLength: 100 } },
    warnings: { type: "array", maxItems: 8, items: { type: "string", maxLength: 200 } },
  },
  required: ["summary", "skills", "education", "experience", "researchInterests", "warnings"],
} as const;

function stringList(value: unknown, count: number, length: number): string[] {
  if (!Array.isArray(value) || value.length > count || value.some(
    (item) => typeof item !== "string" || item.length > length || !item.trim(),
  )) throw new Error("The AI response did not match the résumé schema.");
  return [...new Set((value as string[]).map((item) => item.trim()))];
}

/** Model output is untrusted, even when generation uses a JSON schema. */
export function validateScan(value: unknown): ResumeScan {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid scan.");
  const scan = value as Record<string, unknown>;
  if (Object.keys(scan).some((key) => !SCAN_SCHEMA.required.includes(key as typeof SCAN_SCHEMA.required[number])) ||
    typeof scan.summary !== "string" || scan.summary.length > 800) throw new Error("Invalid summary.");
  return {
    summary: scan.summary.trim(),
    skills: stringList(scan.skills, 20, 80),
    education: stringList(scan.education, 8, 200),
    experience: stringList(scan.experience, 10, 300),
    researchInterests: stringList(scan.researchInterests, 10, 100),
    warnings: stringList(scan.warnings, 8, 200),
  };
}

export function validateResumeFile(file: { name: string; size: number; type: string }): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    return "Choose a PDF résumé. Word documents and images are not supported in this demo.";
  }
  if (file.size < 1 || file.size > RESUME_LIMIT_BYTES) return "Choose a non-empty PDF no larger than 3 MB.";
  return null;
}

/** Validate saved rows at the UI boundary; a database row is not a TS type. */
export function parseResume(value: unknown): StudentResume | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Your saved résumé could not be read. Refresh and try again.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !/^[0-9a-f-]{36}$/i.test(row.id) ||
      typeof row.original_name !== "string" || row.original_name.length > 120 ||
      typeof row.byte_size !== "number" || row.byte_size < 1 || row.byte_size > RESUME_LIMIT_BYTES ||
      typeof row.page_count !== "number" || !Number.isInteger(row.page_count) || row.page_count < 1 || row.page_count > RESUME_MAX_PAGES ||
      typeof row.extracted_text !== "string" || row.extracted_text.length > RESUME_MAX_TEXT ||
      typeof row.model !== "string" || row.model.length > 100 || typeof row.created_at !== "string") {
    throw new Error("Your saved résumé could not be read. Refresh and try again.");
  }
  let scan: ResumeScan;
  try { scan = validateScan(row.scan_result); }
  catch {
    // Keep download/delete available if an old or directly inserted scan is invalid.
    scan = { summary: "", skills: [], education: [], experience: [], researchInterests: [], warnings: ["This saved scan has an unsupported format. Download the original, then delete and upload it again."] };
  }
  return { id: row.id, original_name: row.original_name, byte_size: row.byte_size,
    page_count: row.page_count, extracted_text: row.extracted_text, scan_result: scan,
    model: row.model, created_at: row.created_at };
}
