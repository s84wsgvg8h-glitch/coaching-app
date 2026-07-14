"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Search, X } from "lucide-react";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

export type SearchInputVariant = "pill" | "rounded" | "ghost";

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  variant?: SearchInputVariant;
  tone?: "default" | "light";
  compact?: boolean;
  collapsible?: boolean;
  showClear?: boolean;
  hideIcon?: boolean;
  trailing?: ReactNode;
};

export type SearchFieldTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  placeholder?: string;
  kbd?: ReactNode;
  kbdPosition?: "start" | "end";
  variant?: SearchInputVariant;
  compact?: boolean;
  className?: string;
  showIcon?: boolean;
};

function joinClasses(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SearchFieldTrigger({
  placeholder = "Zoeken…",
  kbd,
  kbdPosition = "start",
  variant = "pill",
  compact = false,
  className = "",
  showIcon = true,
  children,
  ...rest
}: SearchFieldTriggerProps) {
  const kbdNode =
    kbd == null ? null : typeof kbd === "string" ? (
      <span className="app-search-trigger-kbd" aria-hidden="true">
        {kbd}
      </span>
    ) : (
      kbd
    );

  return (
    <button
      type="button"
      className={joinClasses(
        "app-search-field app-search-field--trigger",
        variant === "pill" && "app-search-field--pill",
        variant === "rounded" && "app-search-field--rounded",
        compact && "app-search-field--compact",
        className,
      )}
      {...rest}
    >
      {showIcon ? (
        <Search className="app-search-field-icon" aria-hidden="true" />
      ) : null}
      {children ?? (
        <>
          {kbdPosition === "start" ? kbdNode : null}
          <span className="app-search-trigger-text">{placeholder}</span>
          {kbdPosition === "end" ? kbdNode : null}
        </>
      )}
    </button>
  );
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChange,
      placeholder,
      className = "",
      inputClassName = "",
      variant = "pill",
      tone = "default",
      compact = false,
      collapsible = false,
      showClear = true,
      hideIcon = false,
      trailing,
      disabled,
      readOnly,
      onFocus,
      ...rest
    },
    ref,
  ) {
    const internalRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(Boolean(value) || !collapsible);

    useEffect(() => {
      if (value && collapsible) {
        deferEffectUpdate(() => {
          setExpanded(true);
        });
      }
    }, [value, collapsible]);

    useEffect(() => {
      if (!collapsible || !expanded) return;
      internalRef.current?.focus();
    }, [collapsible, expanded]);

    useEffect(() => {
      if (!collapsible) return;

      function handlePointerDown(event: MouseEvent) {
        if (wrapRef.current?.contains(event.target as Node)) return;
        if (!value) setExpanded(false);
      }

      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [collapsible, value]);

    const hasValue = value.length > 0;
    const canClear = showClear && hasValue && !readOnly && !disabled;
    const isExpanded = !collapsible || expanded;

    function setInputRef(node: HTMLInputElement | null) {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function handleExpand() {
      if (!collapsible) return;
      setExpanded(true);
    }

    return (
      <div
        ref={collapsible ? wrapRef : undefined}
        onClick={
          collapsible && !isExpanded && !disabled ? handleExpand : undefined
        }
        className={joinClasses(
          "app-search-field",
          variant === "pill" && "app-search-field--pill",
          variant === "rounded" && "app-search-field--rounded",
          variant === "ghost" && "app-search-field--ghost",
          compact && "app-search-field--compact",
          tone === "light" && "app-search-field--on-light",
          collapsible && "app-search-field--collapsible",
          collapsible && isExpanded && "app-search-field--collapsible-expanded",
          className,
        )}
      >
        {!hideIcon ? (
          <Search className="app-search-field-icon" aria-hidden="true" />
        ) : null}
        <input
          ref={setInputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onFocus={(event) => {
            if (collapsible) setExpanded(true);
            onFocus?.(event);
          }}
          className={joinClasses("app-search-input", inputClassName)}
          {...rest}
        />
        {trailing ? (
          <div className="app-search-field-trailing">{trailing}</div>
        ) : null}
        {canClear ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="app-search-clear app-focus-ring"
            aria-label="Zoekopdracht wissen"
          >
            <X className="h-3.5 w-3.5 stroke-[2]" />
          </button>
        ) : null}
      </div>
    );
  },
);

export default SearchInput;
