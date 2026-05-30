"use client";

import { useMemo, useState } from "react";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { getExerciseLibrarySuggestions } from "@/lib/exerciseLibrarySuggestions";

type ExerciseLibraryPickerModalProps = {
  open: boolean;
  items: ExerciseLibraryItem[];
  exerciseName?: string;
  exerciseCategory?: string | null;
  onClose: () => void;
  onSelect: (item: ExerciseLibraryItem) => void;
};

function matchesQuery(item: ExerciseLibraryItem, cleanQuery: string) {
  if (!cleanQuery) return true;

  const haystack =
    `${item.name} ${item.category} ${item.description || ""}`.toLowerCase();
  return haystack.includes(cleanQuery);
}

function LibraryItemRow({
  item,
  onSelect,
}: {
  item: ExerciseLibraryItem;
  onSelect: (item: ExerciseLibraryItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-gray-50"
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt=""
          className="h-14 w-20 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-gray-100 text-xl">
          🎥
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-black">{item.name}</p>
        <p className="text-xs text-gray-500">{item.category}</p>
      </div>
    </button>
  );
}

export default function ExerciseLibraryPickerModal({
  open,
  items,
  exerciseName,
  exerciseCategory,
  onClose,
  onSelect,
}: ExerciseLibraryPickerModalProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    if (!exerciseName?.trim()) return [] as ExerciseLibraryItem[];

    return getExerciseLibrarySuggestions(exerciseName, items, {
      exerciseCategory,
    });
  }, [exerciseName, exerciseCategory, items]);

  const suggestionIds = useMemo(
    () => new Set(suggestions.map((item) => item.id)),
    [suggestions],
  );

  const cleanQuery = query.trim().toLowerCase();

  const filteredSuggestions = useMemo(
    () => suggestions.filter((item) => matchesQuery(item, cleanQuery)),
    [cleanQuery, suggestions],
  );

  const filteredRemainingItems = useMemo(() => {
    return items.filter(
      (item) =>
        !suggestionIds.has(item.id) && matchesQuery(item, cleanQuery),
    );
  }, [cleanQuery, items, suggestionIds]);

  const hasResults =
    filteredSuggestions.length > 0 || filteredRemainingItems.length > 0;

  function handleSelect(item: ExerciseLibraryItem) {
    onSelect(item);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-black">Uitlegvideo kiezen</h2>
          {exerciseName && (
            <p className="mt-1 text-sm text-gray-500">Voor: {exerciseName}</p>
          )}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek op oefening, categorie..."
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto p-2">
          {!hasResults ? (
            <p className="p-4 text-sm text-gray-500">
              Geen uitlegvideo&apos;s gevonden. Voeg eerst oefeningen toe in de
              oefeningenbibliotheek.
            </p>
          ) : (
            <>
              {filteredSuggestions.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-purple-600">
                    Voorgesteld
                  </p>
                  {filteredSuggestions.map((item) => (
                    <LibraryItemRow
                      key={item.id}
                      item={item}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {filteredRemainingItems.length > 0 && (
                <div>
                  {filteredSuggestions.length > 0 && (
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Alle oefeningen
                    </p>
                  )}
                  {filteredRemainingItems.map((item) => (
                    <LibraryItemRow
                      key={item.id}
                      item={item}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
