"use client";

import "@/styles/todo-kanban.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import TodoComposer from "@/components/todo/TodoComposer";
import TodoKanbanCard from "@/components/todo/TodoKanbanCard";
import TodoKanbanColumn from "@/components/todo/TodoKanbanColumn";
import TodoSoundToggle from "@/components/todo/TodoSoundToggle";
import { resolveAthleteIdFromTodoTitle } from "@/lib/todoTitleSuggestions";
import { parseTodoInput } from "@/lib/todoTitleParser";
import { playTaskCompleteSound } from "@/lib/todo/playTaskCompleteSound";
import {
  TASK_COMPLETE_ANIMATION_MS,
  TASK_COMPLETE_SOUND_DELAY_MS,
  TASK_DONE_ENTER_MS,
  waitMs,
} from "@/lib/todo/taskCompletionTiming";
import { useTaskSoundPreference } from "@/hooks/useTaskSoundPreference";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  createCoachTodo,
  loadCoachTodosFast,
  syncCoachTodosInBackground,
  toggleCoachTodo,
  updateCoachTodoKanbanStatus,
  type CoachTodo,
  type CoachTodoKanbanStatus,
} from "@/lib/coachTodos";

const KANBAN_COLUMNS: Array<{
  id: CoachTodoKanbanStatus;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "todo",
    label: "Todo",
    icon: <ListTodo className="h-[18px] w-[18px] text-app-muted" aria-hidden="true" />,
  },
  {
    id: "doing",
    label: "Doing",
    icon: <Loader2 className="h-[18px] w-[18px] text-app-muted" aria-hidden="true" />,
  },
  {
    id: "done",
    label: "Done",
    icon: (
      <CheckCircle2
        className="h-[18px] w-[18px] text-[#3b82f6]"
        aria-hidden="true"
      />
    ),
  },
];

function sortTodosOpenFirst(items: CoachTodo[]) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
  });
}

function resolveKanbanStatus(todo: CoachTodo): CoachTodoKanbanStatus {
  if (todo.kanban_status) return todo.kanban_status;
  return todo.completed ? "done" : "todo";
}

