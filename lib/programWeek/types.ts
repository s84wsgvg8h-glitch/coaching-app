export type ProgramBlock = {
  id: string;
  title: string;
  description: string | null;
  athlete_id: string | null;
  start_date: string | null;
  macrocycle_id?: string | null;
};

export type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

export type ProgramDay = {
  id: string;
  title: string;
  day_number: number;
  program_week_id: string;
  notes: string | null;
  warmup: string | null;
  scheduled_date?: string | null;
};

export type ProgramExercise = {
  id: string;
  program_day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  notes: string | null;
  exercise_number: number | null;
  priority?: string | null;
  exercise_library_id?: string | null;
  exercise_format?: string | null;
  superset_group?: string | null;
  rest_seconds?: number | null;
  block_slot_key?: string | null;
  variation_base_name?: string | null;
};

export type AthleteExerciseSet = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

export type AthleteExerciseNote = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  notes: string | null;
};

export type AthleteExerciseVideo = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  video_url: string | null;
  video_path: string | null;
  file_name: string | null;
  caption: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_content_type?: string | null;
  storage_size_bytes?: number | null;
};

export type AthleteDayCheckin = {
  id?: string;
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  recovery: number | null;
  fatigue: number | null;
  notes: string | null;
};

export type PreviousWeekSetData = {
  weekTitle: string;
  dayTitle: string;
  exerciseName: string;
  rows: AthleteExerciseSet[];
  athleteNote: string;
};

export type VideoRecorderTarget = {
  exercise: ProgramExercise;
  setNumber: number;
};

export const priorityOptions = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
  "quinary",
  "senary",
  "septenary",
];
