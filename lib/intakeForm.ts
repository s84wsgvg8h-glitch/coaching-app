import { supabase } from "@/lib/supabaseClient";

export const DEFAULT_INTAKE_TEMPLATE_ID = "a0000000-0000-4000-8000-000000000001";

export type IntakeFieldType = "text" | "number" | "date" | "textarea" | "select";

export type IntakeSelectOption = {
  value: string;
  label: string;
};

export type IntakeFormField = {
  key: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  order: number;
  options?: IntakeSelectOption[];
};

export type IntakeFormTemplate = {
  id: string;
  fields: IntakeFormField[];
  updated_at?: string | null;
};

export type AthleteIntakeResponse = {
  id: string;
  athlete_id: string;
  answers: Record<string, string>;
  completed_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const DEFAULT_INTAKE_FIELDS: IntakeFormField[] = [
  { key: "name", label: "Naam", type: "text", required: true, order: 1 },
  { key: "birthdate", label: "Geboortedatum", type: "date", required: true, order: 2 },
  { key: "knkf_lidnummer", label: "KNKF-lidnummer", type: "text", required: false, order: 3 },
  { key: "bodyweight", label: "Lichaamsgewicht (kg)", type: "number", required: true, order: 4 },
  { key: "weightclass", label: "Gewichtsklasse", type: "text", required: false, order: 5 },
  { key: "height", label: "Lengte (cm)", type: "number", required: false, order: 6 },
  { key: "upcoming_meet_name", label: "Aankomende wedstrijd", type: "text", required: false, order: 7 },
  { key: "upcoming_meet_date", label: "Datum aankomende wedstrijd", type: "date", required: false, order: 8 },
  { key: "prs", label: "Huidige PR's", type: "textarea", required: false, order: 9 },
  { key: "injury_history", label: "Blessuregeschiedenis", type: "textarea", required: false, order: 10 },
  {
    key: "had_coach_before",
    label: "Eerder een coach gehad?",
    type: "select",
    required: true,
    order: 11,
    options: [
      { value: "yes", label: "Ja" },
      { value: "no", label: "Nee" },
    ],
  },
  { key: "old_program", label: "Vorig programma", type: "textarea", required: false, order: 12 },
  { key: "what_worked", label: "Wat werkte goed?", type: "textarea", required: false, order: 13 },
  { key: "training_days", label: "Trainingsdagen", type: "textarea", required: true, order: 14 },
  { key: "equipment", label: "Beschikbare apparatuur", type: "textarea", required: false, order: 15 },
  { key: "short_term_goals", label: "Korte-termijn doelen", type: "textarea", required: true, order: 16 },
  { key: "long_term_goals", label: "Lange-termijn doelen", type: "textarea", required: true, order: 17 },
  { key: "lifestyle", label: "Leefstijl", type: "textarea", required: false, order: 18 },
  { key: "recovery_management", label: "Herstelbeheer", type: "textarea", required: false, order: 19 },
  { key: "coach_expectations", label: "Verwachtingen van coach", type: "textarea", required: false, order: 20 },
  { key: "training_duration", label: "Hoe lang train je al?", type: "textarea", required: false, order: 21 },
  { key: "city", label: "Woonplaats", type: "text", required: false, order: 22 },
  {
    key: "meets_before",
    label: "Eerder wedstrijden gedaan?",
    type: "select",
    required: true,
    order: 23,
    options: [
      { value: "yes", label: "Ja" },
      { value: "no", label: "Nee" },
    ],
  },
  { key: "motivation", label: "Motivatie", type: "textarea", required: true, order: 24 },
  {
    key: "no_steroids",
    label: "Ik gebruik geen anabole steroïden",
    type: "select",
    required: true,
    order: 25,
    options: [
      { value: "yes", label: "Ja, ik bevestig dit" },
      { value: "no", label: "Nee" },
    ],
  },
];

function normalizeFields(raw: unknown): IntakeFormField[] {
  if (!Array.isArray(raw)) return DEFAULT_INTAKE_FIELDS;

  const fields = raw
    .filter((item): item is IntakeFormField => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as IntakeFormField).key === "string" &&
        typeof (item as IntakeFormField).label === "string"
      );
    })
    .map((field) => ({
      ...field,
      order: Number(field.order) || 0,
    }))
    .sort((a, b) => a.order - b.order);

  return fields.length > 0 ? fields : DEFAULT_INTAKE_FIELDS;
}

