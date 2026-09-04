import type { ExportColumn } from "@/components/ui/DataTableControls";
import { differenceInMinutes } from "date-fns";
import { format } from "date-fns-tz";
import { ATTENDANCE_TIMEZONE, type AttendanceRecord } from "./types";

export function formatAttendanceDuration(
  checkIn: string,
  checkOut: string | null,
): string {
  if (!checkOut) return "En curso...";
  const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  const hours = Math.floor(Math.max(0, mins) / 60);
  const remainingMins = Math.max(0, mins) % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatAttendanceTime(
  isoDateString: string | null | undefined,
): string {
  if (!isoDateString) return "—";
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return "—";
    return format(d, "HH:mm:ss", { timeZone: ATTENDANCE_TIMEZONE });
  } catch {
    return "—";
  }
}

export const ATTENDANCE_EXPORT_COLUMNS: ExportColumn<AttendanceRecord>[] = [
  {
    header: "Empleado",
    accessor: (r) => r.users?.name || "Desconocido",
  },
  {
    header: "Rol",
    accessor: (r) => r.users?.role || "N/A",
  },
  {
    header: "Fecha",
    key: "date",
  },
  {
    header: "Hora Entrada",
    accessor: (r) => formatAttendanceTime(r.check_in),
  },
  {
    header: "Hora Salida",
    accessor: (r) => formatAttendanceTime(r.check_out),
  },
  {
    header: "Duración Total",
    accessor: (r) => formatAttendanceDuration(r.check_in, r.check_out),
  },
  {
    header: "Estado",
    accessor: (r) => (r.status === "ACTIVE" ? "En Turno" : "Finalizado"),
  },
];
