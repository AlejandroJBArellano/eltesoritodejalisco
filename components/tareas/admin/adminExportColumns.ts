import type { ExportColumn } from "@/components/ui/DataTableControls";
import type { PrimordialTask, TaskExecution } from "@/types";
import type { StaffPerformanceMetric } from "./types";

export const EXECUTIONS_EXPORT_COLUMNS: ExportColumn<TaskExecution>[] = [
  {
    header: "Fecha",
    accessor: (e) => (e.created_at ? e.created_at.split("T")[0] : "N/A"),
  },
  { header: "Tarea", accessor: (e) => e.task?.name || e.task_id },
  {
    header: "Categoría",
    accessor: (e) => e.task?.category?.name || "Sin Categoría",
  },
  {
    header: "Colaborador",
    accessor: (e) => e.user?.full_name || "Sin Asignar",
  },
  {
    header: "Estado",
    accessor: (e) => {
      switch (e.status) {
        case "APPROVED":
          return "Aprobada";
        case "COMPLETED":
          return "Listo para Aprobar";
        case "IN_PROGRESS":
          return "En Progreso";
        case "NOT_DONE":
          return "No Realizada";
        default:
          return e.status || "Desconocido";
      }
    },
  },
  {
    header: "Hora Inicio",
    accessor: (e) =>
      e.start_time
        ? new Date(e.start_time).toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
          })
        : "N/A",
  },
  {
    header: "Hora Fin",
    accessor: (e) =>
      e.end_time
        ? new Date(e.end_time).toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
          })
        : "N/A",
  },
  {
    header: "Duración (min)",
    accessor: (e) => {
      if (e.status === "NOT_DONE") return "N/A";
      if (e.net_duration_minutes !== undefined && e.net_duration_minutes !== null) {
        return e.net_duration_minutes;
      }
      if (!e.start_time || !e.end_time) return "N/A";
      const diffMs =
        new Date(e.end_time).getTime() - new Date(e.start_time).getTime();
      return Math.round(diffMs / 60000);
    },
  },
  {
    header: "Aprobada",
    accessor: (e) =>
      e.approved_at ? "Sí" : e.status === "NOT_DONE" ? "No" : "Pendiente",
  },
];

export const PERFORMANCE_EXPORT_COLUMNS: ExportColumn<StaffPerformanceMetric>[] =
  [
    { header: "Colaborador", key: "name" },
    { header: "Tareas Completadas", key: "completedCount" },
    {
      header: "Duración Promedio (min)",
      accessor: (m) => `${m.avgDurationMinutes} min`,
    },
  ];

export const TASKS_CONFIG_EXPORT_COLUMNS: ExportColumn<PrimordialTask>[] = [
  { header: "Tarea", key: "name" },
  { header: "Categoría", accessor: (t) => t.category?.name || "Sin Categoría" },
  { header: "Frecuencia", key: "frequency_type" },
  {
    header: "Tiempo Límite",
    accessor: (t) => `${t.timeout_minutes} min`,
  },
  {
    header: "Requiere Foto",
    accessor: (t) => (t.requires_photo ? "Sí" : "No"),
  },
];
