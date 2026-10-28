"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useKeyboardViewport } from "@/components/KeyboardViewportProvider";
import {
  useCommandPaletteSearch,
  useFilteredCommandItems,
} from "@/hooks/useCommandPaletteSearch";
import {
  athleteInfoEditInitialValue,
  athleteInfoEditInputType,
  athletePickerInfoLabel,
  athletePickerPrefix,
  buildCoachAthleteInfoQuickActions,
  filterAthletePickerItems,
  formatAthletePickerInfoValue,
  isAthleteInfoPickerMode,
  parseAthletePickerMode,
  parsePickerCommandItemId,
  type AthleteInfoPickerMode,
  type AthletePickerMode,
  type CommandAthleteDetail,
  type CommandItem,
} from "@/lib/commandPaletteSearch";
import {
  formatPaymentPriceFieldValue,
  isValidPaymentDayInput,
  isValidPaymentPriceInput,
  parsePaymentDayInput,
  parsePaymentPriceInput,
  saveAthletePayment,
} from "@/lib/athletePayments";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { parseOptionalTextFieldInput } from "@/lib/optionalFieldDash";
import { supabase } from "@/lib/supabaseClient";

const DROPDOWN_GAP_PX = 6;
const ATHLETE_PICKER_DROPDOWN_WIDTH_PX = 220;
const DROPDOWN_BOTTOM_GAP_PX = 8;
const ATHLETE_PICKER_ITEM_HEIGHT_PX = 36;
const ATHLETE_PICKER_VISIBLE_COUNT = 5;
const EMBEDDED_DROPDOWN_VISIBLE_COUNT = 9;
const EMBEDDED_GENERAL_ITEM_HEIGHT_PX = 40;

const SEARCH_SHORTCUTS: Array<{
  mode: AthletePickerMode;
  label: string;
  prefix: string;
}> = [
  { mode: "programma", label: "Programma", prefix: "programma " },
  { mode: "chat", label: "Chat", prefix: "chat " },
];

function readBottomNavReserve() {
  if (typeof document === "undefined") return 0;
  const nav = document.querySelector<HTMLElement>(
    ".coach-mobile-bottom-nav, .mobile-bottom-nav, .athlete-mobile-tab-bar",
  );
  if (!nav) return 0;
  const rect = nav.getBoundingClientRect();
  return rect.height > 0 ? Math.ceil(rect.height) : 0;
}

type InfoPopupState = {
  athleteId: string;
  athleteName: string;
  mode: AthleteInfoPickerMode;
  fieldLabel: string;
  value: string;
};

function focusInputWithoutScroll(input: HTMLInputElement, cursorAt: number) {
  try {
    input.focus({ preventScroll: true });
  } catch {
    input.focus();
  }
  input.setSelectionRange(cursorAt, cursorAt);
}

function mergeAthleteDetail(
  base: CommandAthleteDetail | undefined,
  override: Partial<CommandAthleteDetail> | undefined,
) {
  if (!base) return undefined;
  return override ? { ...base, ...override } : base;
}

