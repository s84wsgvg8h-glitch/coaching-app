/**
 * Dry-run migration plan: Supabase Storage URLs → Cloudflare R2
 *
 * Run locally (requires env vars):
 *   npx tsx scripts/plan-supabase-to-r2-migration.ts
 *
 * Does NOT copy or delete files — report only.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TableScan = {
  table: string;
  urlColumns: string[];
  pathColumns: string[];
  jsonColumns?: string[];
};

const SUPABASE_STORAGE_MARKER = "/storage/v1/object/";

const TABLES: TableScan[] = [
  {
    table: "messages",
    urlColumns: ["file_url"],
    pathColumns: ["storage_path"],
  },
  {
    table: "athlete_exercise_videos",
    urlColumns: ["video_url"],
    pathColumns: ["video_path", "storage_path"],
  },
  {
    table: "video_reviews",
    urlColumns: ["video_url", "thumbnail_url"],
    pathColumns: ["storage_path"],
    jsonColumns: ["feedback_media"],
  },
  {
    table: "exercise_library_items",
    urlColumns: ["video_url", "thumbnail_url"],
    pathColumns: ["video_path", "storage_path"],
  },
  {
    table: "profiles",
    urlColumns: ["avatar_url"],
    pathColumns: ["storage_path"],
  },
  {
    table: "chat_groups",
    urlColumns: ["avatar_url"],
    pathColumns: ["storage_path"],
  },
  {
    table: "merch_items",
    urlColumns: ["image_url"],
    pathColumns: ["storage_path"],
    jsonColumns: ["image_urls"],
  },
];

const MIGRATION_ORDER = [
  "profiles",
  "chat_groups",
  "merch_items",
  "messages",
  "exercise_library_items",
  "athlete_exercise_videos",
  "video_reviews",
];

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

function suggestR2Key(
  table: string,
  legacyPath: string | null,
  row: Record<string, unknown>,
) {
  if (!legacyPath) return null;

  if (table === "profiles" || table === "chat_groups") {
    const userId = (row.id as string) || "unknown";
    const ext = legacyPath.split(".").pop() || "jpg";
    return `avatars/${userId}/migrated-${Date.now()}.${ext}`;
  }

  if (table === "merch_items") {
    return `merch-images/migrated/${legacyPath.replace(/\//g, "-")}`;
  }

  if (table === "messages") {
    return `chat-media/migrated/${legacyPath.replace(/\//g, "-")}`;
  }

  if (table === "exercise_library_items") {
    return `exercise-library/migrated/${legacyPath.replace(/\//g, "-")}`;
  }

  if (table === "athlete_exercise_videos") {
    return `exercise-videos/migrated/${legacyPath.replace(/\//g, "-")}`;
  }

  if (table === "video_reviews") {
    return `exercise-videos/migrated/reviews/${legacyPath.replace(/\//g, "-")}`;
  }

  return `migrated/${table}/${legacyPath.replace(/\//g, "-")}`;
}

async function scanTable(supabase: SupabaseClient, scan: TableScan) {
  const selectCols = [
    "id",
    "storage_provider",
    ...scan.urlColumns,
    ...scan.pathColumns,
    ...(scan.jsonColumns || []),
  ].join(", ");

  const { data, error } = await supabase.from(scan.table).select(selectCols);

  if (error) {
    throw new Error(`${scan.table}: ${error.message}`);
  }

  let supabaseUrlCount = 0;
  let missingStoragePath = 0;
  const samples: {
    id: string;
    column: string;
    url: string;
    legacyPath: string | null;
    suggestedR2Key: string | null;
    hasStoragePath: boolean;
  }[] = [];

  for (const row of data || []) {
    const record = row as unknown as Record<string, unknown>;
    const hasPath = scan.pathColumns.some((col) => Boolean(record[col]));
    const provider = record.storage_provider as string | undefined;

    for (const col of scan.urlColumns) {
      const url = record[col] as string | null;
      if (!isSupabaseStorageUrl(url)) continue;

      supabaseUrlCount += 1;
      if (!hasPath || provider !== "r2") missingStoragePath += 1;

      if (samples.length < 5) {
        const legacyPath = url ? extractSupabasePath(url) : null;
        samples.push({
          id: String(record.id),
          column: col,
          url: url!,
          legacyPath,
          suggestedR2Key: suggestR2Key(scan.table, legacyPath, record),
          hasStoragePath: hasPath,
        });
      }
    }

    if (scan.jsonColumns?.includes("image_urls")) {
      const urls = record.image_urls;
      if (Array.isArray(urls)) {
        for (const url of urls) {
          if (typeof url === "string" && isSupabaseStorageUrl(url)) {
            supabaseUrlCount += 1;
            if (!hasPath) missingStoragePath += 1;
          }
        }
      }
    }

    if (scan.jsonColumns?.includes("feedback_media")) {
      const media = record.feedback_media;
      if (Array.isArray(media)) {
        for (const item of media) {
          const url =
            item && typeof item === "object" && "url" in item
              ? (item as { url?: string }).url
              : null;
          if (isSupabaseStorageUrl(url)) {
            supabaseUrlCount += 1;
            if (!hasPath) missingStoragePath += 1;
          }
        }
      }
    }
  }

  return {
    table: scan.table,
    totalRows: (data || []).length,
    supabaseUrlCount,
    missingStoragePath,
    samples,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key for read-only).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const results = [];

  for (const scan of TABLES) {
    results.push(await scanTable(supabase, scan));
  }

  const totalSupabaseUrls = results.reduce((n, r) => n + r.supabaseUrlCount, 0);
  const totalMissingPath = results.reduce(
    (n, r) => n + r.missingStoragePath,
    0,
  );

  console.log("\n=== Supabase → R2 migration plan (DRY RUN) ===\n");
  console.log(`Total Supabase Storage URL references: ${totalSupabaseUrls}`);
  console.log(`Records without storage_path (or not r2): ${totalMissingPath}`);
  console.log("\nRecommended migration order:");
  for (const table of MIGRATION_ORDER) {
    const row = results.find((r) => r.table === table);
    if (!row) continue;
    console.log(
      `  ${table}: ${row.supabaseUrlCount} Supabase URLs, ${row.missingStoragePath} need metadata`,
    );
  }

  console.log("\nPer table detail:");
  for (const row of results) {
    console.log(`\n--- ${row.table} (${row.totalRows} rows) ---`);
    console.log(`  Supabase URLs: ${row.supabaseUrlCount}`);
    console.log(`  Missing storage_path: ${row.missingStoragePath}`);
    if (row.samples.length) {
      console.log("  Samples:");
      for (const s of row.samples) {
        console.log(`    id=${s.id} col=${s.column}`);
        console.log(`      url: ${s.url.slice(0, 80)}...`);
        console.log(`      legacy path: ${s.legacyPath}`);
        console.log(`      suggested R2 key: ${s.suggestedR2Key}`);
      }
    }
  }

  console.log("\n=== Next steps (manual) ===");
  console.log("1. Run batch copy Supabase → R2 (not implemented in this script).");
  console.log("2. Update rows with storage_provider=r2, storage_path, storage_bucket.");
  console.log("3. Keep legacy URL until verified, then optionally null old URL.");
  console.log("4. Never delete Supabase objects until playback verified.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
