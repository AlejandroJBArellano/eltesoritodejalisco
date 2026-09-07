import type { Database } from "@/types/supabase";

export type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type AttendanceStatus = "ACTIVE" | "FINISHED";

export type AttendanceUserOption = {
  id: string;
  name: string;
  role: string;
};

export type AttendanceRecord = {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  status: AttendanceStatus;
  date: string;
  users?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
};

export type AttendanceAction = "CHECK_IN" | "CHECK_OUT";

export type AttendanceSortField =
  | "name"
  | "role"
  | "date"
  | "check_in"
  | "duration"
  | "status";

export type SortDirection = "asc" | "desc";

export const ATTENDANCE_TIMEZONE = "America/Mexico_City";

export type { EmployeeShift, PunctualityResult } from "./shiftUtils";
