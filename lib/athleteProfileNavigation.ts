const RETURN_KEY = "athlete-profile-return";

export function saveAthleteProfileReturn(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_KEY, path);
}

export function getAthleteProfileReturn() {
  if (typeof window === "undefined") return "/dashboard";
  return sessionStorage.getItem(RETURN_KEY) || "/dashboard";
}

export function isProfileOpen(pathname: string) {
  return pathname === "/profile" || pathname.startsWith("/profile?");
}

export function isAthleteProfileOpen(pathname: string) {
  return isProfileOpen(pathname);
}

export const saveProfileReturn = saveAthleteProfileReturn;
export const getProfileReturn = getAthleteProfileReturn;



