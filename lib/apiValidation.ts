import { z } from "zod";
import { COACHING_PLAN_IDS } from "@/lib/stripeSubscriptionConfig";
import { apiError } from "@/lib/apiResponse";

export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: ReturnType<typeof apiError> }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: apiError("Ongeldig JSON-verzoek.", 400),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return {
      success: false,
      response: apiError(message || "Ongeldige invoer.", 400),
    };
  }

  return { success: true, data: parsed.data };
}

const storageProviderSchema = z.enum(["supabase", "r2"]);
const storageUploadTypeSchema = z.enum([
  "chat-media",
  "exercise-videos",
  "exercise-library",
  "avatars",
  "merch-images",
]);
const knowledgeScopeSchema = z.enum(["coach", "athlete", "all"]);
const adminKnowledgeScopeSchema = z.enum(["coach", "athlete"]);

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().optional().nullable(),
  auth: z.string().optional().nullable(),
});

export const coachCopilotSchema = z.object({
  summary: z.string().max(4000).optional(),
  athleteCount: z.number().int().min(0).max(10_000).optional(),
});

export const adminDeleteUserSchema = z.object({
  userId: z.string().uuid("Ongeldige userId."),
});

export const accountDeleteSchema = z.object({
  confirmText: z.literal("VERWIJDER", {
    message: 'Typ "VERWIJDER" om te bevestigen.',
  }),
});

export const adminSendEmailSchema = z.object({
  to: z.string().email("Ongeldig e-mailadres."),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(50_000),
  templateKey: z.string().max(100).optional(),
});

export const adminCreateCoachSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres."),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn."),
  fullName: z.string().min(1).max(200),
});

export const coachCreateAthleteSchema = z.object({
  fullName: z.string().min(1, "Naam is verplicht.").max(200),
  email: z.string().email("Ongeldig e-mailadres."),
  geboortedatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige geboortedatum.")
    .optional()
    .nullable(),
  lidnummer: z.string().max(100).optional().nullable(),
  password: z
    .string()
    .min(6, "Wachtwoord moet minimaal 6 tekens zijn.")
    .optional()
    .nullable(),
});

export const adminConfigureAuthSchema = z.object({
  siteUrl: z.string().url().optional(),
});

export const adminSettingsPatchSchema = z.object({
  settings: z
    .object({
      maintenance_mode: z.boolean().optional(),
      maintenance_message: z.string().nullable().optional(),
      welcome_message: z.string().nullable().optional(),
      feature_flags: z.record(z.string(), z.unknown()).optional(),
      email_templates: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  banner: z
    .object({
      id: z.string().uuid().optional(),
      message: z.string().optional(),
      banner_type: z.string().optional(),
      active: z.boolean().optional(),
      starts_at: z.string().nullable().optional(),
      ends_at: z.string().nullable().optional(),
    })
    .optional(),
  deleteBannerId: z.string().uuid().optional(),
  createBanner: z
    .object({
      message: z.string().min(1),
      banner_type: z.string().min(1),
      active: z.boolean(),
      starts_at: z.string().nullable().optional(),
      ends_at: z.string().nullable().optional(),
    })
    .optional(),
});

export const adminKnowledgeChunkWriteSchema = z.object({
  id: z.string().uuid().optional(),
  scope: knowledgeScopeSchema.optional(),
  chunk_key: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(200).optional(),
  content: z.string().max(20_000).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  active: z.boolean().optional(),
});

export const adminKnowledgeCreateSchema = z.object({
  scope: adminKnowledgeScopeSchema,
  chunk_key: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  category: z.string().min(1).max(200),
  content: z.string().max(20_000).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  active: z.boolean().optional(),
});

export const adminKnowledgePatchSchema = adminKnowledgeChunkWriteSchema.extend({
  id: z.string().uuid(),
});

export const merchCheckoutSchema = z.object({
  merchItemId: z.string().uuid(),
  size: z.string().min(1).max(50),
  color: z.string().max(50).optional(),
  customerNote: z.string().max(1000).optional(),
  pickupMethod: z.string().max(100).optional(),
  discountCode: z.string().max(50).optional(),
});

/** Checkout plan wordt server-side afgeleid uit betaling_prijs — geen client input. */
export const coachingCheckoutSchema = z.object({}).strict();

export const merchValidateDiscountSchema = z.object({
  merchItemId: z.string().uuid(),
  discountCode: z.string().min(1).max(50),
});

export const storageDeleteSchema = z.object({
  provider: storageProviderSchema,
  bucket: z.string().min(1),
  path: z.string().min(1),
  uploadType: storageUploadTypeSchema.optional(),
  ownerUserId: z.string().uuid().optional(),
  athleteId: z.string().uuid().optional(),
});

export const storageSignedUrlSchema = z
  .object({
    provider: storageProviderSchema.optional().nullable(),
    bucket: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    legacyUrl: z.string().optional().nullable(),
    expiresInSeconds: z.number().int().min(60).max(86_400).optional(),
  })
  .refine(
    (body) => Boolean(body.path?.trim() || body.legacyUrl?.trim()),
    "path of legacyUrl is verplicht.",
  );

export const storagePresignSchema = z.object({
  uploadType: storageUploadTypeSchema,
  filename: z.string().min(1).max(255).optional(),
  contentType: z.string().min(1).max(200).optional(),
  size: z.number().int().min(0).max(500 * 1024 * 1024).optional(),
  context: z
    .object({
      scope: z.string().optional(),
      athleteId: z.string().uuid().optional(),
      exerciseId: z.string().uuid().optional(),
      setNumber: z.number().int().optional(),
      reviewId: z.string().uuid().optional(),
      isThumbnail: z.boolean().optional(),
    })
    .optional(),
});

export const storageMultipartCompleteSchema = z.object({
  uploadId: z.string().min(1).max(512),
  objectKey: z.string().min(1).max(1024),
  contentType: z.string().min(1).max(200),
  size: z.number().int().min(0).max(500 * 1024 * 1024),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10_000),
        etag: z.string().min(1).max(256),
      }),
    )
    .min(1)
    .max(10_000),
});

export const storageMultipartAbortSchema = z.object({
  uploadId: z.string().min(1).max(512),
  objectKey: z.string().min(1).max(1024),
});

export const openipfLeaderboardSchema = z.object({
  names: z.array(z.string().min(1).max(200)).max(12).optional(),
});

export const exerciseLibraryCategorySchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().nullable().optional(),
});

export const dashboardAiSchema = z.object({
  query: z.string().min(1).max(4000),
  role: z.string().max(50).optional(),
  knowledgeScope: knowledgeScopeSchema.optional(),
  pages: z
    .array(
      z.object({
        title: z.string(),
        href: z.string(),
        description: z.string(),
      }),
    )
    .max(100)
    .optional(),
  athletes: z
    .array(z.object({ name: z.string(), href: z.string() }))
    .max(500)
    .optional(),
  commands: z
    .array(
      z.object({
        command: z.string(),
        description: z.string(),
        requiresChat: z.boolean().optional(),
      }),
    )
    .max(100)
    .optional(),
  coachSnapshot: z.record(z.string(), z.unknown()).optional(),
  trainingSnapshot: z.record(z.string(), z.unknown()).optional(),
  trainingContext: z.string().max(20_000).optional(),
});
