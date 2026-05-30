const TOOLS_PREFIX = "/tools";
const PROGRAM_PREFIX = "/program";
const BW_PREFIX = "/bw";
const EXTERNALS_PREFIX = "/externals";
const VOLUME_PREFIX = "/volume";
const INTENSITY_PREFIX = "/intensity";
const MAX_PREFIX = "/max";
const LEGACY_PR_PREFIX = "/pr";
const DATA_PREFIX = "/data";
const INJURIES_PREFIX = "/injuries";
const AI_PREFIX = "/ai";
const TODO_PREFIX = "/todo";
const AGENDA_PREFIX = "/agenda";

export type ChatSlashCommand = {
  command: string;
  label: string;
  description: string;
  coachOnly?: boolean;
  requiresDirectChat?: boolean;
};

export const CHAT_SLASH_COMMANDS: ChatSlashCommand[] = [
  {
    command: TOOLS_PREFIX,
    label: "Tools",
    description: "Zoek pagina's, chats en programma's",
  },
  {
    command: PROGRAM_PREFIX,
    label: "Programma",
    description: "Programma van atleet bekijken",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: BW_PREFIX,
    label: "BW",
    description: "Lichaamsgewicht grafiek",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: EXTERNALS_PREFIX,
    label: "Externals",
    description: "Check-in herstel en fatigue",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: VOLUME_PREFIX,
    label: "Volume",
    description: "SBD sets en reps",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: INTENSITY_PREFIX,
    label: "Intensiteit",
    description: "SBD intensiteit en piek load",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: MAX_PREFIX,
    label: "Max",
    description: "Max-lijst SBD",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: DATA_PREFIX,
    label: "Data",
    description: "Ruwe atleetdata bekijken",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: INJURIES_PREFIX,
    label: "Blessures",
    description: "Blessures en spierkaart",
    coachOnly: true,
    requiresDirectChat: true,
  },
  {
    command: AI_PREFIX,
    label: "AI",
    description: "Stel vragen aan de coaching-assistent",
    requiresDirectChat: true,
  },
  {
    command: TODO_PREFIX,
    label: "Todo",
    description: "Open je persoonlijke todo-lijst",
    coachOnly: true,
  },
  {
    command: AGENDA_PREFIX,
    label: "Agenda",
    description: "Agenda-items voor deze atleet beheren",
    coachOnly: true,
    requiresDirectChat: true,
  },
];

export function filterChatSlashCommands(
  input: string,
  options: {
    userRole: string;
    hasDirectChat: boolean;
    hasConversation: boolean;
  },
) {
  const normalized = normalizeChatCommand(input).toLowerCase();

  if (!normalized.startsWith("/")) {
    return [] as ChatSlashCommand[];
  }

  return CHAT_SLASH_COMMANDS.filter((item) => {
    if (item.coachOnly && options.userRole !== "coach") return false;
    if (item.requiresDirectChat && !options.hasDirectChat) return false;
    if (!options.hasConversation) return false;
    return item.command.startsWith(normalized);
  });
}

export function shouldShowSlashCommandMenu(message: string) {
  const normalized = normalizeChatCommand(message);
  return normalized.startsWith("/") && !normalized.slice(1).includes(" ");
}

function normalizeChatCommand(message: string) {
  return message.trim().replace(/^\/\s+/, "/");
}

function isDataCommand(message: string) {
  const normalized = normalizeChatCommand(message);
  return (
    normalized.startsWith(DATA_PREFIX) &&
    (normalized.length === DATA_PREFIX.length ||
      normalized.charAt(DATA_PREFIX.length) === " ")
  );
}

function isLegacyRawDataCommand(message: string) {
  const normalized = normalizeChatCommand(message);
  return /^\/raw\s*data\b/i.test(normalized) || /^\/rawdata\b/i.test(normalized);
}

function isMaxCommand(message: string) {
  const normalized = normalizeChatCommand(message);
  return (
    normalized.startsWith(MAX_PREFIX) &&
    (normalized.length === MAX_PREFIX.length ||
      normalized.charAt(MAX_PREFIX.length) === " ")
  );
}

function isLegacyPrCommand(message: string) {
  const normalized = normalizeChatCommand(message);
  return (
    normalized.startsWith(LEGACY_PR_PREFIX) &&
    (normalized.length === LEGACY_PR_PREFIX.length ||
      normalized.charAt(LEGACY_PR_PREFIX.length) === " ")
  );
}

