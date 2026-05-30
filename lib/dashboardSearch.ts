import { isCoachLikeRole } from "@/lib/authRoles";
import { getNavLinks } from "@/lib/navigation";
import {
  CHAT_SLASH_COMMANDS,
  type ChatSlashCommand,
} from "@/lib/chatCommands";

export type DashboardSearchItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  kind: "page" | "command" | "athlete";
  href?: string;
  command?: string;
  requiresChat?: boolean;
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function buildDashboardSearchItems(
  role: string,
  pendingCount = 0,
  athletes: Array<{ id: string; full_name: string | null }> = [],
): DashboardSearchItem[] {
  const pages: DashboardSearchItem[] = getNavLinks(role, pendingCount, 0).map(
    (link) => ({
      id: `page:${link.href}`,
      title: link.title,
      description: link.description,
      icon: link.icon,
      kind: "page" as const,
      href: link.href,
    }),
  );

  const commands: DashboardSearchItem[] = CHAT_SLASH_COMMANDS.filter((command) => {
    if (command.coachOnly && !isCoachLikeRole(role)) return false;
    return true;
  }).map((command: ChatSlashCommand) => ({
    id: `command:${command.command}`,
    title: command.label,
    description: command.requiresDirectChat
      ? `${command.description} · open in chat`
      : command.description,
    icon: "⌘",
    kind: "command" as const,
    command: command.command,
    href: command.requiresDirectChat ? "/chat" : undefined,
    requiresChat: command.requiresDirectChat,
  }));

  const athleteItems: DashboardSearchItem[] = athletes.map((athlete) => ({
    id: `athlete:${athlete.id}`,
    title: athlete.full_name || "Naamloos",
    description: "Atleetprofiel openen",
    icon: "👤",
    kind: "athlete" as const,
    href: `/profile/${athlete.id}`,
  }));

  return [...pages, ...commands, ...athleteItems];
}

export function filterDashboardSearchItems(
  items: DashboardSearchItem[],
  query: string,
) {
  const trimmed = query.trim();
  if (!trimmed) return items.slice(0, 12);

  const normalizedQuery = normalize(trimmed);
  const isCommandQuery = normalizedQuery.startsWith("/");
  const searchTerm = isCommandQuery
    ? normalizedQuery.slice(1)
    : normalizedQuery;

  const pool = isCommandQuery
    ? items.filter((item) => item.kind === "command")
    : items;

  if (!searchTerm) {
    return pool.slice(0, 12);
  }

  return pool
    .filter((item) => {
      const haystack = normalize(
        `${item.title} ${item.description} ${item.command || ""} ${item.href || ""}`,
      );
      return haystack.includes(searchTerm);
    })
    .slice(0, 12);
}

export function resolveDashboardSearchSelection(item: DashboardSearchItem) {
  if (item.href) {
    return item.href;
  }

  if (item.command) {
    return `/chat?command=${encodeURIComponent(item.command)}`;
  }

  return null;
}
