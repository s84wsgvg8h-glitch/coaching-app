"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getNavLinks } from "@/lib/navigation";
import { isCoachLikeRole } from "@/lib/authRoles";
import { useAuth } from "@/components/AuthProvider";
import { getDemoPages } from "@/lib/demo/demoPages";
import { getDemoPersona, isDemoMode } from "@/lib/demo/demoMode";
import { buildProgramWeekPath, resolveProgramEntryForAthlete } from "@/lib/programNavigation";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  group: string;
  keywords?: string;
};

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { role, userId } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [athletes, setAthletes] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const [programs, setPrograms] = useState<
    Array<{ athleteId: string; athleteName: string; href: string; label: string }>
  >([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(0);
      return;
    }

    async function loadData() {
      if (!userId || !isCoachLikeRole(role)) {
        setAthletes([]);
        setPrograms([]);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true })
        .limit(40);

      const athleteRows = data || [];
      setAthletes(athleteRows);

      const programItems: Array<{
        athleteId: string;
        athleteName: string;
        href: string;
        label: string;
      }> = [];

      for (const athlete of athleteRows.slice(0, 12)) {
        const { data: entry } = await resolveProgramEntryForAthlete(
          athlete.id,
          userId,
        );
        if (!entry) continue;
        programItems.push({
          athleteId: athlete.id,
          athleteName: athlete.full_name || "Atleet",
          href: buildProgramWeekPath(entry, { coachViewingAthlete: true }),
          label: `Programma — ${athlete.full_name || "Atleet"}`,
        });
      }

      setPrograms(programItems);
    }

    void loadData();
  }, [open, role, userId]);

  const items = useMemo<CommandItem[]>(() => {
    const nav = getNavLinks(role).map((item) => ({
      id: item.href,
      label: item.title,
      hint: item.description,
      href: item.href,
      group: "Pagina's",
      keywords: item.description,
    }));

    const quickActions: CommandItem[] = isCoachLikeRole(role)
      ? [
          {
            id: "qa-dashboard",
            label: "Open dashboard",
            href: "/dashboard",
            group: "Snelle acties",
          },
          {
            id: "qa-chat",
            label: "Open chat",
            href: "/chat",
            group: "Snelle acties",
          },
          {
            id: "qa-todo",
            label: "Nieuwe taak",
            href: "/todo",
            group: "Snelle acties",
          },
          {
            id: "qa-athletes",
            label: "Atleten / uitnodigen",
            href: "/athletes",
            group: "Snelle acties",
          },
          {
            id: "qa-competition",
            label: "Nieuwe wedstrijd",
            href: "/wedstrijd-kalender",
            group: "Snelle acties",
          },
        ]
      : [];

    const athleteItems = athletes.map((athlete) => ({
      id: `athlete-${athlete.id}`,
      label: athlete.full_name || "Atleet",
      hint: "Atleet hub",
      href: `/athletes/${athlete.id}`,
      group: "Atleten",
    }));

    const programItems = programs.map((program) => ({
      id: `program-${program.athleteId}`,
      label: program.label,
      hint: "Programma openen",
      href: program.href,
      group: "Programma's",
      keywords: program.athleteName,
    }));

    const demoBrowseItems: CommandItem[] = isDemoMode()
      ? getDemoPages(getDemoPersona()).map((page) => ({
          id: `demo-${page.href}`,
          label: page.label,
          hint: page.group,
          href: page.href,
          group: "Demo — alle pagina's",
          keywords: page.description,
        }))
      : [];

    const extraCoachPages: CommandItem[] = isCoachLikeRole(role)
      ? [
          { id: "/todo", label: "To-do", href: "/todo", group: "Pagina's" },
          { id: "/athletes", label: "Atleten", href: "/athletes", group: "Pagina's" },
          { id: "/chat", label: "Chat", href: "/chat", group: "Pagina's" },
          { id: "/video-review", label: "Video review", href: "/video-review", group: "Pagina's" },
          { id: "/planning", label: "Planning", href: "/planning", group: "Pagina's" },
          { id: "/meet-week", label: "Meet-week", href: "/meet-week", group: "Pagina's" },
          { id: "/betalingen", label: "Betalingen", href: "/betalingen", group: "Pagina's" },
          { id: "/agenda", label: "Agenda", href: "/agenda", group: "Pagina's" },
        ]
      : [];

    const extraAthletePages: CommandItem[] =
      !isCoachLikeRole(role) && role
        ? [
            { id: "/meet-week", label: "Meet-week", href: "/meet-week", group: "Pagina's" },
            { id: "/merch", label: "Merch", href: "/merch", group: "Pagina's" },
          ]
        : [];

    const mergedNav: CommandItem[] = [...nav];
    for (const extra of [...extraCoachPages, ...extraAthletePages]) {
      if (!mergedNav.some((item) => item.href === extra.href)) {
        mergedNav.push(extra);
      }
    }

    return [...quickActions, ...demoBrowseItems, ...mergedNav, ...athleteItems, ...programItems];
  }, [athletes, programs, role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint?.toLowerCase().includes(q) ||
        item.keywords?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  const run = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.href) router.push(item.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    setSelected(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, filtered.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      }

      if (event.key === "Enter" && filtered[selected]) {
        event.preventDefault();
        run(filtered[selected]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, onClose, open, selected, run]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="ui-command-overlay animate-fade-in fixed inset-0 z-[1000] flex items-start justify-center bg-black/55 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-command-panel animate-scale-in w-full max-w-xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <span className="text-[13px] font-medium text-app-subtle">⌘K</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek atleten, programma's, berichten, pagina's…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-app-text outline-none placeholder:text-app-subtle"
            aria-label="Zoeken"
          />
        </div>
        <ul className="max-h-[min(52vh,420px)] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-app-muted">
              Geen resultaten
            </li>
          ) : (
            filtered.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;

              return (
                <li key={item.id}>
                  {showGroup ? (
                    <p className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => run(item)}
                    className={`ui-command-item app-focus-ring ${
                      index === selected ? "ui-command-item-active" : ""
                    }`}
                  >
                    <span className="font-medium text-app-text">{item.label}</span>
                    {item.hint ? (
                      <span className="truncate text-[12px] text-app-muted">
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}
