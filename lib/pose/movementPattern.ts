export type MovementPattern =
  | "knee"
  | "hip"
  | "elbow"
  | "shoulder"
  | "ankle"
  | "auto";

export type PoseChannel = Exclude<MovementPattern, "auto">;

const RULES: Array<{ pattern: PoseChannel; test: RegExp }> = [
  {
    pattern: "hip",
    test: /hip\s*-?\s*thrust|glute\s*-?\s*bridge|heupstoot|hipthrust/i,
  },
  {
    pattern: "ankle",
    test: /\bcalves\b|\bcalf\b|kuit|heel\s*raise/i,
  },
  {
    pattern: "knee",
    test: /leg\s*curl|hamstring|beenkrul|lying\s*leg\s*curl|seated\s*leg\s*curl/i,
  },
  {
    pattern: "knee",
    test: /leg\s*extension|knee\s*extension|beenstrekking/i,
  },
  {
    pattern: "shoulder",
    test: /lateral\s*raise|front\s*raise|rear\s*delt|side\s*raise|chest\s*fly|pec\s*deck|\bflye?s?\b|zijwaarts/i,
  },
  {
    pattern: "knee",
    test: /squat|lunge|split\s*squat|bulgarian|uitval|step[-\s]?up|leg\s*press|hack|goblet|kniebuig|thruster/i,
  },
  {
    pattern: "hip",
    test: /deadlift|dead\s*lift|\brdl\b|romanian|good\s*morning|stiff[-\s]?leg|straight[-\s]?leg|\bsumo\b|rack\s*pull|block\s*pull|deficit|trap\s*bar|heupstrek/i,
  },
  {
    pattern: "elbow",
    test: /bench|bankdruk|bank\s*druk|overhead|\bohp\b|shoulder\s*press|push\s*press|military|floor\s*press|push[-\s]?up|\bdips?\b|pull[-\s]?up|chin[-\s]?up|pulldown|lat\s*pull|\bpulls?\b|optrek|\brows?\b|roeien|\bcurls?\b|bicep|tricep|skull|pushdown|\bpress\b/i,
  },
];

export function classifyMovement(exerciseName: string | null | undefined): MovementPattern {
  const name = (exerciseName || "").trim();
  if (!name) return "auto";

  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.pattern;
  }

  return "auto";
}

export function channelLabel(channel: PoseChannel | null): string {
  switch (channel) {
    case "knee":
      return "Knie";
    case "hip":
      return "Heup";
    case "elbow":
      return "Elleboog";
    case "shoulder":
      return "Schouder";
    case "ankle":
      return "Enkel";
    default:
      return "Beweging";
  }
}
