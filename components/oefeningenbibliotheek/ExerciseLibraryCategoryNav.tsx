"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXERCISE_LIBRARY_CATEGORIES,
  type ExerciseLibraryCategoryRow,
} from "@/lib/exerciseLibrary";

export type CategoryFilterValue = string;

type CategoryNode = {
  id: string | null;
  name: string;
  builtin: boolean;
  children: CategoryNode[];
};

function buildCategoryTree(
  customCategories: ExerciseLibraryCategoryRow[],
  hiddenBuiltinNames: string[] = [],
): CategoryNode[] {
  const byParent = new Map<string | null, ExerciseLibraryCategoryRow[]>();

  for (const row of customCategories) {
    const key = row.parent_id;
    const list = byParent.get(key) || [];
    list.push(row);
    byParent.set(key, list);
  }

  function childrenFor(parentId: string | null): CategoryNode[] {
    return (byParent.get(parentId) || [])
      .sort((a, b) => a.name.localeCompare(b.name, "nl"))
      .map((row) => ({
        id: row.id,
        name: row.name,
        builtin: false,
        children: childrenFor(row.id),
      }));
  }

  const customRoots = childrenFor(null);
  const customRootNames = new Set(customRoots.map((node) => node.name));

  const builtins: CategoryNode[] = EXERCISE_LIBRARY_CATEGORIES.filter(
    (name) => !customRootNames.has(name) && !hiddenBuiltinNames.includes(name),
  ).map((name) => ({
    id: null,
    name,
    builtin: true,
    children: [],
  }));

  const merged = [...builtins, ...customRoots].sort((a, b) =>
    a.name.localeCompare(b.name, "nl"),
  );

  for (const node of merged) {
    if (node.builtin && node.id === null) {
      const dbRoot = customCategories.find(
        (row) => !row.parent_id && row.name === node.name,
      );
      if (dbRoot) {
        node.id = dbRoot.id;
        node.children = childrenFor(dbRoot.id);
      }
    }
  }

  return merged;
}

function filterKeyForNode(node: CategoryNode, ancestors: string[]): string {
  if (ancestors.length === 0) return node.name;
  return [...ancestors, node.name].join("::");
}

function expandKeyForNode(node: CategoryNode): string {
  return node.id || node.name;
}

type Props = {
  customCategories: ExerciseLibraryCategoryRow[];
  hiddenBuiltinNames?: string[];
  categoryFilter: CategoryFilterValue;
  isCoach: boolean;
  draggingItemId?: string | null;
  onFilterChange: (value: CategoryFilterValue) => void;
  onAddCategory: (
    name: string,
    parentId: string | null,
    parentName?: string,
  ) => Promise<boolean>;
  onDeleteCategory: (id: string | null, name: string) => Promise<void>;
  onMoveItemToCategory?: (filterKey: CategoryFilterValue) => void;
  categoryError?: string;
};

