import { getNavLinks, type NavLink } from "@/lib/navigation";

export type ChatToolItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "app" | "chat" | "programma";
  href?: string;
  chatKind?: "direct" | "group";
  targetId?: string;
};

export type ProgramBlockTool = {
  id: string;
  title: string;
  athleteName?: string;
};

const TOOLS_PREFIX = "/tools";

export function parseToolsCommand(message: string) {
  if (!message.startsWith(TOOLS_PREFIX)) {
    return { active: false, query: "" };
  }

  const rest = message.slice(TOOLS_PREFIX.length);
  const query = rest.startsWith(" ") ? rest.trimStart() : rest.trim();

  return { active: true, query };
}

export function buildAppToolItems(role: string, pendingCount = 0): ChatToolItem[] {
  return getNavLinks(role, pendingCount, 0)
    .filter((link) => link.href !== "/chat")
    .map((link: NavLink) => ({
      id: `app:${link.href}`,
      title: link.title,
      description: link.description,
      icon: link.icon,
      category: "app" as const,
      href: link.href,
    }));
}

export function buildChatToolItems(
  contacts: Array<{ id: string; full_name: string }>,
  groups: Array<{ id: string; name: string }>,
): ChatToolItem[] {
  const directItems: ChatToolItem[] = contacts.map((contact) => ({
    id: `chat:direct:${contact.id}`,
    title: contact.full_name,
    description: "Open chat",
    icon: "💬",
    category: "chat",
    chatKind: "direct",
    targetId: contact.id,
  }));

  const groupItems: ChatToolItem[] = groups.map((group) => ({
    id: `chat:group:${group.id}`,
    title: group.name,
    description: "Open groepschat",
    icon: "👥",
    category: "chat",
    chatKind: "group",
    targetId: group.id,
  }));

  return [...groupItems, ...directItems];
}

export function buildProgramToolItems(programs: ProgramBlockTool[]): ChatToolItem[] {
  return programs.map((program) => ({
    id: `program:${program.id}`,
    title: program.title,
    description: program.athleteName
      ? `Programma · ${program.athleteName}`
      : "Trainingsschema",
    icon: "🏋️",
    category: "programma",
    href: `/programs/${program.id}`,
  }));
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function filterChatTools(items: ChatToolItem[], query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystack = normalize(
      `${item.title} ${item.description} ${item.category}`,
    );
    return haystack.includes(normalizedQuery);
  });
}

export function groupChatToolsByCategory(items: ChatToolItem[]) {
  const order: ChatToolItem["category"][] = ["app", "chat", "programma"];
  const labels: Record<ChatToolItem["category"], string> = {
    app: "App",
    chat: "Chats",
    programma: "Programma's",
  };

  return order
    .map((category) => ({
      category,
      label: labels[category],
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}
