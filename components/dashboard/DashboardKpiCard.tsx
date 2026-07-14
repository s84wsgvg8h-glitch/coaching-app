"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

type KpiTone = "purple" | "green" | "orange" | "blue";

type DashboardKpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  loading?: boolean;
  className?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  tone?: KpiTone;
};

export default function DashboardKpiCard({
  label,
  value,
  hint,
  href,
  loading = false,
  className = "",
  ariaLabel,
  icon,
  tone = "blue",
}: DashboardKpiCardProps) {
  const cardClass =
    `dashboard-kpi-card dashboard-kpi-card--v2 dashboard-kpi-card--${tone} ${href ? "app-focus-ring" : ""} ${className}`.trim();

  const body = (
    <>
      <span className="dashboard-kpi-accent" aria-hidden="true" />
      <div className="dashboard-kpi-inner">
        <div className="dashboard-kpi-top">
          {icon ? (
            <span className="dashboard-kpi-icon-wrap">{icon}</span>
          ) : null}
          <p className="dashboard-kpi-label">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="dashboard-kpi-value-skeleton" />
        ) : (
          <p className="dashboard-kpi-value">{value}</p>
        )}
        {hint && !loading ? (
          <p className="dashboard-kpi-hint">{hint}</p>
        ) : null}
      </div>
      {href ? (
        <span className="dashboard-kpi-arrow" aria-hidden="true">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass} aria-label={ariaLabel || label}>
        {body}
      </Link>
    );
  }

  return (
    <div className={cardClass} aria-label={ariaLabel}>
      {body}
    </div>
  );
}
