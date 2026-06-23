import type { CoachOrganization } from "@/lib/adminOrganizations";

export type AdminHierarchyUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  coach_id: string | null;
  coach_name?: string | null;
  pending_kind?: string | null;
};

export type HierarchyNodeType =
  | "platform"
  | "organization"
  | "coach"
  | "athlete"
  | "admin";

export type HierarchyNode = {
  id: string;
  type: HierarchyNodeType;
  name: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  children?: HierarchyNode[];
};

export type PlatformHierarchy = {
  root: HierarchyNode;
  stats: {
    organizations: number;
    coaches: number;
    athletes: number;
    admins: number;
    pendingCoaches: number;
    unassignedAthletes: number;
    independentCoaches: number;
  };
};

export function buildPlatformHierarchy(
  users: AdminHierarchyUser[],
  orgs: CoachOrganization[],
  coachOrgMap: Record<string, string>,
): PlatformHierarchy {
  const coaches = users.filter((user) => user.role === "coach");
  const athletes = users.filter((user) => user.role === "atleet");
  const admins = users.filter((user) => user.role === "admin");

  const orgNodes: HierarchyNode[] = orgs.map((org) => {
    const orgCoaches = coaches.filter(
      (coach) => coachOrgMap[coach.id] === org.id,
    );
    const orgCoachIds = new Set(orgCoaches.map((coach) => coach.id));
    const orgAthletes = athletes.filter(
      (athlete) => athlete.coach_id && orgCoachIds.has(athlete.coach_id),
    );

    const coachChildren: HierarchyNode[] = orgCoaches.map((coach) => {
      const coachAthletes = athletes.filter(
        (athlete) => athlete.coach_id === coach.id,
      );

      return {
        id: coach.id,
        type: "coach",
        name: coach.full_name || coach.email || "Coach",
        subtitle:
          coach.id === org.head_coach_id ? "Head coach" : `${coachAthletes.length} atleten`,
        badge: coach.id === org.head_coach_id ? "Head" : undefined,
        href: `/admin?tab=users`,
        children: coachAthletes.map((athlete) => ({
          id: athlete.id,
          type: "athlete",
          name: athlete.full_name || athlete.email || "Atleet",
          subtitle: athlete.email || undefined,
        })),
      };
    });

    return {
      id: org.id,
      type: "organization",
      name: org.name,
      subtitle: `${orgCoaches.length} coaches · ${orgAthletes.length} atleten`,
      badge: org.subscription_status !== "active" ? org.subscription_status : undefined,
      href: `/admin?tab=organizations`,
      children: coachChildren,
    };
  });

  const independentCoaches = coaches.filter(
    (coach) => !coachOrgMap[coach.id],
  );

  const independentCoachNodes: HierarchyNode[] = independentCoaches.map(
    (coach) => ({
      id: coach.id,
      type: "coach",
      name: coach.full_name || coach.email || "Coach",
      subtitle: "Zelfstandig",
      href: `/admin?tab=users`,
      children: athletes
        .filter((athlete) => athlete.coach_id === coach.id)
        .map((athlete) => ({
          id: athlete.id,
          type: "athlete",
          name: athlete.full_name || athlete.email || "Atleet",
          subtitle: athlete.email || undefined,
        })),
    }),
  );

  const unassignedAthletes = athletes.filter((athlete) => !athlete.coach_id);

  const orphanNodes: HierarchyNode[] = unassignedAthletes.map((athlete) => ({
    id: athlete.id,
    type: "athlete",
    name: athlete.full_name || athlete.email || "Atleet",
    subtitle: "Geen coach",
    badge: "Orphan",
  }));

  const adminNodes: HierarchyNode[] = admins.map((admin) => ({
    id: admin.id,
    type: "admin",
    name: admin.full_name || admin.email || "Admin",
    subtitle: "Platformbeheer",
  }));

  const pendingNodes: HierarchyNode[] = users
    .filter((user) => user.role === "pending")
    .map((user) => ({
      id: user.id,
      type: "coach",
      name: user.full_name || user.email || "Aanmelding",
      subtitle: user.pending_kind === "coach" ? "Coach-aanmelding" : "Atleet-aanmelding",
      badge: "Pending",
      href: `/admin?tab=coaches`,
    }));

  const root: HierarchyNode = {
    id: "platform",
    type: "platform",
    name: "Limitless Platform",
    subtitle: "Superadmin · top van de hiërarchie",
    children: [
      ...adminNodes,
      ...orgNodes,
      ...(independentCoachNodes.length > 0
        ? [
            {
              id: "independent-coaches",
              type: "organization" as const,
              name: "Zelfstandige coaches",
              subtitle: `${independentCoachNodes.length} zonder organisatie`,
              children: independentCoachNodes,
            },
          ]
        : []),
      ...(orphanNodes.length > 0
        ? [
            {
              id: "orphan-athletes",
              type: "organization" as const,
              name: "Atleten zonder coach",
              subtitle: `${orphanNodes.length} niet gekoppeld`,
              badge: "Actie",
              href: `/admin?tab=users`,
              children: orphanNodes,
            },
          ]
        : []),
      ...(pendingNodes.length > 0
        ? [
            {
              id: "pending-users",
              type: "organization" as const,
              name: "In afwachting",
              subtitle: `${pendingNodes.length} aanmeldingen`,
              href: `/admin?tab=coaches`,
              children: pendingNodes,
            },
          ]
        : []),
    ],
  };

  return {
    root,
    stats: {
      organizations: orgs.length,
      coaches: coaches.length,
      athletes: athletes.length,
      admins: admins.length,
      pendingCoaches: users.filter(
        (user) => user.role === "pending" && user.pending_kind === "coach",
      ).length,
      unassignedAthletes: unassignedAthletes.length,
      independentCoaches: independentCoaches.length,
    },
  };
}
