export const DIVISION_ORDER = [
  "Sub-Juniors",
  "Juniors",
  "Open",
  "Master I",
  "Master II",
  "Master III",
  "Master IV",
] as const;

export type IpfDivision = (typeof DIVISION_ORDER)[number];

export function getCurrentAge(
  birthDate: string,
  referenceDate = new Date(),
) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getCurrentDivision(
  birthDate: string,
  referenceDate = new Date(),
): IpfDivision | "" {
  const age = getCurrentAge(birthDate, referenceDate);
  if (age == null || age < 0) {
    return "";
  }

  if (age < 19) return "Sub-Juniors";
  if (age < 24) return "Juniors";
  if (age < 40) return "Open";
  if (age < 50) return "Master I";
  if (age < 60) return "Master II";
  if (age < 70) return "Master III";
  return "Master IV";
}

export function sortDivisions(values: string[]) {
  return [...values].sort((a, b) => {
    const aIndex = DIVISION_ORDER.indexOf(a as IpfDivision);
    const bIndex = DIVISION_ORDER.indexOf(b as IpfDivision);

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b, "nl");
    }

    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}