function isOtherSlashCommand(message: string, prefix: string) {
  const normalized = normalizeChatCommand(message);

  return (
    (prefix !== TOOLS_PREFIX && normalized.startsWith(TOOLS_PREFIX)) ||
    (prefix !== PROGRAM_PREFIX && normalized.startsWith(PROGRAM_PREFIX)) ||
    (prefix !== BW_PREFIX && normalized.startsWith(BW_PREFIX)) ||
    (prefix !== EXTERNALS_PREFIX && normalized.startsWith(EXTERNALS_PREFIX)) ||
    (prefix !== VOLUME_PREFIX && normalized.startsWith(VOLUME_PREFIX)) ||
    (prefix !== INTENSITY_PREFIX && normalized.startsWith(INTENSITY_PREFIX)) ||
    (prefix !== MAX_PREFIX &&
      (isMaxCommand(normalized) || isLegacyPrCommand(normalized))) ||
    (prefix !== DATA_PREFIX &&
      (isDataCommand(normalized) || isLegacyRawDataCommand(normalized))) ||
    (prefix !== INJURIES_PREFIX && normalized.startsWith(INJURIES_PREFIX)) ||
    (prefix !== AI_PREFIX && normalized.startsWith(AI_PREFIX)) ||
    (prefix !== TODO_PREFIX && normalized.startsWith(TODO_PREFIX)) ||
    (prefix !== AGENDA_PREFIX && normalized.startsWith(AGENDA_PREFIX))
  );
}

export function parseToolsCommand(message: string) {
  if (!message.startsWith(TOOLS_PREFIX) || isOtherSlashCommand(message, TOOLS_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(TOOLS_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseProgramCommand(message: string) {
  if (!message.startsWith(PROGRAM_PREFIX) || isOtherSlashCommand(message, PROGRAM_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(PROGRAM_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseBwCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(BW_PREFIX) ||
    isOtherSlashCommand(normalized, BW_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(BW_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseExternalsCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(EXTERNALS_PREFIX) ||
    isOtherSlashCommand(normalized, EXTERNALS_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(EXTERNALS_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseVolumeCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(VOLUME_PREFIX) ||
    isOtherSlashCommand(normalized, VOLUME_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(VOLUME_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseIntensityCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(INTENSITY_PREFIX) ||
    isOtherSlashCommand(normalized, INTENSITY_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(INTENSITY_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseMaxCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (isMaxCommand(normalized) && !isOtherSlashCommand(normalized, MAX_PREFIX)) {
    const rest = normalized.slice(MAX_PREFIX.length);
    const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();
    return { active: true, query };
  }

  if (
    isLegacyPrCommand(normalized) &&
    !isOtherSlashCommand(normalized, MAX_PREFIX)
  ) {
    const rest = normalized.slice(LEGACY_PR_PREFIX.length);
    const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();
    return { active: true, query };
  }

  return { active: false, query: "" };
}

/** @deprecated Use parseMaxCommand instead. */
export function parsePrCommand(message: string) {
  return parseMaxCommand(message);
}

export function parseDataCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (isDataCommand(normalized) && !isOtherSlashCommand(normalized, DATA_PREFIX)) {
    const rest = normalized.slice(DATA_PREFIX.length);
    const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();
    return { active: true, query };
  }

  if (
    isLegacyRawDataCommand(normalized) &&
    !isOtherSlashCommand(normalized, DATA_PREFIX)
  ) {
    const rest = normalized.replace(/^\/raw\s*data/i, "").replace(/^\/rawdata/i, "");
    const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();
    return { active: true, query };
  }

  return { active: false, query: "" };
}

/** @deprecated Use parseDataCommand instead. */
export function parseRawDataCommand(message: string) {
  return parseDataCommand(message);
}

export function parseInjuriesCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(INJURIES_PREFIX) ||
    isOtherSlashCommand(normalized, INJURIES_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(INJURIES_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseAiCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (!normalized.startsWith(AI_PREFIX) || isOtherSlashCommand(normalized, AI_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(AI_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseAgendaCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(AGENDA_PREFIX) ||
    isOtherSlashCommand(normalized, AGENDA_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(AGENDA_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseTodoCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !normalized.startsWith(TODO_PREFIX) ||
    isOtherSlashCommand(normalized, TODO_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.slice(TODO_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}
