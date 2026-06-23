import { supabase } from "@/lib/supabaseClient";

export type CompetitionChecklistItem = {
  id: string;
  label: string;
  note?: string;
  emphasis?: boolean;
};

export type CompetitionChecklistSection = {
  id: string;
  title: string;
  items: CompetitionChecklistItem[];
};

export const COMPETITION_CHECKLIST: CompetitionChecklistSection[] = [
  {
    id: "general",
    title: "Algemeen",
    items: [
      {
        id: "id-card",
        label: "ID-kaart / paspoort",
        note: "Rijbewijs is niet voldoende",
        emphasis: true,
      },
    ],
  },
  {
    id: "clothing",
    title: "Kleding",
    items: [
      { id: "singlet", label: "Singlet", note: "IPF-goedgekeurd" },
      {
        id: "competition-tshirt",
        label: "Wedstrijd T-shirt",
        note: "100% katoen of IPF-goedgekeurd",
      },
      { id: "underwear", label: "Ondergoed", note: "100% katoen" },
      { id: "socks", label: "Sokken" },
      { id: "deadlift-socks", label: "Deadlift sokken" },
    ],
  },
  {
    id: "equipment",
    title: "Equipment",
    items: [
      { id: "belt", label: "Riem", note: "IPF-goedgekeurd" },
      { id: "knee-sleeves", label: "Knie sleeves", note: "IPF-goedgekeurd" },
      { id: "wrist-wraps", label: "Pols wraps", note: "IPF-goedgekeurd" },
    ],
  },
  {
    id: "footwear",
    title: "Schoenen",
    items: [
      { id: "squat-shoes", label: "Squat" },
      { id: "bench-shoes", label: "Bench press" },
      { id: "deadlift-shoes", label: "Deadlift" },
    ],
  },
  {
    id: "nutrition",
    title: "Voeding / hydratatie",
    items: [
      {
        id: "post-weigh-in-meal",
        label: "Maaltijd na wegen",
        note: "Makkelijk verteerbare koolhydraten",
      },
      {
        id: "enough-food",
        label: "Genoeg eten voor de duur van de wedstrijd",
      },
      { id: "utensils", label: "Bestek" },
      { id: "water", label: "Water" },
      { id: "caffeine", label: "Cafeïne" },
      { id: "oral-rehydration", label: "Orale rehydratatiezout" },
      {
        id: "sports-drink",
        label: "Sport- of electrolytedrank",
        note: "Optioneel",
      },
    ],
  },
  {
    id: "after-competition",
    title: "Na de wedstrijd",
    items: [
      { id: "joggers", label: "Lange joggingbroek" },
      { id: "extra-tshirt", label: "Extra T-shirt" },
    ],
  },
  {
    id: "handy",
    title: "Niet verplicht, wel handig",
    items: [
      { id: "headphones", label: "Koptelefoon" },
      { id: "powerbank", label: "Powerbank / telefoonoplader" },
      {
        id: "extra-underwear",
        label: "Extra ondergoed",
        note: "Voor als het misgaat",
      },
      { id: "towel", label: "Handdoek" },
      { id: "pen", label: "Pen", note: "Meerdere" },
      { id: "babypowder", label: "Talkpoeder" },
      { id: "chalk", label: "(Vloeibare) chalk" },
      { id: "sports-tape", label: "Sporttape" },
      { id: "ibuprofen", label: "Ibuprofen" },
      {
        id: "antacids",
        label: "Maagzuurremmers",
        note: "Zoals Gaviscon of Rennie",
      },
      {
        id: "warmup-equipment",
        label: "Warm-up materiaal",
        note: "Foamroller, weerstandsband, etc.",
      },
    ],
  },
  {
    id: "optional",
    title: "Optioneel",
    items: [
      { id: "sports-bra", label: "Sportbeha" },
      { id: "hair-tie", label: "Haarelastiek" },
      { id: "smelling-salts", label: "Ruikzout" },
      { id: "mouthpiece", label: "Mondstuk" },
      { id: "scale", label: "Weegschaal" },
    ],
  },
];

export function getCompetitionChecklistStorageKey(userId: string) {
  return `competition-checklist:${userId}`;
}

export const DEFAULT_CHECKLIST_TEMPLATE_ID =
  "b0000000-0000-4000-8000-000000000001";

function normalizeSections(raw: unknown): CompetitionChecklistSection[] {
  if (!Array.isArray(raw)) return COMPETITION_CHECKLIST;

  const sections = raw
    .filter((item): item is CompetitionChecklistSection => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as CompetitionChecklistSection).id === "string" &&
        typeof (item as CompetitionChecklistSection).title === "string" &&
        Array.isArray((item as CompetitionChecklistSection).items)
      );
    })
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          typeof item.id === "string" && typeof item.label === "string",
      ),
    }))
    .filter((section) => section.items.length > 0);

  return sections.length > 0 ? sections : COMPETITION_CHECKLIST;
}

export async function loadCompetitionChecklistTemplate(athleteId?: string | null) {
  if (athleteId) {
    const { data: athleteTemplate } = await supabase
      .from("athlete_checklist_templates")
      .select("sections, updated_at")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (athleteTemplate?.sections) {
      return {
        id: `athlete-${athleteId}`,
        sections: normalizeSections(athleteTemplate.sections),
        updated_at: athleteTemplate.updated_at,
        scope: "athlete" as const,
      };
    }
  }

  const { data, error } = await supabase
    .from("competition_checklist_templates")
    .select("id, sections, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      id: DEFAULT_CHECKLIST_TEMPLATE_ID,
      sections: COMPETITION_CHECKLIST,
      scope: "global" as const,
    };
  }

  return {
    id: data.id,
    sections: normalizeSections(data.sections),
    updated_at: data.updated_at,
    scope: "global" as const,
  };
}

export async function saveAthleteChecklistTemplate(
  athleteId: string,
  sections: CompetitionChecklistSection[],
) {
  const { error } = await supabase.from("athlete_checklist_templates").upsert(
    {
      athlete_id: athleteId,
      sections,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" },
  );

  return { error };
}

export async function clearAthleteChecklistTemplate(athleteId: string) {
  const { error } = await supabase
    .from("athlete_checklist_templates")
    .delete()
    .eq("athlete_id", athleteId);

  return { error };
}

export async function saveCompetitionChecklistTemplate(
  sections: CompetitionChecklistSection[],
) {
  const template = await loadCompetitionChecklistTemplate();

  const { error } = await supabase
    .from("competition_checklist_templates")
    .update({
      sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id);

  if (error) {
    const { error: insertError } = await supabase
      .from("competition_checklist_templates")
      .insert({
        id: DEFAULT_CHECKLIST_TEMPLATE_ID,
        sections,
      });

    return { error: insertError };
  }

  return { error: null };
}

export function getAllChecklistItemIds(sections: CompetitionChecklistSection[]) {
  return sections.flatMap((section) => section.items.map((item) => item.id));
}

export function readChecklistProgress(
  userId: string,
  sections: CompetitionChecklistSection[],
) {
  if (typeof window === "undefined") {
    return { checkedCount: 0, totalCount: 0 };
  }

  try {
    const raw = localStorage.getItem(getCompetitionChecklistStorageKey(userId));
    const checked = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const allItems = sections.flatMap((section) => section.items);
    const checkedCount = allItems.filter((item) => checked[item.id]).length;
    return { checkedCount, totalCount: allItems.length };
  } catch {
    const allItems = sections.flatMap((section) => section.items);
    return { checkedCount: 0, totalCount: allItems.length };
  }
}
