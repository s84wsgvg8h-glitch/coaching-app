"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (options: ConfirmOptions) =>
      window.confirm(
        options.title ? `${options.title}\n\n${options.message}` : options.message,
      );
  }
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  function close(result: boolean) {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }

  const isDanger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && options ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            {options.title ? (
              <h2
                id="confirm-dialog-title"
                className="text-[17px] font-semibold text-app-text"
              >
                {options.title}
              </h2>
            ) : null}
            <p
              id="confirm-dialog-message"
              className={`text-[14px] leading-relaxed text-app-muted ${
                options.title ? "mt-2" : ""
              }`}
            >
              {options.message}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="app-btn-secondary min-h-[44px] w-full sm:w-auto"
              >
                {options.cancelLabel || "Annuleren"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`min-h-[44px] w-full rounded-xl px-4 py-2.5 text-[14px] font-semibold sm:w-auto ${
                  isDanger
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "app-btn-primary"
                }`}
              >
                {options.confirmLabel || "Bevestigen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
