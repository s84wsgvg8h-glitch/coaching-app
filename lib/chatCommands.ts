const TOOLS_PREFIX = "/tools";
const PROGRAM_PREFIX = "/program";
const BW_PREFIX = "/bw";
const RAW_DATA_PREFIX = "/raw";

function normalizeChatCommand(message: string) {
  return message.trim().replace(/^\/\s+/, "/");
}

function isRawDataCommand(message: string) {
  const normalized = normalizeChatCommand(message);
  return /^\/raw\s*data\b/i.test(normalized);
}

function isOtherSlashCommand(message: string, prefix: string) {
  const normalized = normalizeChatCommand(message);

  return (
    (prefix !== TOOLS_PREFIX && normalized.startsWith(TOOLS_PREFIX)) ||
    (prefix !== PROGRAM_PREFIX && normalized.startsWith(PROGRAM_PREFIX)) ||
    (prefix !== BW_PREFIX && normalized.startsWith(BW_PREFIX)) ||
    (prefix !== RAW_DATA_PREFIX && isRawDataCommand(normalized))
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

export function parseRawDataCommand(message: string) {
  const normalized = normalizeChatCommand(message);

  if (
    !isRawDataCommand(normalized) ||
    isOtherSlashCommand(normalized, RAW_DATA_PREFIX)
  ) {
    return { active: false, query: "" };
  }

  const rest = normalized.replace(/^\/raw\s*data/i, "");
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}
