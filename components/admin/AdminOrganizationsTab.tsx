"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  assignCoachOrganization,
  createCoachOrganization,
  deleteCoachOrganization,
  loadCoachOrganizations,
  slugifyOrgName,
  type CoachOrganization,
} from "@/lib/adminOrganizations";
import type { AdminUser } from "@/components/admin/AdminUsersTab";

type AdminOrganizationsTabProps = {
  users: AdminUser[];
  onReload: () => Promise<void>;
};

export default function AdminOrganizationsTab({
  users,
  onReload,
}: AdminOrganizationsTabProps) {
  const [orgs, setOrgs] = useState<CoachOrganization[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [coachOrgMap, setCoachOrgMap] = useState<Record<string, string>>({});

  const coaches = users.filter((user) => user.role === "coach");

  const orgById = useMemo(
    () => new Map(orgs.map((org) => [org.id, org.name])),
    [orgs],
  );

  async function reloadOrgs() {
    setOrgs(await loadCoachOrganizations());

    const { data } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("role", "coach");

    const map: Record<string, string> = {};
    for (const row of data || []) {
      if (row.organization_id) {
        map[row.id] = row.organization_id;
      }
    }
    setCoachOrgMap(map);
  }

  useEffect(() => {
    void reloadOrgs();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;

    const { error } = await createCoachOrganization(
      name,
      slug.trim() || undefined,
    );

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setSlug("");
    void reloadOrgs();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Organisatie verwijderen?")) return;
    const { error } = await deleteCoachOrganization(id);
    if (error) alert(error.message);
    else {
      void reloadOrgs();
      void onReload();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Nieuwe organisatie</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slug) setSlug(slugifyOrgName(event.target.value));
            }}
            placeholder="Naam"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="slug"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Aanmaken
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Organisaties</h2>
        <div className="mt-4 space-y-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 p-3"
            >
              <div>
                <p className="font-semibold text-black">{org.name}</p>
                <p className="text-sm text-gray-500">{org.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(org.id)}
                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
              >
                Verwijderen
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Coaches toewijzen</h2>
        <div className="mt-4 space-y-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="font-medium text-black">
                {coach.full_name || coach.email}
              </span>
              <select
                value={coachOrgMap[coach.id] || ""}
                onChange={(event) => {
                  const orgId = event.target.value || null;
                  setCoachOrgMap((current) => {
                    const next = { ...current };
                    if (orgId) next[coach.id] = orgId;
                    else delete next[coach.id];
                    return next;
                  });
                  void assignCoachOrganization(coach.id, orgId).then(onReload);
                }}
                className="rounded-xl border border-gray-300 px-3 py-2"
              >
                <option value="">Geen organisatie</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {coachOrgMap[coach.id] ? (
                <span className="text-xs text-gray-500">
                  {orgById.get(coachOrgMap[coach.id])}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
