import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";
import {
  ATTENDANCE_TIMEZONE,
  type AttendanceAction,
  type AttendanceRecord,
  type AttendanceUserOption,
} from "../types";

export function useAsistenciaData(initialCustomTime?: string) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AttendanceUserOption[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customTime, setCustomTime] = useState<string>(
    initialCustomTime ||
      format(new Date(), "HH:mm", { timeZone: ATTENDANCE_TIMEZONE }),
  );

  const fetchAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/attendance");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al cargar asistencia");
      }
      const data = await res.json();
      setIsAdmin(Boolean(data.isAdmin));
      setUsers(data.users || []);
      setAttendances(data.attendances || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asistencia",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleAction = useCallback(
    async (action: AttendanceAction, targetUserId?: string) => {
      try {
        setIsSubmitting(true);
        setError(null);

        let timestamp: string | undefined = undefined;
        if (isAdmin) {
          const today = format(new Date(), "yyyy-MM-dd", {
            timeZone: ATTENDANCE_TIMEZONE,
          });
          timestamp = new Date(`${today}T${customTime}:00-06:00`).toISOString();
        }

        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, targetUserId, timestamp }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Error al registrar asistencia");
        }

        await fetchAttendance();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al registrar asistencia",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isAdmin, customTime, fetchAttendance],
  );

  const getActiveAttendance = useCallback(
    (userId: string) => {
      return attendances.find(
        (a) => a.user_id === userId && a.status === "ACTIVE",
      );
    },
    [attendances],
  );

  const getFinishedAttendances = useCallback(
    (userId: string) => {
      return attendances.filter(
        (a) => a.user_id === userId && a.status === "FINISHED",
      );
    },
    [attendances],
  );

  const getEmployeeHours = useCallback(
    (userId: string) => {
      const finished = getFinishedAttendances(userId);
      return finished.reduce((acc, curr) => {
        if (curr.check_in && curr.check_out) {
          const mins = differenceInMinutes(
            new Date(curr.check_out),
            new Date(curr.check_in),
          );
          return acc + Math.max(0, mins) / 60;
        }
        return acc;
      }, 0);
    },
    [getFinishedAttendances],
  );

  const activeEmployeeAttendance = attendances.find((a) => a.status === "ACTIVE");

  return {
    isAdmin,
    users,
    attendances,
    isLoading,
    isSubmitting,
    error,
    customTime,
    setCustomTime,
    setError,
    fetchAttendance,
    handleAction,
    getActiveAttendance,
    getFinishedAttendances,
    getEmployeeHours,
    activeEmployeeAttendance,
  };
}