export default function CoachMobileDashboardSearch({
  variant = "mobile",
}: {
  variant?: "mobile" | "embedded";
}) {
  const isEmbedded = variant === "embedded";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [infoPopup, setInfoPopup] = useState<InfoPopupState | null>(null);
  const [infoEditing, setInfoEditing] = useState(false);
  const [infoEditValue, setInfoEditValue] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [athleteDetailOverrides, setAthleteDetailOverrides] = useState<
    Map<string, Partial<CommandAthleteDetail>>
  >(new Map());
  const [dropdownLayout, setDropdownLayout] = useState<{
    maxHeight: number;
    fixed?: {
      top: number;
      left: number;
      width: number;
    };
  } | null>(null);
  const [dropdownMounted, setDropdownMounted] = useState(false);
  const { items, athleteDetailsById, loading } = useCommandPaletteSearch({ enabled: true });
  const { keyboardInset } = useKeyboardViewport();
  const pickerMode = parseAthletePickerMode(query);
  const infoPickerMode = isAthleteInfoPickerMode(pickerMode) ? pickerMode : null;
  const athletePickerMode = pickerMode !== null;
  const infoQuickActions = useMemo(() => buildCoachAthleteInfoQuickActions(), []);
  const searchableItems = useMemo(
    () => [...infoQuickActions, ...items],
    [infoQuickActions, items],
  );
  const generalFiltered = useFilteredCommandItems(searchableItems, query);
  const pickerFiltered = useMemo(
    () => (pickerMode ? filterAthletePickerItems(items, query, pickerMode) : []),
    [items, pickerMode, query],
  );
  const filtered = athletePickerMode ? pickerFiltered : generalFiltered;
  const hasQuery = query.trim().length > 0;
  const showDropdown = athletePickerMode || hasQuery;

  const getAthleteDetail = useCallback(
    (athleteId: string) =>
      mergeAthleteDetail(
        athleteDetailsById.get(athleteId),
        athleteDetailOverrides.get(athleteId),
      ),
    [athleteDetailOverrides, athleteDetailsById],
  );

  const syncDropdownLayout = useCallback(() => {
    const wrap = inputWrapRef.current;
    if (!wrap || !showDropdown) {
      setDropdownLayout(null);
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const dropdownTop = rect.bottom + DROPDOWN_GAP_PX;
    const viewport = window.visualViewport;
    const visibleBottom = viewport
      ? viewport.offsetTop + viewport.height
      : keyboardInset > 0
        ? window.innerHeight - keyboardInset
        : window.innerHeight;
    const bottomNavReserve = keyboardInset > 0 ? readBottomNavReserve() : 0;
    const available = Math.floor(
      visibleBottom - dropdownTop - DROPDOWN_BOTTOM_GAP_PX - bottomNavReserve,
    );
    const athletePickerCap = ATHLETE_PICKER_ITEM_HEIGHT_PX * ATHLETE_PICKER_VISIBLE_COUNT;
    const embeddedPickerCap =
      ATHLETE_PICKER_ITEM_HEIGHT_PX * EMBEDDED_DROPDOWN_VISIBLE_COUNT;
    const embeddedGeneralCap =
      EMBEDDED_GENERAL_ITEM_HEIGHT_PX * EMBEDDED_DROPDOWN_VISIBLE_COUNT;
    const maxHeight = isEmbedded
      ? athletePickerMode
        ? embeddedPickerCap
        : embeddedGeneralCap
      : athletePickerMode
        ? Math.min(athletePickerCap, Math.max(ATHLETE_PICKER_ITEM_HEIGHT_PX * 2, available))
        : Math.min(280, Math.max(88, available));
    const pickerWidth = isEmbedded
      ? rect.width
      : Math.min(
          ATHLETE_PICKER_DROPDOWN_WIDTH_PX,
          Math.max(180, rect.width * 0.82),
        );
    const pickerLeft = isEmbedded ? rect.left : rect.left + (rect.width - pickerWidth) / 2;

    setDropdownLayout({
      maxHeight,
      fixed: {
        top: dropdownTop,
        left: athletePickerMode ? pickerLeft : rect.left,
        width: athletePickerMode ? pickerWidth : rect.width,
      },
    });
  }, [athletePickerMode, isEmbedded, keyboardInset, showDropdown]);

  useEffect(() => {
    setDropdownMounted(true);
  }, []);

  useLayoutEffect(() => {
    syncDropdownLayout();
  }, [syncDropdownLayout, query, keyboardInset, filtered.length]);

  useEffect(() => {
    if (!showDropdown) return;

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncDropdownLayout);
    viewport?.addEventListener("scroll", syncDropdownLayout);
    window.addEventListener("resize", syncDropdownLayout);

    return () => {
      viewport?.removeEventListener("resize", syncDropdownLayout);
      viewport?.removeEventListener("scroll", syncDropdownLayout);
      window.removeEventListener("resize", syncDropdownLayout);
    };
  }, [showDropdown, syncDropdownLayout]);

  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const activeItem = dropdownRef.current.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    if (!activeItem) return;
    const dropdown = dropdownRef.current;
    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    if (itemTop < dropdown.scrollTop) {
      dropdown.scrollTop = itemTop;
    } else if (itemBottom > dropdown.scrollTop + dropdown.clientHeight) {
      dropdown.scrollTop = itemBottom - dropdown.clientHeight;
    }
  }, [selected, showDropdown, dropdownLayout?.maxHeight]);

  useEffect(() => {
    if (!infoEditing) return;
    window.requestAnimationFrame(() => {
      editInputRef.current?.focus({ preventScroll: true });
    });
  }, [infoEditing]);

  const focusInputAtEnd = useCallback((value: string) => {
    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      focusInputWithoutScroll(input, value.length);
    });
  }, []);

  const applyShortcut = useCallback(
    (prefix: string) => {
      setQuery(prefix);
      setSelected(0);
      setInfoPopup(null);
      setInfoEditing(false);

      const input = inputRef.current;
      if (!input) return;

      if (document.activeElement === input) {
        input.setSelectionRange(prefix.length, prefix.length);
        return;
      }

      focusInputAtEnd(prefix);
    },
    [focusInputAtEnd],
  );

  const handleShortcutPointerDown = useCallback((event: ReactPointerEvent) => {
    event.preventDefault();
  }, []);

  const handleSearchFocus = useCallback(
    (event: ReactFocusEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const cursorAt = input.selectionStart ?? query.length;
      focusInputWithoutScroll(input, cursorAt);
    },
    [query.length],
  );

  const navigateTo = useCallback(
    (item: CommandItem) => {
      setQuery("");
      setSelected(0);
      setInfoPopup(null);
      setInfoEditing(false);
      if (item.href) router.push(item.href);
    },
    [router],
  );

  const showAthleteInfo = useCallback(
    (item: CommandItem, mode: AthleteInfoPickerMode) => {
      const athleteId = item.id.replace(/^athlete-/, "");
      const athlete = getAthleteDetail(athleteId);
      if (!athlete) return;

      setInfoPopup({
        athleteId,
        athleteName: athlete.fullName,
        mode,
        fieldLabel: athletePickerInfoLabel(mode),
        value: formatAthletePickerInfoValue(mode, athlete),
      });
      setInfoEditValue(athleteInfoEditInitialValue(mode, athlete));
      setInfoEditing(false);
      setInfoError(null);
      setQuery("");
      setSelected(0);
      inputRef.current?.blur();
    },
    [getAthleteDetail],
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (infoPickerMode) {
        showAthleteInfo(item, infoPickerMode);
        return;
      }

      const pickerFromItem = parsePickerCommandItemId(item.id);
      if (pickerFromItem) {
        applyShortcut(`${athletePickerPrefix(pickerFromItem)} `);
        return;
      }

      navigateTo(item);
    },
    [applyShortcut, infoPickerMode, navigateTo, showAthleteInfo],
  );

  const closeInfoPopup = useCallback(() => {
    setInfoPopup(null);
    setInfoEditing(false);
    setInfoError(null);
  }, []);

  const startInfoEdit = useCallback(() => {
    if (!infoPopup) return;
    const athlete = getAthleteDetail(infoPopup.athleteId);
    if (!athlete) return;
    setInfoEditValue(athleteInfoEditInitialValue(infoPopup.mode, athlete));
    setInfoError(null);
    setInfoEditing(true);
  }, [getAthleteDetail, infoPopup]);

  const saveInfoEdit = useCallback(async () => {
    if (!infoPopup) return;

    const athlete = getAthleteDetail(infoPopup.athleteId);
    if (!athlete) return;

    setInfoSaving(true);
    setInfoError(null);

    try {
      let nextDetail: Partial<CommandAthleteDetail> = {};

      if (infoPopup.mode === "prijs") {
        if (!isValidPaymentPriceInput(infoEditValue)) {
          setInfoError('Vul een geldige prijs in of gebruik "-".');
          return;
        }
        const parsedPrice = parsePaymentPriceInput(infoEditValue);
        await saveAthletePayment(infoPopup.athleteId, {
          betaling_prijs: parsedPrice,
          betaling_dag: athlete.betalingDag,
        });
        nextDetail = { betalingPrijs: parsedPrice };
      } else if (infoPopup.mode === "betaaldag") {
        const priceField = formatPaymentPriceFieldValue(athlete.betalingPrijs);
        if (!isValidPaymentDayInput(infoEditValue, priceField)) {
          setInfoError("Betaaldag moet tussen 1 en 31 liggen.");
          return;
        }
        const parsedDay = parsePaymentDayInput(infoEditValue);
        await saveAthletePayment(infoPopup.athleteId, {
          betaling_prijs: athlete.betalingPrijs,
          betaling_dag: parsedDay,
        });
        nextDetail = { betalingDag: parsedDay };
      } else if (infoPopup.mode === "lidnummer") {
        const parsedLidnummer = parseOptionalTextFieldInput(infoEditValue);
        const { error } = await supabase
          .from("profiles")
          .update({ lidnummer: parsedLidnummer })
          .eq("id", infoPopup.athleteId);
        if (error) throw error;
        nextDetail = { lidnummer: parsedLidnummer };
      } else {
        const nextDate = infoEditValue.trim() || null;
        const { error } = await supabase
          .from("profiles")
          .update({ geboortedatum: nextDate })
          .eq("id", infoPopup.athleteId);
        if (error) throw error;
        nextDetail = { geboortedatum: nextDate };
      }

      setAthleteDetailOverrides((current) => {
        const next = new Map(current);
        next.set(infoPopup.athleteId, {
          ...next.get(infoPopup.athleteId),
          ...nextDetail,
        });
        return next;
      });

      const updatedAthlete = mergeAthleteDetail(athlete, nextDetail);
      if (updatedAthlete) {
        setInfoPopup((current) =>
          current
            ? {
                ...current,
                value: formatAthletePickerInfoValue(current.mode, updatedAthlete),
              }
            : current,
        );
      }
      setInfoEditing(false);
    } catch {
      setInfoError("Opslaan mislukt. Probeer het opnieuw.");
    } finally {
      setInfoSaving(false);
    }
  }, [getAthleteDetail, infoEditValue, infoPopup]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setSelected(0);
    });
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!showDropdown || filtered.length === 0) return;

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
        handleSelect(filtered[selected]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, handleSelect, selected, showDropdown]);

  let lastGroup = "";

  const dropdownStyle = dropdownLayout
    ? {
        maxHeight: `${dropdownLayout.maxHeight}px`,
        position: "fixed" as const,
        top: `${dropdownLayout.fixed!.top}px`,
        left: `${dropdownLayout.fixed!.left}px`,
        width: `${dropdownLayout.fixed!.width}px`,
        right: "auto",
        transform: "none",
      }
    : undefined;

  const dropdownNode =
    showDropdown && dropdownLayout ? (
      <ul
        ref={dropdownRef}
        className={`coach-mobile-dashboard-search-dropdown${
          athletePickerMode ? " coach-mobile-dashboard-search-dropdown--athlete-picker" : ""
        } coach-mobile-dashboard-search-dropdown--fixed${
          isEmbedded ? " coach-mobile-dashboard-search-dropdown--embedded" : ""
        }`}
        role="listbox"
        style={dropdownStyle}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        {loading ? (
          <li className="coach-mobile-dashboard-search-empty">Laden…</li>
        ) : filtered.length === 0 ? (
          <li className="coach-mobile-dashboard-search-empty">Geen resultaten</li>
        ) : (
          filtered.map((item, index) => {
            const showGroup = !athletePickerMode && item.group !== lastGroup;
            lastGroup = item.group;

            return (
              <li key={item.id}>
                {showGroup ? (
                  <p className="coach-mobile-dashboard-search-group">{item.group}</p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === selected}
                  onClick={() => handleSelect(item)}
                  className={`coach-mobile-dashboard-search-item app-focus-ring ${
                    athletePickerMode ? "coach-mobile-dashboard-search-item--compact" : ""
                  } ${index === selected ? "is-active" : ""}`}
                >
                  <span className="coach-mobile-dashboard-search-item-label">{item.label}</span>
                  {!athletePickerMode && item.hint ? (
                    <span className="coach-mobile-dashboard-search-item-hint">{item.hint}</span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    ) : null;

  const infoInputType = infoPopup ? athleteInfoEditInputType(infoPopup.mode) : "text";

  return (
    <>
      <section
        className={`coach-mobile-dashboard-search${
          isEmbedded
            ? " coach-dashboard-search-embedded hidden lg:block"
            : " lg:hidden"
        }${showDropdown ? " coach-mobile-dashboard-search--active" : ""}`}
        aria-label="Zoeken in de app"
      >
        <div className="coach-mobile-dashboard-search-card">
          <div ref={inputWrapRef} className="coach-mobile-dashboard-search-input-wrap">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onFocus={handleSearchFocus}
              placeholder="Zoek atleten, programma's, prijs, lidnummer…"
              variant="rounded"
              className="w-full coach-mobile-dashboard-search-field"
              inputClassName="text-base coach-mobile-dashboard-search-input"
              aria-label="Zoeken"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {dropdownMounted && dropdownNode
              ? createPortal(dropdownNode, document.body)
              : null}
          </div>

          <div className="coach-mobile-dashboard-search-shortcuts">
            {SEARCH_SHORTCUTS.map(({ mode, label, prefix }) => (
              <button
                key={mode}
                type="button"
                onPointerDown={handleShortcutPointerDown}
                onClick={() => applyShortcut(prefix)}
                className={`coach-mobile-dashboard-search-shortcut app-focus-ring${
                  pickerMode === mode ? " is-active" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {infoPopup ? (
        <div
          className="coach-mobile-dashboard-search-info-overlay"
          role="presentation"
          onClick={closeInfoPopup}
        >
          <div
            className="coach-mobile-dashboard-search-info-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-search-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="coach-mobile-dashboard-search-info-header">
              <p id="coach-search-info-title" className="coach-mobile-dashboard-search-info-label">
                {infoPopup.fieldLabel}
              </p>
              <button
                type="button"
                onClick={closeInfoPopup}
                className="coach-mobile-dashboard-search-info-close app-focus-ring"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="coach-mobile-dashboard-search-info-athlete">{infoPopup.athleteName}</p>

            {infoEditing ? (
              <div className="coach-mobile-dashboard-search-info-edit">
                <input
                  ref={editInputRef}
                  type={infoInputType}
                  value={infoEditValue}
                  onChange={(event) => setInfoEditValue(event.target.value)}
                  className="coach-mobile-dashboard-search-info-input"
                  inputMode={infoInputType === "number" ? "decimal" : undefined}
                  aria-label={`${infoPopup.fieldLabel} bewerken`}
                />
                {infoError ? (
                  <p className="coach-mobile-dashboard-search-info-error">{infoError}</p>
                ) : null}
                <div className="coach-mobile-dashboard-search-info-edit-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setInfoEditing(false);
                      setInfoError(null);
                    }}
                    className="coach-mobile-dashboard-search-info-secondary app-focus-ring"
                    disabled={infoSaving}
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveInfoEdit()}
                    className="coach-mobile-dashboard-search-info-primary app-focus-ring"
                    disabled={infoSaving}
                  >
                    {infoSaving ? "Opslaan…" : "Opslaan"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="coach-mobile-dashboard-search-info-value-row">
                <p className="coach-mobile-dashboard-search-info-value">{infoPopup.value}</p>
                <button
                  type="button"
                  onClick={startInfoEdit}
                  className="coach-mobile-dashboard-search-info-edit-btn app-focus-ring"
                  aria-label={`${infoPopup.fieldLabel} bewerken`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}

            {!infoEditing ? (
              <button
                type="button"
                onClick={closeInfoPopup}
                className="coach-mobile-dashboard-search-info-dismiss app-focus-ring"
              >
                Sluiten
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