export default function ExerciseLibraryCategoryNav({
  customCategories,
  hiddenBuiltinNames = [],
  categoryFilter,
  isCoach,
  draggingItemId = null,
  onFilterChange,
  onAddCategory,
  onDeleteCategory,
  onMoveItemToCategory,
  categoryError = "",
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [addingFor, setAddingFor] = useState<
    | {
        parentId: string | null;
        parentName: string;
        expandKey: string;
        parentFilterKey: string;
      }
    | "root"
    | null
  >(null);
  const [newName, setNewName] = useState("");
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const expandTimerRef = useRef<number | null>(null);

  const tree = useMemo(
    () => buildCategoryTree(customCategories, hiddenBuiltinNames),
    [customCategories, hiddenBuiltinNames],
  );

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) {
        window.clearTimeout(expandTimerRef.current);
      }
    };
  }, []);

  function expandOnly(key: string) {
    setExpanded(new Set([key]));
  }

  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearExpandTimer() {
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }

  function scheduleExpand(key: string) {
    clearExpandTimer();
    expandTimerRef.current = window.setTimeout(() => {
      setExpanded((current) => new Set(current).add(key));
    }, 450);
  }

  async function submitNewCategory(
    parentId: string | null,
    parentName?: string,
    parentExpandKey?: string,
    parentFilterKey?: string,
  ) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const ok = await onAddCategory(trimmed, parentId, parentName);
    if (!ok) return;

    setNewName("");
    setAddingFor(null);

    if (parentExpandKey) {
      setExpanded((current) => new Set(current).add(parentExpandKey));
    }

    if (parentFilterKey) {
      onFilterChange(`${parentFilterKey}::${trimmed}`);
      return;
    }

    onFilterChange(trimmed);
  }

  function handleDragOver(
    event: React.DragEvent,
    filterKey: string,
    expandKey: string,
  ) {
    if (!draggingItemId || !onMoveItemToCategory) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverKey(filterKey);
    scheduleExpand(expandKey);
  }

  function handleDrop(event: React.DragEvent, filterKey: string) {
    if (!draggingItemId || !onMoveItemToCategory) return;
    event.preventDefault();
    clearExpandTimer();
    setDragOverKey(null);
    onMoveItemToCategory(filterKey);
  }

  function renderNode(
    node: CategoryNode,
    depth: number,
    ancestors: string[],
  ) {
    const key = filterKeyForNode(node, ancestors);
    const expandKey = expandKeyForNode(node);
    const isExpanded = expanded.has(expandKey);
    const hasChildren = node.children.length > 0;
    const isActive = categoryFilter === key;
    const isDropTarget = dragOverKey === key && Boolean(draggingItemId);
    const canDelete = isCoach;

    return (
      <div key={key} className="select-none">
        <div
          onDragOver={(event) => handleDragOver(event, key, expandKey)}
          onDragLeave={() => {
            if (dragOverKey === key) setDragOverKey(null);
            clearExpandTimer();
          }}
          onDrop={(event) => handleDrop(event, key)}
          className={`group relative mb-0.5 flex items-center rounded-lg pr-1 transition ${
            isDropTarget
              ? "bg-brand-purple/20 ring-1 ring-brand-purple/60"
              : isActive
                ? "bg-brand-purple text-white"
                : "text-app-text hover:bg-app-surface-muted"
          }`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <button
            type="button"
            onClick={() => {
              onFilterChange(key);
              if (hasChildren || isCoach) {
                if (isExpanded) {
                  toggleExpanded(expandKey);
                } else {
                  expandOnly(expandKey);
                }
              }
            }}
            className={`min-w-0 flex-1 py-1.5 text-left text-xs font-semibold ${
              depth > 0 ? "text-[11px]" : ""
            }`}
          >
            {node.name}
          </button>

          {isCoach ? (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                title="Subcategorie toevoegen"
                onClick={(event) => {
                  event.stopPropagation();
                  setAddingFor({
                    parentId: node.id,
                    parentName: node.name,
                    expandKey,
                    parentFilterKey: key,
                  });
                  setNewName("");
                  expandOnly(expandKey);
                }}
                className={`flex h-6 w-6 items-center justify-center text-sm font-bold ${
                  isActive
                    ? "hover:bg-white/20"
                    : "text-app-muted hover:text-app-text"
                }`}
              >
                +
              </button>
              {canDelete ? (
                <button
                  type="button"
                  title="Verwijderen"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteCategory(node.id, node.name);
                  }}
                  className={`flex h-6 w-6 items-center justify-center text-base leading-none font-bold ${
                    isActive
                      ? "text-white/90 hover:bg-white/20"
                      : "text-red-400 hover:bg-red-500/15"
                  }`}
                >
                  ×
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {addingFor !== null &&
        addingFor !== "root" &&
        addingFor.parentName === node.name ? (
          <div
            className="mb-1 flex gap-1"
            style={{ paddingLeft: `${20 + depth * 12}px` }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void submitNewCategory(
                    addingFor.parentId,
                    addingFor.parentName,
                    addingFor.expandKey,
                    addingFor.parentFilterKey,
                  );
                }
                if (event.key === "Escape") {
                  setAddingFor(null);
                  setNewName("");
                }
              }}
              placeholder="Naam"
              className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-[11px] text-app-text outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <button
              type="button"
              onClick={() =>
                void submitNewCategory(
                  addingFor.parentId,
                  addingFor.parentName,
                  addingFor.expandKey,
                  addingFor.parentFilterKey,
                )
              }
              className="rounded-lg bg-brand-purple px-2 py-1 text-[11px] font-semibold text-white"
            >
              OK
            </button>
          </div>
        ) : null}

        {isExpanded && hasChildren
          ? node.children.map((child) =>
              renderNode(child, depth + 1, [...ancestors, node.name]),
            )
          : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {isCoach ? (
        <div className="mb-2">
          {addingFor === "root" ? (
            <div className="flex gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitNewCategory(null);
                  if (event.key === "Escape") {
                    setAddingFor(null);
                    setNewName("");
                  }
                }}
                placeholder="Nieuwe categorie"
                className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-[11px] text-app-text outline-none focus:ring-1 focus:ring-brand-purple"
              />
              <button
                type="button"
                onClick={() => void submitNewCategory(null)}
                className="rounded-lg bg-brand-purple px-2 py-1 text-[11px] font-semibold text-white"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              type="button"
              title="Categorie toevoegen"
              onClick={() => {
                setAddingFor("root");
                setNewName("");
              }}
              className="px-1 text-lg font-normal leading-none text-app-muted transition hover:text-brand-purple"
            >
              +
            </button>
          )}
        </div>
      ) : null}

      {categoryError ? (
        <p className="mb-2 text-[11px] font-medium text-red-400">{categoryError}</p>
      ) : null}

      <div
        onDragOver={(event) => handleDragOver(event, "Alle", "alle")}
        onDragLeave={() => {
          if (dragOverKey === "Alle") setDragOverKey(null);
          clearExpandTimer();
        }}
        onDrop={(event) => handleDrop(event, "Alle")}
      >
        <button
          type="button"
          onClick={() => onFilterChange("Alle")}
          className={`mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${
            dragOverKey === "Alle" && draggingItemId
              ? "bg-brand-purple/20 ring-1 ring-brand-purple/60"
              : categoryFilter === "Alle"
                ? "bg-brand-purple text-white"
                : "text-app-text hover:bg-app-surface-muted"
          }`}
        >
          Alle
        </button>
      </div>

      {tree.map((node) => renderNode(node, 0, []))}
    </div>
  );
}