function buildCompletedTodo(todo: CoachTodo): CoachTodo {
  return {
    ...todo,
    completed: true,
    kanban_status: "done",
    completed_at: todo.completed_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function TodoPage() {
  const [coachId, setCoachId] = useState("");
  const [todos, setTodos] = useState<CoachTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [completingTodoId, setCompletingTodoId] = useState<string | null>(null);
  const [enteringDoneIds, setEnteringDoneIds] = useState<Set<string>>(new Set());
  const [bumpDoneCount, setBumpDoneCount] = useState(false);
  const [athleteOptions, setAthleteOptions] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const [mobileKanbanColumn, setMobileKanbanColumn] =
    useState<CoachTodoKanbanStatus>("todo");

  const reducedMotion = usePrefersReducedMotion();
  const { soundEnabled, setSoundEnabled } = useTaskSoundPreference();
  const completionLockRef = useRef(false);

  const athleteNameById = useMemo(
    () =>
      Object.fromEntries(
        athleteOptions.map((athlete) => [athlete.id, athlete.full_name]),
      ),
    [athleteOptions],
  );

  const triggerDoneCountBump = useCallback(() => {
    if (reducedMotion) return;
    setBumpDoneCount(true);
    window.setTimeout(() => setBumpDoneCount(false), 380);
  }, [reducedMotion]);

  const markEnteringDone = useCallback((todoId: string) => {
    if (reducedMotion) return;
    setEnteringDoneIds((current) => new Set(current).add(todoId));
    window.setTimeout(() => {
      setEnteringDoneIds((current) => {
        const next = new Set(current);
        next.delete(todoId);
        return next;
      });
    }, TASK_DONE_ENTER_MS);
  }, [reducedMotion]);

  const runCompletionFeedback = useCallback(
    async (todo: CoachTodo) => {
      if (completionLockRef.current) return false;
      completionLockRef.current = true;

      const animationMs = reducedMotion ? 60 : TASK_COMPLETE_ANIMATION_MS;

      if (!reducedMotion) {
        setCompletingTodoId(todo.id);
      }

      if (soundEnabled && !reducedMotion) {
        window.setTimeout(() => playTaskCompleteSound(), TASK_COMPLETE_SOUND_DELAY_MS);
      }

      await waitMs(animationMs);
      setCompletingTodoId(null);
      markEnteringDone(todo.id);
      completionLockRef.current = false;
      return true;
    },
    [markEnteringDone, reducedMotion, soundEnabled],
  );

  useEffect(() => {
    document.title = "To-do";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      const admin = profile?.role === "admin";
      setCoachId(user.id);

      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      setAthleteOptions(athletes || []);

      const { data, error } = await loadCoachTodosFast(user.id, {
        includeOldCompleted: true,
      });
      if (error) {
        setErrorMessage(error.message);
        setTodos([]);
      } else {
        setTodos(data);
      }
      setLoading(false);

      setSyncing(true);
      void syncCoachTodosInBackground(user.id, admin).then(async () => {
        const refreshed = await loadCoachTodosFast(user.id, {
          includeOldCompleted: true,
        });
        if (!refreshed.error) setTodos(refreshed.data);
        setSyncing(false);
      });
    }

    void init();
  }, []);

  useEffect(() => {
    function handleSearch(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      setSearchQuery(typeof detail === "string" ? detail : "");
    }

    window.addEventListener("todo-search", handleSearch as EventListener);
    return () => window.removeEventListener("todo-search", handleSearch as EventListener);
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return sortTodosOpenFirst(
      todos.filter((todo) => todo.title.toLowerCase().includes(query)),
    );
  }, [searchQuery, todos]);

  const todosByColumn = useMemo(() => {
    const grouped: Record<CoachTodoKanbanStatus, CoachTodo[]> = {
      todo: [],
      doing: [],
      done: [],
    };

    for (const todo of todos) {
      if (completingTodoId === todo.id) {
        grouped[resolveKanbanStatus(todo)].push(todo);
        continue;
      }
      grouped[resolveKanbanStatus(todo)].push(todo);
    }

    return grouped;
  }, [completingTodoId, todos]);

  async function handleAdd() {
    const raw = newTitle.trim();
    if (!raw || !coachId || saving) return;

    const parsed = parseTodoInput(raw);
    if (!parsed.title) return;

    const athleteId = resolveAthleteIdFromTodoTitle(parsed.title, athleteOptions);

    setSaving(true);
    const { data, error } = await createCoachTodo(
      coachId,
      parsed.title,
      athleteId,
      parsed.dueAt,
    );
    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) setTodos((current) => [data, ...current]);
    setNewTitle("");
  }

  async function handleToggle(todo: CoachTodo) {
    if (completingTodoId === todo.id || completionLockRef.current) return;

    const isCompleting = !todo.completed;
    const snapshot = todos;

    if (isCompleting) {
      const played = await runCompletionFeedback(todo);
      if (!played) return;

      const optimistic = buildCompletedTodo(todo);
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? optimistic : item)),
      );
      triggerDoneCountBump();

      const { data, error } = await toggleCoachTodo(todo);
      if (error) {
        setErrorMessage(error.message);
        setTodos(snapshot);
        return;
      }
      if (data) {
        setTodos((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        );
      }
      return;
    }

    const optimistic: CoachTodo = {
      ...todo,
      completed: false,
      kanban_status: "todo",
      completed_at: null,
      updated_at: new Date().toISOString(),
    };
    setTodos((current) =>
      current.map((item) => (item.id === todo.id ? optimistic : item)),
    );

    const { data, error } = await toggleCoachTodo(todo);
    if (error) {
      setErrorMessage(error.message);
      setTodos(snapshot);
      return;
    }
    if (data) {
      setTodos((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    }
  }

  async function handleKanbanMove(
    todo: CoachTodo,
    status: CoachTodoKanbanStatus,
  ) {
    if (
      resolveKanbanStatus(todo) === status ||
      completingTodoId === todo.id ||
      completionLockRef.current
    ) {
      return;
    }

    const snapshot = todos;
    const isCompleting = status === "done" && !todo.completed;

    if (isCompleting) {
      const played = await runCompletionFeedback(todo);
      if (!played) return;

      const optimistic = buildCompletedTodo({ ...todo, kanban_status: "done" });
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? optimistic : item)),
      );
      triggerDoneCountBump();

      const { data, error } = await updateCoachTodoKanbanStatus(todo, status);
      if (error) {
        setErrorMessage(error.message);
        setTodos(snapshot);
        return;
      }
      if (data) {
        setTodos((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        );
      }
      return;
    }

    const optimistic: CoachTodo = {
      ...todo,
      kanban_status: status,
      completed: status === "done",
      completed_at:
        status === "done"
          ? todo.completed_at || new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    };
    setTodos((current) =>
      current.map((item) => (item.id === todo.id ? optimistic : item)),
    );

    const { data, error } = await updateCoachTodoKanbanStatus(todo, status);
    if (error) {
      setErrorMessage(error.message);
      setTodos(snapshot);
      return;
    }
    if (data) {
      setTodos((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    }
  }

  const cardProps = (todo: CoachTodo) => ({
    todo,
    coachId,
    athleteName: todo.athlete_id ? athleteNameById[todo.athlete_id] : null,
    onToggle: () => void handleToggle(todo),
    isCompleting: completingTodoId === todo.id,
    isEnteringDone: enteringDoneIds.has(todo.id),
    reducedMotion,
    toggleDisabled: Boolean(completingTodoId),
  });

  return (
    <AppShell>
      <PageContainer size="full" className="min-w-0">
        <PageHeader
          title="To-do"
          description="Taken, deadlines en automatische meldingen voor je atleten."
          actions={
            <TodoSoundToggle enabled={soundEnabled} onChange={setSoundEnabled} />
          }
        />

        <TodoComposer
          value={newTitle}
          onChange={setNewTitle}
          onSubmit={() => void handleAdd()}
          saving={saving}
          athleteOptions={athleteOptions}
        />

        {errorMessage ? (
          <p className="mt-3 text-[13px] text-app-destructive">{errorMessage}</p>
        ) : null}
        {syncing ? (
          <p className="mt-2 text-[12px] text-app-muted">
            Automatische taken worden bijgewerkt…
          </p>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-app-border bg-app-surface p-4">
            <SkeletonList rows={6} />
          </div>
        ) : isSearching ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
            <div className="border-b border-app-border px-4 py-3">
              <h2 className="text-[13px] font-semibold text-app-text">
                Zoekresultaten ({searchResults.length})
              </h2>
            </div>
            {searchResults.length === 0 ? (
              <EmptyState
                title="Geen resultaten"
                description="Probeer een andere zoekterm."
                compact
              />
            ) : (
              <div className="space-y-2 p-3 pb-4">
                {searchResults.map((todo) => (
                  <TodoKanbanCard key={todo.id} {...cardProps(todo)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className="todo-kanban-mobile-tabs lg:hidden"
              role="tablist"
              aria-label="Kanban kolommen"
            >
              {KANBAN_COLUMNS.map((column) => {
                const count = todosByColumn[column.id].length;
                const active = mobileKanbanColumn === column.id;

                return (
                  <button
                    key={column.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`todo-kanban-mobile-tab ${active ? "is-active" : ""}`}
                    onClick={() => setMobileKanbanColumn(column.id)}
                  >
                    {column.label}
                    <span className="todo-kanban-mobile-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div
              className="todo-kanban-board mt-4"
              data-mobile-column={mobileKanbanColumn}
            >
            {KANBAN_COLUMNS.map((column) => {
              const items = todosByColumn[column.id];

              return (
                <TodoKanbanColumn
                  key={column.id}
                  status={column.id}
                  label={column.label}
                  count={items.length}
                  icon={column.icon}
                  showDoingMotivation={column.id === "doing"}
                  countBump={column.id === "done" && bumpDoneCount}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const todoId = event.dataTransfer.getData("text/todo-id");
                    const todo = todos.find((item) => item.id === todoId);
                    if (todo) void handleKanbanMove(todo, column.id);
                  }}
                >
                  {items.map((todo) => (
                    <TodoKanbanCard
                      key={todo.id}
                      {...cardProps(todo)}
                      draggable={!completingTodoId}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/todo-id", todo.id);
                      }}
                    />
                  ))}
                </TodoKanbanColumn>
              );
            })}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
