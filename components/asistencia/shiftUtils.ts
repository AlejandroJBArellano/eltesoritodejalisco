import { format } from "date-fns-tz";
import { ATTENDANCE_TIMEZONE } from "./types";
import type { Database } from "@/types/supabase";

export type EmployeeShift = Database["public"]["Tables"]["employee_shifts"]["Row"];

export type PunctualityResult = {
  status: "ON_TIME" | "LATE" | "NO_SHIFT";
  diffMinutes: number;
  label: string;
};

/**
 * Calculates whether a check-in was on time or late compared to the scheduled shift start time.
 * @param checkInIso ISO string of check-in timestamp
 * @param shiftStartTime Start time of shift (e.g. "08:00" or "08:00:00")
 * @param toleranceMinutes Grace period in minutes (e.g. 10)
 */
export function calculatePunctuality(
  checkInIso?: string | null,
  shiftStartTime?: string | null,
  toleranceMinutes: number = 10
): PunctualityResult {
  if (!checkInIso || !shiftStartTime) {
    return {
      status: "NO_SHIFT",
      diffMinutes: 0,
      label: "Sin turno asignado",
    };
  }

  try {
    const checkInDate = new Date(checkInIso);
    const checkInTimeStr = format(checkInDate, "HH:mm:ss", {
      timeZone: ATTENDANCE_TIMEZONE,
    });

    const [ciH, ciM] = checkInTimeStr.split(":").map(Number);
    const ciTotal = ciH * 60 + ciM;

    const [sH, sM] = shiftStartTime.split(":").map(Number);
    const sTotal = sH * 60 + sM;

    const diff = ciTotal - sTotal;

    if (diff > toleranceMinutes) {
      return {
        status: "LATE",
        diffMinutes: diff,
        label: `Retardo (+${diff} min)`,
      };
    }

    return {
      status: "ON_TIME",
      diffMinutes: Math.max(0, diff),
      label: "A tiempo",
    };
  } catch (err) {
    console.error("Error calculating punctuality:", err);
    return {
      status: "NO_SHIFT",
      diffMinutes: 0,
      label: "Sin turno asignado",
    };
  }
}