export function categoryFilterLabel(filter: CategoryFilterValue): string {
  if (filter === "Alle") return "Alle oefeningen";
  const parts = filter.split("::");
  return parts[parts.length - 1] || filter;
}

export function emptyCategoryMessage(filter: CategoryFilterValue): string {
  if (filter === "Alle") {
    return 'Nog geen oefeningen. Klik op "Nieuwe oefening aanmaken" om je eerste uitlegvideo toe te voegen.';
  }

  const parts = filter.split("::");
  if (parts.length === 1) {
    return `Nog geen oefeningen in ${parts[0]}.`;
  }

  return `Nog geen oefeningen in ${parts[0]} - ${parts.slice(1).join(" - ")}.`;
}

export function parseCategoryFilter(filter: CategoryFilterValue): {
  category: string;
  subcategory: string | null;
} {
  if (filter === "Alle") {
    return { category: "Overig", subcategory: null };
  }

  const parts = filter.split("::");
  if (parts.length === 1) {
    return { category: parts[0], subcategory: null };
  }

  return {
    category: parts[0],
    subcategory: parts[parts.length - 1],
  };
}

export function itemMatchesCategoryFilter(
  item: { category: string; subcategory: string | null },
  filter: CategoryFilterValue,
): boolean {
  if (filter === "Alle") return true;
  const parts = filter.split("::");
  if (parts.length === 1) {
    return item.category === parts[0];
  }
  const root = parts[0];
  const leaf = parts[parts.length - 1];
  return (
    item.category === root &&
    (item.subcategory || "").toLowerCase() === leaf.toLowerCase()
  );
}
