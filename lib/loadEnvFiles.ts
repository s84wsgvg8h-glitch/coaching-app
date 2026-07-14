import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [
  ".env.local",
  ".env.production.local",
  ".env.migrate.local",
  ".env",
];

export function loadEnvFiles(cwd = process.cwd()) {
  for (const file of ENV_FILES) {
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
