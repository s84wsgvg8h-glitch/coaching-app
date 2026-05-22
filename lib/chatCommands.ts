const TOOLS_PREFIX = "/tools";
const PROGRAM_PREFIX = "/program";

export function parseToolsCommand(message: string) {
  if (!message.startsWith(TOOLS_PREFIX) || message.startsWith(PROGRAM_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(TOOLS_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function parseProgramCommand(message: string) {
  if (!message.startsWith(PROGRAM_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(PROGRAM_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}
