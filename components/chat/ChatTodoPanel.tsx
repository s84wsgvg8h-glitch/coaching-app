"use client";

import { useEffect, useRef, useState } from "react";
import { ListTodo, Plus, Trash2, X } from "lucide-react";
import {
  createCoachTodo,
  deleteCoachTodo,
  loadCoachTodos,
  toggleCoachTodo,
  type CoachTodo,
} from "@/lib/coachTodos";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatTodoPanelProps = {
  coachId: string;
  onClose: () => void;
};

export default function ChatTodoPanel({ coachId, onClose }: ChatTodoPanelProps) {
  const [todos, setTodos] = useState<CoachTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void refreshTodos();
  }, [coachId]);

  async function refreshTodos() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await loadCoachTodos(coachId);

    if (error) {
      setErrorMessage(error.message);
      setTodos([]);
    } else {
      setTodos(data);
    }

    setLoading(false);
  }

  async function handleAddTodo() {
    const title = newTitle.trim();
    if (!title || saving) return;

    setSaving(true);
    setErrorMessage("");

    const { data, error } = await createCoachTodo(coachId, title);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      setTodos((current) => [data, ...current]);
    }

    setNewTitle("");
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
  const doneTodos = todos.filter((todo) => todo.completed);

  return (
    <aside
      className={`${CHAT_SIDE_PANEL_CLASS} max-md:fixed max-md:inset-0 max-md:z-[70] max-md:w-full max-md:max-w-none max-md:border-r-0`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-600" />
            <h2 className="truncate text-base font-bold text-black">Todo&apos;s</h2>
          </div>
          <p className="truncate text-xs text-gray-500">
            Persoonlijke coach-taken
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 hover:bg-gray-100"
          aria-label="Todo sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 mobile-scroll">
        {errorMessage ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-500">Todo&apos;s laden...</p>
        ) : todos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Nog geen todo&apos;s</p>
            <p className="mt-2 text-blue-800">
              Voeg taken toe die je wilt bijhouden tijdens het chatten.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {openTodos.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                  Open ({openTodos.length})
                </p>
                <div className="space-y-2">
                  {openTodos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      onToggle={() => void handleToggleTodo(todo)}
                      onDelete={() => void handleDeleteTodo(todo.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {doneTodos.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                  Afgerond ({doneTodos.length})
                </p>
                <div className="space-y-2">
                  {doneTodos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
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

      <div className="shrink-0 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
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
            placeholder="Nieuwe taak..."
            className="min-h-[44px] flex-1 rounded-2xl border border-gray-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-blue-300 md:text-sm"
          />
          <button
            type="button"
            disabled={saving || !newTitle.trim()}
            onClick={() => void handleAddTodo()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white disabled:opacity-40"
            aria-label="Taak toevoegen"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: CoachTodo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-gray-300"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-5 ${
            todo.completed ? "text-gray-400 line-through" : "text-black"
          }`}
        >
          {todo.title}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
        aria-label="Taak verwijderen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
