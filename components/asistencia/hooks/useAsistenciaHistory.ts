import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInMinutes } from "date-fns";
import type {
  AttendanceRecord,
  AttendanceSortField,
  AttendanceUserOption,
  SortDirection,
} from "../types";

export function useAsistenciaHistory() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<AttendanceUserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort & Pagination
  const [sortField, setSortField] = useState<AttendanceSortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let url = "/api/attendance/history?";
      if (selectedUserId !== "ALL") url += `&userId=${encodeURIComponent(selectedUserId)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al obtener historial");
      }
      const data = await res.json();
      setAttendances(data.attendances || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar historial",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId, startDate, endDate]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, [fetchUsers, fetchHistory]);

  const handleApplyFilters = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredAttendances = useMemo(() => {
    return attendances.filter((a) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (a.users?.name || "").toLowerCase().includes(query);
        const matchRole = (a.users?.role || "").toLowerCase().includes(query);
        const matchDate = (a.date || "").includes(query);
        if (!matchName && !matchRole && !matchDate) return false;
      }
      return true;
    });
  }, [attendances, searchQuery]);

  const sortedAttendances = useMemo(() => {
    return [...filteredAttendances].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = (a.users?.name || "").localeCompare(b.users?.name || "");
      } else if (sortField === "role") {
        comp = (a.users?.role || "").localeCompare(b.users?.role || "");
      } else if (sortField === "date") {
        comp = (a.date || "").localeCompare(b.date || "");
      } else if (sortField === "check_in") {
        comp = new Date(a.check_in).getTime() - new Date(b.check_in).getTime();
      } else if (sortField === "duration") {
        const durA = a.check_out
          ? differenceInMinutes(new Date(a.check_out), new Date(a.check_in))
          : 0;
        const durB = b.check_out
          ? differenceInMinutes(new Date(b.check_out), new Date(b.check_in))
          : 0;
        comp = durA - durB;
      } else if (sortField === "status") {
        comp = a.status.localeCompare(b.status);
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredAttendances, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, pageSize]);

  const totalPages = Math.ceil(sortedAttendances.length / pageSize) || 1;
  const paginatedAttendances = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAttendances.slice(start, start + pageSize);
  }, [sortedAttendances, currentPage, pageSize]);

  const handleSort = useCallback((field: AttendanceSortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDirection("desc");
      return field;
    });
  }, []);

  const totalHoursWorked = useMemo(() => {
    return filteredAttendances.reduce((acc, curr) => {
      if (curr.check_in && curr.check_out) {
        const mins = differenceInMinutes(
          new Date(curr.check_out),
          new Date(curr.check_in),
        );
        return acc + Math.max(0, mins) / 60;
      }
      return acc;
    }, 0);
  }, [filteredAttendances]);

  const activeCount = useMemo(() => {
    return filteredAttendances.filter((a) => a.status === "ACTIVE").length;
  }, [filteredAttendances]);

  return {
    attendances,
    users,
    isLoading,
    error,
    selectedUserId,
    setSelectedUserId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    filteredAttendances,
    sortedAttendances,
    paginatedAttendances,
    totalHoursWorked,
    activeCount,
    handleApplyFilters,
    handleSort,
    fetchHistory,
    fetchUsers,
  };
}
