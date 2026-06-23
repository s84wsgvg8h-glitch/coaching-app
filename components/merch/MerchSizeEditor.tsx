"use client";

import { Plus, X } from "lucide-react";

type MerchSizeEditorProps = {
  sizes: string[];
  onChange: (sizes: string[]) => void;
};

export default function MerchSizeEditor({ sizes, onChange }: MerchSizeEditorProps) {
  function updateSize(index: number, value: string) {
    onChange(sizes.map((size, i) => (i === index ? value : size)));
  }

  function removeSize(index: number) {
    onChange(sizes.filter((_, i) => i !== index));
  }

  function addSize() {
    onChange([...sizes, ""]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
        Maten
      </p>
      {sizes.length === 0 ? (
        <p className="text-sm text-app-muted">Nog geen maten — voeg er een toe.</p>
      ) : (
        sizes.map((size, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={size}
              onChange={(event) => updateSize(index, event.target.value)}
              placeholder={`Maat ${index + 1}`}
              className="flex-1 rounded-xl border border-app-border px-3 py-2 text-sm outline-none app-focus-ring"
            />
            <button
              type="button"
              onClick={() => removeSize(index)}
              className="rounded-xl border border-app-border p-2 text-app-muted hover:text-red-600 app-focus-ring"
              aria-label="Maat verwijderen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addSize}
        className="inline-flex items-center gap-1 rounded-xl border border-dashed border-app-border px-3 py-2 text-sm font-semibold text-app-text hover:bg-app-surface-muted"
      >
        <Plus className="h-4 w-4" />
        Maat toevoegen
      </button>
    </div>
  );
}

function normalizeSizes(sizes: string[]) {
  return sizes.map((s) => s.trim()).filter(Boolean);
}

export { normalizeSizes };
