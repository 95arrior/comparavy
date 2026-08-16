// [species-c] .env.local 로더 — 기존 앱 모듈을 import하지 않기 위한 자체 구현(격리 §0).
import fs from "node:fs";
import path from "node:path";

let loaded = false;
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
