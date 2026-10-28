#!/usr/bin/env node
/**
 * Configure CORS on the Cloudflare R2 bucket for browser / Capacitor direct PUT uploads.
 *
 * Usage:
 *   node scripts/configure-r2-cors.mjs
 *
 * Requires env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID,
 * CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET
 */

import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error(
    "Missing R2 env vars. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET.",
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://limitlesscoaching.app",
        "https://www.limitlesscoaching.app",
        "http://localhost:3000",
      ],
      AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: corsConfiguration,
  }),
);

console.log(`✓ CORS configured on bucket "${bucket}"`);
console.log(JSON.stringify(corsConfiguration, null, 2));
