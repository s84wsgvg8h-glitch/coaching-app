"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListTodo, Plus, X } from "lucide-react";
import {
  createCoachTodo,
  deleteCoachTodo,
  isRecentCompletedTodo,
  loadCoachTodosFast,
  toggleCoachTodo,
  type CoachTodo,
} from "@/lib/coachTodos";
import CoachTodoRow from "@/components/coach/CoachTodoRow";
import TodoDueQuickPicker, {
  dueAtFromPreset,
  type TodoDuePreset,
} from "@/components/coach/TodoDueQuickPicker";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";
import { supabase } from "@/lib/supabaseClient";
import {
  getTodoTitleSuggestions,
  resolveAthleteIdFromTodoTitle,
} from "@/lib/todoTitleSuggestions";
import { parseTodoInput } from "@/lib/todoTitleParser";

type ChatTodoPanelProps = {
  coachId: string;
  onClose: () => void;
};

export default function ChatTodoPanel({ coachId, onClose }: ChatTodoPanelProps) {
  const [todos, setTodos] = useState<CoachTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDuePreset, setNewDuePreset] = useState<TodoDuePreset>("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [athleteOptions, setAthleteOptions] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void refreshTodos();
  }, [coachId]);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "atleet")
      .eq("coach_id", coachId)
      .order("full_name", { ascending: true })
      .then(({ data }) => setAthleteOptions(data || []));
  }, [coachId]);

  const titleSuggestions = useMemo(
    () => getTodoTitleSuggestions(newTitle, athleteOptions),
    [newTitle, athleteOptions],
  );

  async function refreshTodos() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await loadCoachTodosFast(coachId);

    if (error) {
      setErrorMessage(error.message);
      setTodos([]);
    } else {
      setTodos(data);
    }

    setLoading(false);
  }

  async function handleAddTodo() {
    const raw = newTitle.trim();
    if (!raw || saving) return;

    const parsed = parseTodoInput(raw);
    if (!parsed.title) return;

    const athleteId = resolveAthleteIdFromTodoTitle(parsed.title, athleteOptions);
    const dueAt = parsed.dueAt || dueAtFromPreset(newDuePreset);

    setSaving(true);
    setErrorMessage("");

    const { data, error } = await createCoachTodo(
      coachId,
      parsed.title,
      athleteId,
      dueAt,
    );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      setTodos((current) => [data, ...current]);
    }

    setNewTitle("");
    setNewDuePreset("");
    inputRef.current?.focus();
  }

  async function handleToggleTodo(todo: CoachTodo) {
    const { data, error } = await toggleCoachTodo(todo);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      setTodos((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    }
  }

  async function handleDeleteTodo(todoId: string) {
    const { error } = await deleteCoachTodo(todoId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTodos((current) => current.filter((item) => item.id !== todoId));
  }

  const openTodos = todos.filter((todo) => !todo.completed);
  const doneTodos = todos.filter(
    (todo) => todo.completed && isRecentCompletedTodo(todo),
  );

  return (
    <aside
      className={`${CHAT_SIDE_PANEL_CLASS} max-md:fixed max-md:inset-0 max-md:z-[70] max-md:w-full max-md:max-w-none max-md:border-r-0`}
    >
      <div className="chat-panel-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-app-accent" />
            <h2 className="chat-panel-title truncate">Todo&apos;s</h2>
          </div>
          <p className="chat-panel-subtitle truncate">
            Persoonlijke coach-taken
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn app-focus-ring"
          aria-label="Todo sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="chat-panel-body mobile-scroll">
        {errorMessage ? (
          <p className="mb-3 rounded-xl border border-app-destructive/30 bg-app-destructive/10 px-3 py-2 text-sm text-app-destructive">
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="chat-empty">Todo&apos;s laden...</p>
        ) : todos.length === 0 ? (
          <div className="chat-card border-dashed">
            <p className="font-semibold text-app-text">Nog geen todo&apos;s</p>
            <p className="mt-2 text-[13px] text-app-muted">
              Voeg taken toe die je wilt bijhouden tijdens het chatten.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {openTodos.length > 0 ? (
              <section>
                <p className="chat-section-label">
                  Open ({openTodos.length})
                </p>
                <div className="space-y-2">
                  {openTodos.map((todo) => (
                    <CoachTodoRow
                      key={todo.id}
                      todo={todo}
                      coachId={coachId}
                      onToggle={() => void handleToggleTodo(todo)}
                      onDelete={() => void handleDeleteTodo(todo.id)}
                      onUpdated={(updated) =>
                        setTodos((current) =>
                          current.map((item) =>
                            item.id === updated.id ? updated : item,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {doneTodos.length > 0 ? (
              <section>
                <p className="chat-section-label">
                  Afgerond ({doneTodos.length})
                </p>
                <div className="space-y-2">
                  {doneTodos.map((todo) => (
                    <CoachTodoRow
                      key={todo.id}
                      todo={todo}
                      coachId={coachId}
                      showDueEditor={false}
                      onToggle={() => void handleToggleTodo(todo)}
                      onDelete={() => void handleDeleteTodo(todo.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <div className="chat-panel-footer">
        <TodoDueQuickPicker
          value={newDuePreset}
          onChange={setNewDuePreset}
          className="mb-2"
        />
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddTodo();
                }
              }}
              placeholder='Nieuwe taak — bv. "programma maken voor ..."'
              className="ui-auth-input w-full px-3 py-2.5 text-[13px]"
            />
            {titleSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-lg">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setNewTitle(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-app-text hover:bg-app-surface-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={saving || !newTitle.trim()}
            onClick={() => void handleAddTodo()}
            className="app-btn-primary inline-flex h-10 w-10 shrink-0 items-center justify-center disabled:opacity-50"
            aria-label="Taak toevoegen"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
