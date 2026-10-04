import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let local;
try {
  local = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], {
    cwd: path.resolve(frontend, "../backend"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }));
} catch {
  console.error("Start Docker, then run cd backend && supabase start && supabase migration up --local.");
  process.exit(1);
}
if (!local.API_URL || !local.ANON_KEY || new URL(local.API_URL).hostname !== "127.0.0.1") {
  console.error("Refusing to start the demo against anything other than local Supabase.");
  process.exit(1);
}
console.log("Local résumé demo: local Supabase + Ollama. Your hosted .env.local is unchanged.");
console.log("Open /student/resume after signing in with a locally provisioned student account.");
const child = spawn(process.execPath, [path.join(frontend, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", ...process.argv.slice(2)], {
  cwd: frontend, stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: local.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    NEXT_PUBLIC_ENABLE_RESUME_DEMO: "true", LOCAL_RESUME_DEMO: "true", OLLAMA_BASE_URL: "http://127.0.0.1:11434", OLLAMA_MODEL: "qwen3:4b" },
});
child.on("error", () => { console.error("Could not start Next.js."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
