import type { SbdLift } from "@/lib/chatVolumeData";

export type VolumeLandmark = {
  mev: number;
  mav: number;
  mrv: number;
};

/** Indicatieve weekly set landmarks (competition lifts). */
export const VOLUME_LANDMARKS: Record<SbdLift, VolumeLandmark> = {
  squat: { mev: 6, mav: 12, mrv: 18 },
  bench: { mev: 8, mav: 16, mrv: 22 },
  deadlift: { mev: 5, mav: 10, mrv: 16 },
};

export type VolumeLandmarkStatus = "below_mev" | "mev_mav" | "mav_mrv" | "above_mrv";

export function classifyWeeklySets(
  sets: number,
  landmark: VolumeLandmark,
): VolumeLandmarkStatus {
  if (sets < landmark.mev) return "below_mev";
  if (sets <= landmark.mav) return "mev_mav";
  if (sets <= landmark.mrv) return "mav_mrv";
  return "above_mrv";
}

export function landmarkStatusLabel(status: VolumeLandmarkStatus) {
  switch (status) {
    case "below_mev":
      return "Onder MEV";
    case "mev_mav":
      return "MEV–MAV";
    case "mav_mrv":
      return "MAV–MRV";
    default:
      return "Boven MRV";
  }
}

export function landmarkStatusClass(status: VolumeLandmarkStatus) {
  switch (status) {
    case "below_mev":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "mev_mav":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "mav_mrv":
      return "text-sky-700 bg-sky-50 border-sky-200";
    default:
      return "text-red-700 bg-red-50 border-red-200";
  }
}
