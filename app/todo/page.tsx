"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SkeletonList } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  createCoachTodo,
  deleteCoachTodo,
  loadCoachTodos,
  toggleCoachTodo,
  type CoachTodo,
} from "@/lib/coachTodos";

export default function TodoPage() {
  const [coachId, setCoachId] = useState("");
  const [todos, setTodos] = useState<CoachTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

      setCoachId(user.id);
      await refreshTodos(user.id, profile?.role === "admin");
    }

    void init();
  }, []);

  async function refreshTodos(id: string, isAdmin: boolean) {
    setLoading(true);
    const { data, error } = await loadCoachTodos(id, isAdmin);
    if (error) {
      setErrorMessage(error.message);
      setTodos([]);
    } else {
      setTodos(data);
    }
    setLoading(false);
  }

  const openTodos = useMemo(
    () => todos.filter((todo) => !todo.completed),
    [todos],
  );
  const doneTodos = useMemo(
    () => todos.filter((todo) => todo.completed),
    [todos],
  );

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title || !coachId || saving) return;

    setSaving(true);
    const { data, error } = await createCoachTodo(coachId, title);
    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) setTodos((current) => [data, ...current]);
    setNewTitle("");
    inputRef.current?.focus();
  }

  async function handleToggle(todo: CoachTodo) {
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

  async function handleDelete(todoId: string) {
    const { error } = await deleteCoachTodo(todoId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setTodos((current) => current.filter((item) => item.id !== todoId));
  }

  function renderTodo(todo: CoachTodo) {
    const isAuto = todo.kind === "program_needed";

    return (
      <li
        key={todo.id}
        className={`flex items-start gap-3 border-b border-app-border px-4 py-2.5 last:border-b-0 ${
          todo.completed ? "opacity-60" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => void handleToggle(todo)}
          className="mt-1 h-4 w-4 accent-brand-purple"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              todo.completed ? "line-through text-app-muted" : "text-app-text"
            }`}
          >
            {todo.title}
          </p>
          {isAuto && todo.athlete_id && (
            <Link
              href={`/profile/${todo.athlete_id}?section=programs`}
              className="text-xs font-semibold text-brand-purple hover:underline"
            >
              Naar programma →
            </Link>
          )}
        </div>
        {!isAuto && (
          <button
            type="button"
            onClick={() => void handleDelete(todo.id)}
            className="rounded p-1 text-app-muted hover:text-red-500 app-focus-ring"
            aria-label="Verwijderen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </li>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-app-text">To-do</h1>
        <p className="mt-1 text-sm text-app-muted">
          Taken en automatische meldingen wanneer een block is afgelopen.
        </p>

        <div className="app-card mt-6">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleAdd();
              }}
              placeholder="Nieuwe taak..."
              className="flex-1 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm outline-none app-focus-ring"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={saving || !newTitle.trim()}
              className="app-btn-primary inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Toevoegen
            </button>
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm text-red-500">{errorMessage}</p>
          )}
        </div>

        {loading ? (
          <div className="app-card mt-4">
            <SkeletonList rows={6} />
          </div>
        ) : (
          <>
            <section className="app-card mt-4 overflow-hidden p-0">
              <h2 className="border-b border-app-border px-4 py-3 text-sm font-bold uppercase tracking-wide text-app-muted">
                Open ({openTodos.length})
              </h2>
              {openTodos.length === 0 ? (
                <p className="px-4 py-6 text-sm text-app-muted">
                  Geen openstaande taken.
                </p>
              ) : (
                <ul>{openTodos.map(renderTodo)}</ul>
              )}
            </section>

            {doneTodos.length > 0 && (
              <section className="app-card mt-4 overflow-hidden p-0">
                <h2 className="border-b border-app-border px-4 py-3 text-sm font-bold uppercase tracking-wide text-app-muted">
                  Afgerond ({doneTodos.length})
                </h2>
                <ul>{doneTodos.map(renderTodo)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