export async function loadIntakeTemplate(): Promise<IntakeFormTemplate> {
  const { data, error } = await supabase
    .from("intake_form_templates")
    .select("id, fields, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      id: DEFAULT_INTAKE_TEMPLATE_ID,
      fields: DEFAULT_INTAKE_FIELDS,
    };
  }

  return {
    id: data.id,
    fields: normalizeFields(data.fields),
    updated_at: data.updated_at,
  };
}

export async function seedDefaultIntakeTemplate() {
  const { data: existing } = await supabase
    .from("intake_form_templates")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("intake_form_templates")
    .insert({
      id: DEFAULT_INTAKE_TEMPLATE_ID,
      fields: DEFAULT_INTAKE_FIELDS,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Intake template seed failed:", error.message);
    return null;
  }

  return data.id;
}

export async function saveIntakeTemplate(fields: IntakeFormField[]) {
  const template = await loadIntakeTemplate();

  const { error } = await supabase
    .from("intake_form_templates")
    .update({
      fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id);

  return { error };
}

export async function loadAthleteIntakeResponse(
  athleteId: string,
): Promise<AthleteIntakeResponse | null> {
  const { data, error } = await supabase
    .from("athlete_intake_responses")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    answers: (data.answers || {}) as Record<string, string>,
  };
}

export async function saveAthleteIntakeResponse(
  athleteId: string,
  answers: Record<string, string>,
  complete: boolean,
) {
  const now = new Date().toISOString();
  const existing = await loadAthleteIntakeResponse(athleteId);

  if (existing) {
    const { error: responseError } = await supabase
      .from("athlete_intake_responses")
      .update({
        answers,
        completed_at: complete ? now : existing.completed_at,
        updated_at: now,
      })
      .eq("athlete_id", athleteId);

    if (responseError) return { error: responseError };

    if (complete) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ intake_completed_at: now })
        .eq("id", athleteId);

      if (profileError) return { error: profileError };
    }

    return { error: null };
  }

  const { error: insertError } = await supabase
    .from("athlete_intake_responses")
    .insert({
      athlete_id: athleteId,
      answers,
      completed_at: complete ? now : null,
    });

  if (insertError) return { error: insertError };

  if (complete) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ intake_completed_at: now })
      .eq("id", athleteId);

    if (profileError) return { error: profileError };
  }

  return { error: null };
}

export function validateIntakeAnswers(
  fields: IntakeFormField[],
  answers: Record<string, string>,
) {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = (answers[field.key] || "").trim();

    if (field.required && !value) {
      errors[field.key] = "Dit veld is verplicht.";
      continue;
    }

    if (field.key === "no_steroids" && field.required && value !== "yes") {
      errors[field.key] = "Je moet bevestigen dat je geen anabole steroïden gebruikt.";
    }
  }

  return errors;
}

export function formatIntakeAnswer(field: IntakeFormField, value: string) {
  if (!value) return "—";

  if (field.type === "select" && field.options) {
    const match = field.options.find((option) => option.value === value);
    return match?.label || value;
  }

  if (field.type === "date" && value) {
    try {
      return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL");
    } catch {
      return value;
    }
  }

  return value;
}

export async function needsIntakeCompletion(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, intake_completed_at")
    .eq("id", userId)
    .single();

  if (error || !data) return false;

  return data.role === "atleet" && !data.intake_completed_at;
}
