const STORAGE_KEY = "coach-last-athlete-id";

export function getCoachLastAthleteId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setCoachLastAthleteId(athleteId: string) {
  if (typeof window === "undefined" || !athleteId) return;
  window.localStorage.setItem(STORAGE_KEY, athleteId);
}
