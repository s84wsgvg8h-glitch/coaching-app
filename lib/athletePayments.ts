import { isAdminRole } from "@/lib/authRoles";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { supabase } from "@/lib/supabaseClient";

export type AthletePayment = {
  betaling_prijs: number | null;
  betaling_dag: number | null;
};

const LOCAL_STORAGE_PREFIX = "athlete-payment:";

function getLocalStorageKey(athleteId: string) {
  return `${LOCAL_STORAGE_PREFIX}${athleteId}`;
}

function emptyPayment(): AthletePayment {
  return { betaling_prijs: null, betaling_dag: null };
}

function readLocalPayment(athleteId: string): AthletePayment {
  if (typeof window === "undefined") return emptyPayment();

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(athleteId));
    if (!raw) return emptyPayment();

    const parsed = JSON.parse(raw) as Partial<AthletePayment> & {
      betaling_datum?: string | null;
    };

    return {
      betaling_prijs:
        parsed.betaling_prijs !== null && parsed.betaling_prijs !== undefined
          ? Number(parsed.betaling_prijs)
          : null,
      betaling_dag:
        parsed.betaling_dag !== null && parsed.betaling_dag !== undefined
          ? Number(parsed.betaling_dag)
          : parsed.betaling_datum
            ? new Date(`${parsed.betaling_datum}T12:00:00`).getDate()
            : null,
    };
  } catch {
    return emptyPayment();
  }
}

function writeLocalPayment(athleteId: string, payment: AthletePayment) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getLocalStorageKey(athleteId),
    JSON.stringify(payment),
  );
}

function isMissingPaymentColumnError(message: string) {
  return (
    message.includes("betaling_prijs") ||
    message.includes("betaling_dag") ||
    message.includes("betaling_datum") ||
    message.includes("schema cache")
  );
}

function normalizePaymentRow(row: {
  betaling_prijs?: number | string | null;
  betaling_dag?: number | string | null;
}): AthletePayment {
  return {
    betaling_prijs:
      row.betaling_prijs !== null && row.betaling_prijs !== undefined
        ? Number(row.betaling_prijs)
        : null,
    betaling_dag:
      row.betaling_dag !== null && row.betaling_dag !== undefined
        ? Number(row.betaling_dag)
        : null,
  };
}

export function formatPaymentPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatPaymentPriceCompact(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPaymentDay(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `Elke maand op dag ${value}`;
}

export function isPaymentDashInput(value: string) {
  const trimmed = value.trim();
  return trimmed === "-" || trimmed === "—" || trimmed === "–";
}

export function formatPaymentPriceFieldValue(
  price: number | null | undefined,
) {
  if (price === null || price === undefined || Number.isNaN(price)) return "—";
  return String(price);
}

export function formatPaymentDayFieldValue(
  price: number | null | undefined,
  day: number | null | undefined,
) {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return "—";
  }
  if (day === null || day === undefined || Number.isNaN(day)) return "";
  return String(day);
}

export function parsePaymentPriceInput(value: string): number | null {
  if (isPaymentDashInput(value)) return null;

  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

export function isValidPaymentPriceInput(value: string) {
  if (isPaymentDashInput(value)) return true;

  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return true;

  const parsed = Number.parseFloat(trimmed);
  return !Number.isNaN(parsed) && parsed >= 0;
}

export function paymentPriceInputHasAmount(value: string) {
  if (isPaymentDashInput(value)) return false;

  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return false;

  const parsed = Number.parseFloat(trimmed);
  return !Number.isNaN(parsed) && parsed >= 0;
}

export type MonthlyPaymentStatus = "paid" | "overdue" | "planned";

export type MonthlyPaymentEntry = {
  isoDate: string;
  monthLabel: string;
  dayLabel: string;
  amount: number;
  status: MonthlyPaymentStatus;
};

function clampPaymentDay(year: number, month: number, paymentDay: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(paymentDay, lastDay);
}

export function resolveMonthlyPaymentStatus(
  isoDate: string,
  today = new Date(),
): MonthlyPaymentStatus {
  const payment = new Date(`${isoDate}T12:00:00`);
  const now = new Date(today);
  now.setHours(12, 0, 0, 0);

  if (payment > now) return "planned";

  const sameMonth =
    payment.getFullYear() === now.getFullYear() &&
    payment.getMonth() === now.getMonth();

  if (sameMonth) {
    if (payment.getDate() > now.getDate()) return "planned";
    if (payment.getDate() === now.getDate()) return "planned";
    return "overdue";
  }

  return "paid";
}

export function buildMonthlyPaymentHistory(
  price: number | null,
  paymentDay: number | null,
  monthCount = 8,
): MonthlyPaymentEntry[] {
  if (
    price === null ||
    paymentDay === null ||
    Number.isNaN(price) ||
    Number.isNaN(paymentDay)
  ) {
    return [];
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const entries: MonthlyPaymentEntry[] = [];
  const pastMonths = Math.max(0, monthCount - 3);

  for (let offset = pastMonths; offset >= -2; offset -= 1) {
    const monthAnchor = new Date(
      today.getFullYear(),
      today.getMonth() - offset,
      1,
      12,
      0,
      0,
    );
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const day = clampPaymentDay(year, month, paymentDay);
    const paymentDate = new Date(year, month, day, 12, 0, 0);
    const isoDate = paymentDate.toISOString().slice(0, 10);

    entries.push({
      isoDate,
      monthLabel: paymentDate.toLocaleDateString("nl-NL", {
        month: "short",
        year: "numeric",
      }),
      dayLabel: paymentDate.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      }),
      amount: price,
      status: resolveMonthlyPaymentStatus(isoDate, today),
    });
  }

  return entries;
}

