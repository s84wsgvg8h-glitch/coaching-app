"use client";

import type { ReactNode } from "react";

type AdminShellProps = {
  children: ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  return <div className="admin-tab-page">{children}</div>;
}
