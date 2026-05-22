const TOOLS_PREFIX = "/tools";
const PROGRAM_PREFIX = "/program";
const BW_PREFIX = "/bw";

function isOtherSlashCommand(message: string, prefix: string) {
  return (
    (prefix !== TOOLS_PREFIX && message.startsWith(TOOLS_PREFIX)) ||
    (prefix !== PROGRAM_PREFIX && message.startsWith(PROGRAM_PREFIX)) ||
    (prefix !== BW_PREFIX && message.startsWith(BW_PREFIX))
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
  if (!message.startsWith(BW_PREFIX) || isOtherSlashCommand(message, BW_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(BW_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}
