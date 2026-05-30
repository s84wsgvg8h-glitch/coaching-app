import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: "athletes" | "calendar" | "chat" | "programs" | "generic";
};

function EmptyIcon({ icon }: { icon: EmptyStateProps["icon"] }) {
  const paths: Record<NonNullable<EmptyStateProps["icon"]>, ReactNode> = {
    athletes: (
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 8a8 8 0 0 1 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
    calendar: (
      <>
        <rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4v4M16 4v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    chat: (
      <path
        d="M6 8h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-5 3V10a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
    programs: (
      <>
        <path d="M6 5h12v14H6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 9h6M9 13h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    generic: (
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto h-16 w-16 text-app-accent opacity-80"
      aria-hidden
    >
      {paths[icon || "generic"]}
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  action,
  icon = "generic",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <EmptyIcon icon={icon} />
      <h3 className="mt-4 text-lg font-bold text-app-text">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-app-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
