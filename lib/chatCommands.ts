const TOOLS_PREFIX = "/tools";
const PROGRAM_PREFIX = "/program";
const BW_PREFIX = "/bw";
const DATA_PREFIX = "/data";
const INJURIES_PREFIX = "/injuries";

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

function isOtherSlashCommand(message: string, prefix: string) {
  const normalized = normalizeChatCommand(message);

  return (
    (prefix !== TOOLS_PREFIX && normalized.startsWith(TOOLS_PREFIX)) ||
    (prefix !== PROGRAM_PREFIX && normalized.startsWith(PROGRAM_PREFIX)) ||
    (prefix !== BW_PREFIX && normalized.startsWith(BW_PREFIX)) ||
    (prefix !== DATA_PREFIX &&
      (isDataCommand(normalized) || isLegacyRawDataCommand(normalized))) ||
    (prefix !== INJURIES_PREFIX && normalized.startsWith(INJURIES_PREFIX))
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
