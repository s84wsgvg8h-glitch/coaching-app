"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Shield, Trash2, UserPlus } from "lucide-react";
import {
  addChatGroupMembers,
  loadChatGroupDetails,
  removeChatGroupMember,
  setChatGroupMemberRole,
  updateChatGroupSettings,
  type ChatGroupDetails,
} from "@/lib/chatGroups";
import { uploadAvatar, updateGroupAvatar } from "@/lib/chatAvatars";
import { saveChatReturnRoute } from "@/lib/chatNavigation";
import ChatAvatar from "@/components/chat/ChatAvatar";
import type { ChatProfile } from "@/lib/chatUtils";

type GroupInfoPanelProps = {
  groupId: string;
  userId: string;
  contacts: ChatProfile[];
  onBack: () => void;
  onUpdated?: () => void;
};

export default function GroupInfoPanel({
  groupId,
  userId,
  contacts,
  onBack,
  onUpdated,
}: GroupInfoPanelProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ChatGroupDetails | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  async function refreshDetails() {
    setLoading(true);
    const loaded = await loadChatGroupDetails(groupId, userId);
    setDetails(loaded);
    setDescriptionDraft(loaded?.description || "");
    setLoading(false);
  }

  useEffect(() => {
    void refreshDetails();
  }, [groupId, userId]);

  const availableContacts = useMemo(() => {
    const memberIds = new Set(details?.members.map((member) => member.user_id));

    return contacts.filter((contact) => !memberIds.has(contact.id));
  }, [contacts, details?.members]);

  async function handleAddMembers() {
    if (!details || selectedMemberIds.length === 0) return;

    setSaving(true);
    const { error } = await addChatGroupMembers(groupId, selectedMemberIds);
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedMemberIds([]);
    setAddOpen(false);
    await refreshDetails();
    onUpdated?.();
  }

  async function handleToggleAdmin(memberId: string, makeAdmin: boolean) {
    if (!details?.canManage || memberId === userId) return;

    const { error } = await setChatGroupMemberRole(
      groupId,
      memberId,
      makeAdmin ? "admin" : "member",
    );

    if (error) {
      alert(error.message);
      return;
    }

    await refreshDetails();
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!details?.canManage || memberId === userId) return;

    if (!confirm(`${memberName} uit de groep verwijderen?`)) return;

    const { error } = await removeChatGroupMember(groupId, memberId);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshDetails();
    onUpdated?.();
  }

  async function handleSaveDescription() {
    if (!details?.canManage) return;

    setSaving(true);
    const { error } = await updateChatGroupSettings(groupId, {
      description: descriptionDraft.trim() || null,
    });
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshDetails();
    onUpdated?.();
  }

  async function handleToggleAdminsOnly(enabled: boolean) {
    if (!details?.canManage) return;

    const { error } = await updateChatGroupSettings(groupId, {
      admins_only: enabled,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await refreshDetails();
    onUpdated?.();
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !details?.canManage) return;

    setSaving(true);
    const { url, error: uploadError } = await uploadAvatar(
      userId,
      file,
      `group-${groupId}`,
    );

    if (uploadError || !url) {
      setSaving(false);
      alert(uploadError?.message || "Upload mislukt");
      return;
    }

    const { error } = await updateGroupAvatar(groupId, url);
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshDetails();
    onUpdated?.();

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  if (loading && !details) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Groepsinfo laden...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-gray-500">Groep niet gevonden.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Terug naar chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-100">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => void handleAvatarChange(event)}
        className="hidden"
      />

      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 md:px-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl p-2 hover:bg-gray-100"
          aria-label="Terug naar groepschat"
        >
          <ArrowLeft className="h-5 w-5 text-black" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-black">{details.name}</h2>
          <p className="text-sm text-gray-500">Groepsinfo</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-gray-200 bg-white px-4 py-8 text-center">
          <button
            type="button"
            disabled={!details.canManage || saving}
            onClick={() => avatarInputRef.current?.click()}
            className="mx-auto block disabled:opacity-50"
          >
            <ChatAvatar
              name={details.name}
              imageUrl={details.avatar_url}
              className="mx-auto mb-4 h-24 w-24 text-3xl"
              fallbackClassName="bg-gray-700 text-white"
            />
          </button>
          <h3 className="text-2xl font-bold text-black">{details.name}</h3>
          {details.description && (
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {details.description}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            {details.members.length} deelnemers
          </p>
        </div>

        {details.canManage && (
          <div className="mt-3 space-y-3">
            <div className="border-y border-gray-200 bg-white px-4 py-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                Beschrijving
              </label>
              <textarea
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                rows={3}
                placeholder="Voeg een groepsbeschrijving toe..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => void handleSaveDescription()}
                disabled={saving}
                className="mt-3 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Beschrijving opslaan
              </button>
            </div>

            <div className="border-y border-gray-200 bg-white px-4 py-4">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-black">Alleen beheerders</p>
                  <p className="text-sm text-gray-500">
                    Alleen beheerders kunnen berichten sturen
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(details.admins_only)}
                  onChange={(event) =>
                    void handleToggleAdminsOnly(event.target.checked)
                  }
                  className="h-5 w-5"
                />
              </label>
            </div>

            <div className="border-y border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setAddOpen((current) => !current)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <UserPlus className="h-5 w-5 text-black" />
                </span>
                <span className="font-semibold text-black">Deelnemer toevoegen</span>
              </button>
            </div>
          </div>
        )}

        {addOpen && details.canManage && (
          <div className="border-b border-gray-200 bg-white px-4 py-4">
            <div className="mb-3 max-h-48 overflow-y-auto rounded-2xl border border-gray-200">
              {availableContacts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">
                  Geen atleten meer om toe te voegen.
                </p>
              ) : (
                availableContacts.map((contact) => {
                  const checked = selectedMemberIds.includes(contact.id);

                  return (
                    <label
                      key={contact.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedMemberIds((current) =>
                            checked
                              ? current.filter((id) => id !== contact.id)
                              : [...current, contact.id],
                          )
                        }
                      />
                      <span className="font-semibold text-black">
                        {contact.full_name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleAddMembers()}
              disabled={saving || selectedMemberIds.length === 0}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Toevoegen..." : "Toevoegen aan groep"}
            </button>
          </div>
        )}

        <div className="mt-3 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
              Deelnemers
            </p>
          </div>

          {details.members.map((member) => {
            const isSelf = member.user_id === userId;

            return (
              <div
                key={member.user_id}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <Link
                  href={`/profile/${member.user_id}`}
                  onClick={() => saveChatReturnRoute(`/chat/group/${groupId}/info`)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ChatAvatar
                    name={member.full_name}
                    className="h-11 w-11"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-black">
                      {member.full_name}
                      {isSelf ? " (jij)" : ""}
                    </p>
                    <p className="text-sm text-gray-500">
                      {member.role === "admin" ? "Beheerder" : "Lid"}
                    </p>
                  </div>
                </Link>

                {details.canManage && !isSelf && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleAdmin(
                          member.user_id,
                          member.role !== "admin",
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        member.role === "admin"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-black text-white"
                      }`}
                    >
                      {member.role === "admin" ? (
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          Beheerder
                        </span>
                      ) : (
                        "Maak beheerder"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleRemoveMember(member.user_id, member.full_name)
                      }
                      className="rounded-full bg-red-50 p-2 text-red-600"
                      aria-label={`Verwijder ${member.full_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
