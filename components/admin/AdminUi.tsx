"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";

export function AdminLoading({ label = "Laden…" }: { label?: string }) {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <SkeletonList rows={5} />
      <p className="mt-4 text-center text-[13px] text-app-muted">{label}</p>
    </div>
  );
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: "admin-badge--admin",
  coach: "admin-badge--coach",
  atleet: "admin-badge--athlete",
  pending: "admin-badge--pending",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  atleet: "Atleet",
  pending: "In afwachting",
};

export function AdminRoleBadge({
  role,
  pendingKind,
}: {
  role: string | null;
  pendingKind?: string | null;
}) {
  const key = role || "onbekend";
  const label =
    role === "pending" && pendingKind === "coach"
      ? "Coach (pending)"
      : ROLE_LABELS[key] || key;

  return (
    <span className={`admin-badge ${ROLE_BADGE_CLASS[key] || ""}`}>{label}</span>
  );
}

export function AdminStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <div className={`admin-stat ${accent ? `admin-stat--${accent}` : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="admin-stat-label">{label}</p>
        {Icon ? (
          <Icon className="admin-stat-icon h-4 w-4 shrink-0 opacity-60" />
        ) : null}
      </div>
      <p className="admin-stat-value">{value}</p>
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={`admin-panel ${flush ? "admin-panel--flush" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminPanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-panel-header flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="admin-panel-title">{title}</h2>
        {description ? (
          <p className="admin-muted mt-0.5 text-[13px]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      <p className="admin-strong">{title}</p>
      {description ? (
        <p className="admin-muted mt-1 text-[13px]">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function AdminCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={ok ? "admin-check-ok" : "admin-check-bad"}>
      {label}: {ok ? "OK" : "Ontbreekt"}
    </div>
  );
}
