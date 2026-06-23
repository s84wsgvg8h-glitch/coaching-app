"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

export function getInitials(name: string | null) {
  const parts = (name || "??").split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Onbekend";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dag${days === 1 ? "" : "en"} geleden`;
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateNl(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function AdminBreadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 ? (
            <ChevronRight className="h-3 w-3 text-app-subtle" />
          ) : null}
          {item.href ? (
            <Link href={item.href} className="admin-breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="admin-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-block-header">
      {breadcrumbs ? <AdminBreadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {Icon ? (
              <span className="admin-page-block-icon">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <h1 className="admin-page-block-title">{title}</h1>
          </div>
          {subtitle ? (
            <p className="admin-page-block-subtitle">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="admin-header-actions w-full sm:w-auto">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function AdminSummaryCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "blue",
  trend,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "purple" | "amber" | "red";
  trend?: number | null;
}) {
  const trendTone =
    trend === null || trend === undefined || trend === 0
      ? "neutral"
      : trend > 0
        ? "up"
        : "down";

  return (
    <div className={`admin-summary-card admin-summary-card--${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="admin-summary-label">{label}</p>
        <p className="admin-summary-value">{value}</p>
        {subtext ? <p className="admin-summary-sub">{subtext}</p> : null}
        {trend !== undefined ? (
          <p className={`admin-summary-trend admin-summary-trend--${trendTone}`}>
            {trendTone === "up" ? (
              <TrendingUp className="inline h-3 w-3" />
            ) : trendTone === "down" ? (
              <TrendingDown className="inline h-3 w-3" />
            ) : (
              <Minus className="inline h-3 w-3" />
            )}{" "}
            {trend === null ? "—" : `${trend > 0 ? "+" : ""}${trend}%`} vs.
            vorige 7 dagen
          </p>
        ) : null}
      </div>
      <span className={`admin-summary-icon admin-summary-icon--${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return <div className="admin-filter-bar">{children}</div>;
}

export function AdminTableToolbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="admin-table-toolbar">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="admin-pagination">
      <div className="flex items-center gap-2 text-[12px] text-app-muted">
        <span>Rijen per pagina</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="admin-select !min-h-[36px] !w-auto text-[12px]"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="admin-pagination-btn"
        >
          ‹
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
          (n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={`admin-pagination-btn ${page === n ? "is-active" : ""}`}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="admin-pagination-btn"
        >
          ›
        </button>
      </div>
      <p className="text-[12px] text-app-muted">
        {start}–{end} van {total}
      </p>
    </div>
  );
}

export function AdminAvatar({
  name,
  tone = "blue",
  size = "md",
}: {
  name: string | null;
  tone?: "blue" | "green" | "purple" | "amber";
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`admin-avatar admin-avatar--${tone} ${size === "sm" ? "admin-avatar--sm" : ""}`}
    >
      {getInitials(name)}
    </span>
  );
}

export function AdminEmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-panel">
      <span className="admin-empty-panel-icon">
        <Icon className="h-6 w-6" />
      </span>
      <p className="admin-strong mt-3">{title}</p>
      <p className="admin-muted mt-1 max-w-sm text-center text-[13px]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
