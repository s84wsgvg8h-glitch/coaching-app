/**
 * Migrate Supabase Storage objects to Cloudflare R2 and update DB metadata.
 *   npx tsx scripts/migrate-supabase-to-r2.ts            # dry-run
 *   npx tsx scripts/migrate-supabase-to-r2.ts --execute  # copy + update
 *   npx tsx scripts/migrate-supabase-to-r2.ts --execute --limit=5 --table=messages
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_R2_* vars
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "../lib/loadEnvFiles";
import { uploadToR2 } from "../lib/storage/r2";
import { getR2Config } from "../lib/storage/env";

loadEnvFiles();

const SUPABASE_STORAGE_MARKER = "/storage/v1/object/";

type MigrationTarget = {
  table: string;
  urlColumn: string;
  pathColumns: string[];
};

const TARGETS: MigrationTarget[] = [
  { table: "profiles", urlColumn: "avatar_url", pathColumns: ["storage_path"] },
  { table: "chat_groups", urlColumn: "avatar_url", pathColumns: ["storage_path"] },
  { table: "messages", urlColumn: "file_url", pathColumns: ["storage_path"] },
  {
    table: "exercise_library_items",
    urlColumn: "video_url",
    pathColumns: ["video_path", "storage_path"],
  },
  {
    table: "athlete_exercise_videos",
    urlColumn: "video_url",
    pathColumns: ["video_path", "storage_path"],
  },
  {
    table: "video_reviews",
    urlColumn: "video_url",
    pathColumns: ["storage_path"],
  },
  {
    table: "merch_items",
    urlColumn: "image_url",
    pathColumns: ["storage_path"],
  },
];

function parseArgs() {
  const execute = process.argv.includes("--execute");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const tableArg = process.argv.find((arg) => arg.startsWith("--table="));
  return {
    execute,
    limit: limitArg ? Number.parseInt(limitArg.split("=")[1] || "0", 10) : 25,
    table: tableArg?.split("=")[1] || null,
  };
}

function isSupabaseStorageUrl(url: string | null | undefined) {
  return Boolean(url?.includes(SUPABASE_STORAGE_MARKER));
}

function extractSupabasePath(url: string) {
  const markers = [
    "/storage/v1/object/public/",
    "/storage/v1/object/sign/",
    "/storage/v1/object/authenticated/",
  ];

  for (const marker of markers) {
    const index = url.indexOf(marker);
    if (index === -1) continue;
    const rest = url.slice(index + marker.length);
    const slash = rest.indexOf("/");
    if (slash === -1) return null;
    return decodeURIComponent(rest.slice(slash + 1).split("?")[0] || "");
  }

  return null;
}

function suggestR2Key(table: string, legacyPath: string | null, rowId: string) {
  if (!legacyPath) return null;
  const ext = legacyPath.split(".").pop() || "bin";
  const safeLegacy = legacyPath.replace(/\//g, "-");

  if (table === "profiles" || table === "chat_groups") {
    return `avatars/${rowId}/migrated-${Date.now()}.${ext}`;
  }
  if (table === "messages") return `chat-media/migrated/${safeLegacy}`;
  if (table === "exercise_library_items") {
    return `exercise-library/migrated/${safeLegacy}`;
  }
  if (table === "athlete_exercise_videos") {
    return `exercise-videos/migrated/${safeLegacy}`;
  }
  if (table === "video_reviews") {
    return `exercise-videos/migrated/reviews/${safeLegacy}`;
  }
  if (table === "merch_items") return `merch-images/migrated/${safeLegacy}`;
  return `migrated/${table}/${safeLegacy}`;
}

async function migrateRow(
  target: MigrationTarget,
  row: Record<string, unknown>,
  execute: boolean,
) {
  const url = row[target.urlColumn] as string | null;
  if (!isSupabaseStorageUrl(url)) return null;

  const provider = row.storage_provider as string | undefined;
  if (provider === "r2" && target.pathColumns.some((col) => row[col])) {
    return null;
  }

  const legacyPath = extractSupabasePath(url!);
  const r2Key = suggestR2Key(target.table, legacyPath, String(row.id));
  if (!r2Key) return null;

  const plan = {
    table: target.table,
    id: String(row.id),
    urlColumn: target.urlColumn,
    legacyPath,
    r2Key,
  };

  if (!execute) return plan;

  const response = await fetch(url!);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const uploaded = await uploadToR2({
    objectKey: r2Key,
    body: buffer,
    contentType,
  });

  const r2Config = getR2Config();
  const update: Record<string, unknown> = {
    storage_provider: "r2",
    storage_bucket: r2Config?.bucket || "media",
    storage_path: uploaded.path,
  };

  if (target.pathColumns.includes("video_path")) {
    update.video_path = uploaded.path;
  }

  return { ...plan, uploaded: uploaded.url, update };
}

async function main() {
  const { execute, limit, table } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (execute && !getR2Config()) {
    console.error("R2 is not configured. Set CLOUDFLARE_R2_* env vars first.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const targets = table ? TARGETS.filter((t) => t.table === table) : TARGETS;
  let processed = 0;
  const results: unknown[] = [];

  for (const target of targets) {
    const selectCols = [
      "id",
      "storage_provider",
      target.urlColumn,
      ...target.pathColumns,
    ].join(", ");

    const { data, error } = await supabase.from(target.table).select(selectCols);
    if (error) {
      throw new Error(`${target.table}: ${error.message}`);
    }

    for (const row of data || []) {
      if (processed >= limit) break;
      const record = row as unknown as Record<string, unknown>;
      const result = await migrateRow(target, record, execute);
      if (!result) continue;

      results.push(result);
      processed += 1;

      if (execute && "update" in result && result.update) {
        const { error: updateError } = await supabase
          .from(target.table)
          .update(result.update)
          .eq("id", result.id);
        if (updateError) {
          throw new Error(`${target.table} update failed: ${updateError.message}`);
        }
      }
    }

    if (processed >= limit) break;
  }

  console.log(
    execute
      ? `\nExecuted migration for ${results.length} record(s):\n`
      : `\nDry-run migration plan for ${results.length} record(s):\n`,
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
