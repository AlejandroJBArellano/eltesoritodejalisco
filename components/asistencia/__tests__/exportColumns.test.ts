import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_EXPORT_COLUMNS,
  formatAttendanceDuration,
  formatAttendanceTime,
} from "../exportColumns";
import type { AttendanceRecord } from "../types";

describe("Attendance exportColumns", () => {
  const mockRecord: AttendanceRecord = {
    id: "att-1",
    user_id: "user-1",
    date: "2026-09-03",
    check_in: "2026-09-03T15:00:00Z",
    check_out: "2026-09-03T23:30:00Z",
    status: "FINISHED",
    users: {
      id: "user-1",
      name: "Juan Pérez",
      email: "juan@test.com",
      role: "WAITER",
    },
  };

  const mockActiveRecord: AttendanceRecord = {
    id: "att-2",
    user_id: "user-2",
    date: "2026-09-03",
    check_in: "2026-09-03T16:00:00Z",
    check_out: null,
    status: "ACTIVE",
    users: {
      id: "user-2",
      name: "María Gómez",
      email: "maria@test.com",
      role: "CHEF",
    },
  };

  it("formatAttendanceDuration returns correct formatted duration for finished shift", () => {
    expect(
      formatAttendanceDuration(mockRecord.check_in, mockRecord.check_out),
    ).toBe("8h 30m");
  });

  it("formatAttendanceDuration returns 'En curso...' when check_out is null", () => {
    expect(
      formatAttendanceDuration(mockActiveRecord.check_in, null),
    ).toBe("En curso...");
  });

  it("formatAttendanceTime formats valid dates in Mexico City timezone", () => {
    // 2026-09-03T15:00:00Z in America/Mexico_City (UTC-6) is 09:00:00
    const formatted = formatAttendanceTime("2026-09-03T15:00:00Z");
    expect(formatted).toBe("09:00:00");
  });

  it("formatAttendanceTime handles null or invalid dates gracefully", () => {
    expect(formatAttendanceTime(null)).toBe("—");
    expect(formatAttendanceTime("invalid-date")).toBe("—");
  });

  it("ATTENDANCE_EXPORT_COLUMNS extracts all fields correctly", () => {
    const findCol = (header: string) =>
      ATTENDANCE_EXPORT_COLUMNS.find((c) => c.header === header);

    const empCol = findCol("Empleado");
    expect(empCol?.accessor?.(mockRecord)).toBe("Juan Pérez");

    const rolCol = findCol("Rol");
    expect(rolCol?.accessor?.(mockRecord)).toBe("WAITER");

    const fechaCol = findCol("Fecha");
    expect(fechaCol?.key).toBe("date");

    const inCol = findCol("Hora Entrada");
    expect(inCol?.accessor?.(mockRecord)).toBe("09:00:00");

    const outCol = findCol("Hora Salida");
    expect(outCol?.accessor?.(mockRecord)).toBe("17:30:00");

    const durCol = findCol("Duración Total");
    expect(durCol?.accessor?.(mockRecord)).toBe("8h 30m");

    const estCol = findCol("Estado");
    expect(estCol?.accessor?.(mockRecord)).toBe("Finalizado");
    expect(estCol?.accessor?.(mockActiveRecord)).toBe("En Turno");
  });

  it("falls back to default values when user relation is missing", () => {
    const recordNoUser: AttendanceRecord = {
      ...mockRecord,
      users: undefined,
    };
    const empCol = ATTENDANCE_EXPORT_COLUMNS.find((c) => c.header === "Empleado");
    const rolCol = ATTENDANCE_EXPORT_COLUMNS.find((c) => c.header === "Rol");
    expect(empCol?.accessor?.(recordNoUser)).toBe("Desconocido");
    expect(rolCol?.accessor?.(recordNoUser)).toBe("N/A");
  });
});