export function parsePaymentDayInput(value: string): number | null {
  if (isPaymentDashInput(value)) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const day = Number.parseInt(trimmed, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return null;
  return day;
}

export function isValidPaymentDayInput(
  dayInput: string,
  priceInput: string,
) {
  if (isPaymentDashInput(dayInput)) {
    return !paymentPriceInputHasAmount(priceInput);
  }

  const trimmed = dayInput.trim();
  if (!trimmed) return true;

  return parsePaymentDayInput(dayInput) !== null;
}

export async function loadAthletePayment(athleteId: string): Promise<{
  payment: AthletePayment;
  source: "remote" | "local";
  migrationRequired: boolean;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("betaling_prijs, betaling_dag")
    .eq("id", athleteId)
    .single();

  if (error) {
    if (isMissingPaymentColumnError(error.message)) {
      return {
        payment: readLocalPayment(athleteId),
        source: "local",
        migrationRequired: true,
      };
    }

    throw error;
  }

  return {
    payment: normalizePaymentRow(data || {}),
    source: "remote",
    migrationRequired: false,
  };
}

export async function saveAthletePayment(
  athleteId: string,
  payment: AthletePayment,
): Promise<{ source: "remote" | "local"; migrationRequired: boolean }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      betaling_prijs: payment.betaling_prijs,
      betaling_dag: payment.betaling_dag,
    })
    .eq("id", athleteId);

  if (error) {
    if (isMissingPaymentColumnError(error.message)) {
      writeLocalPayment(athleteId, payment);
      return { source: "local", migrationRequired: true };
    }

    throw error;
  }

  writeLocalPayment(athleteId, payment);
  return { source: "remote", migrationRequired: false };
}

export async function loadTotalAthleteIncome(
  coachId?: string,
  role?: string,
): Promise<{
  total: number;
  athleteCount: number;
  payingAthleteCount: number;
  migrationRequired: boolean;
}> {
  let query = supabase
    .from("profiles")
    .select("id, betaling_prijs")
    .eq("role", "atleet")
    .is("archived_at", null);

  if (coachId && role && !isAdminRole(role)) {
    const ctx = await loadCoachOrgContext(coachId);
    if (ctx) {
      query = applyAthleteScope(query, { ...ctx, role });
    } else {
      query = query.eq("coach_id", coachId);
    }
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingPaymentColumnError(error.message)) {
      let fallbackQuery = supabase
        .from("profiles")
        .select("id")
        .eq("role", "atleet")
        .is("archived_at", null);

      if (coachId && role && !isAdminRole(role)) {
        const ctx = await loadCoachOrgContext(coachId);
        if (ctx) {
          fallbackQuery = applyAthleteScope(fallbackQuery, { ...ctx, role });
        } else {
          fallbackQuery = fallbackQuery.eq("coach_id", coachId);
        }
      }

      const { data: athletes } = await fallbackQuery;

      const athleteIds = (athletes || []).map((row) => row.id as string);
      let total = 0;
      let payingAthleteCount = 0;

      for (const athleteId of athleteIds) {
        const payment = readLocalPayment(athleteId);
        if (payment.betaling_prijs !== null && !Number.isNaN(payment.betaling_prijs)) {
          total += payment.betaling_prijs;
          payingAthleteCount += 1;
        }
      }

      return {
        total,
        athleteCount: athleteIds.length,
        payingAthleteCount,
        migrationRequired: true,
      };
    }

    throw error;
  }

  const athletes = data || [];
  let total = 0;
  let payingAthleteCount = 0;

  for (const athlete of athletes) {
    const price =
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
        ? Number(athlete.betaling_prijs)
        : null;

    if (price !== null && !Number.isNaN(price)) {
      total += price;
      payingAthleteCount += 1;
    }
  }

  return {
    total,
    athleteCount: athletes.length,
    payingAthleteCount,
    migrationRequired: false,
  };
}

export const PAYMENT_MIGRATION_SQL = `-- Voeg betalingskolommen toe (prijs + dag van de maand)
alter table public.profiles
  add column if not exists betaling_prijs numeric(10, 2),
  add column if not exists betaling_dag smallint;

alter table public.profiles
  drop constraint if exists profiles_betaling_dag_check;

alter table public.profiles
  add constraint profiles_betaling_dag_check
  check (betaling_dag is null or (betaling_dag >= 1 and betaling_dag <= 31));`;
