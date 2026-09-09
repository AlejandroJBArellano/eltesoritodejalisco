import { describe, it, expect } from "vitest";
import {
  EXECUTIONS_EXPORT_COLUMNS,
  PERFORMANCE_EXPORT_COLUMNS,
  TASKS_CONFIG_EXPORT_COLUMNS,
} from "../adminExportColumns";
import type { PrimordialTask, TaskExecution } from "@/types";
import type { StaffPerformanceMetric } from "../types";

describe("adminExportColumns", () => {
  it("extracts execution columns correctly", () => {
    const mockExecution: TaskExecution = {
      id: "e-1",
      task_id: "t-1",
      user_id: "u-1",
      status: "COMPLETED",
      start_time: "2026-09-03T10:00:00Z",
      end_time: "2026-09-03T10:45:00Z",
      paused_seconds: 0,
      created_at: "2026-09-03T10:00:00Z",
      updated_at: "2026-09-03T10:45:00Z",
      approved_at: "2026-09-03T11:00:00Z",
      task: {
        id: "t-1",
        name: "Limpieza profunda",
        category_id: "c-1",
        frequency_type: "DAILY",
        timeout_minutes: 60,
        requires_photo: true,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
      user: {
        id: "u-1",
        full_name: "Esteban Cocinero",
      },
    };

    const dateCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Fecha");
    expect(dateCol?.accessor?.(mockExecution)).toBe("2026-09-03");

    const catCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Categoría");
    expect(catCol?.accessor?.(mockExecution)).toBe("Sin Categoría");

    const statusCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Estado");
    expect(statusCol?.accessor?.(mockExecution)).toBe("Listo para Aprobar");

    const taskCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Tarea");
    expect(taskCol?.accessor?.(mockExecution)).toBe("Limpieza profunda");

    const userCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Colaborador");
    expect(userCol?.accessor?.(mockExecution)).toBe("Esteban Cocinero");

    const durCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Duración (min)");
    expect(durCol?.accessor?.(mockExecution)).toBe(45);

    const appCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Aprobada");
    expect(appCol?.accessor?.(mockExecution)).toBe("Sí");
  });

  it("handles NOT_DONE virtual executions and Net duration in EXECUTIONS_EXPORT_COLUMNS", () => {
    const notDoneExec: TaskExecution = {
      id: "not-done-1",
      task_id: "t-2",
      status: "NOT_DONE",
      paused_seconds: 0,
      created_at: "2026-09-03T00:00:00Z",
      updated_at: "2026-09-03T00:00:00Z",
      task: {
        id: "t-2",
        name: "Revisar Inventario",
        category_id: "c-2",
        frequency_type: "DAILY",
        timeout_minutes: 30,
        requires_photo: false,
        is_active: true,
        created_at: "",
        updated_at: "",
        category: {
          id: "c-2",
          name: "Almacén",
          created_at: "",
          updated_at: "",
        },
      },
    };

    const catCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Categoría");
    expect(catCol?.accessor?.(notDoneExec)).toBe("Almacén");

    const statusCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Estado");
    expect(statusCol?.accessor?.(notDoneExec)).toBe("No Realizada");

    const userCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Colaborador");
    expect(userCol?.accessor?.(notDoneExec)).toBe("Sin Asignar");

    const durCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Duración (min)");
    expect(durCol?.accessor?.(notDoneExec)).toBe("N/A");

    const appCol = EXECUTIONS_EXPORT_COLUMNS.find((c) => c.header === "Aprobada");
    expect(appCol?.accessor?.(notDoneExec)).toBe("No");

    // With explicit net_duration_minutes
    const execWithNetDur: TaskExecution = {
      ...notDoneExec,
      status: "APPROVED",
      net_duration_minutes: 18,
    };
    expect(durCol?.accessor?.(execWithNetDur)).toBe(18);
    expect(statusCol?.accessor?.(execWithNetDur)).toBe("Aprobada");
  });

  it("extracts performance columns correctly", () => {
    const mockMetric: StaffPerformanceMetric = {
      userId: "u-1",
      name: "Laura",
      completedCount: 8,
      avgDurationMinutes: 22,
    };

    const nameCol = PERFORMANCE_EXPORT_COLUMNS.find((c) => c.header === "Colaborador");
    expect(nameCol?.key).toBe("name");

    const durCol = PERFORMANCE_EXPORT_COLUMNS.find((c) => c.header === "Duración Promedio (min)");
    expect(durCol?.accessor?.(mockMetric)).toBe("22 min");
  });

  it("extracts tasks config columns correctly", () => {
    const mockTask: PrimordialTask = {
      id: "t-1",
      name: "Revisar gas",
      category_id: "c-1",
      frequency_type: "DAILY",
      timeout_minutes: 10,
      requires_photo: false,
      is_active: true,
      created_at: "",
      updated_at: "",
      category: {
        id: "c-1",
        name: "Seguridad",
        created_at: "",
        updated_at: "",
      },
    };

    const catCol = TASKS_CONFIG_EXPORT_COLUMNS.find((c) => c.header === "Categoría");
    expect(catCol?.accessor?.(mockTask)).toBe("Seguridad");

    const timeCol = TASKS_CONFIG_EXPORT_COLUMNS.find((c) => c.header === "Tiempo Límite");
    expect(timeCol?.accessor?.(mockTask)).toBe("10 min");

    const photoCol = TASKS_CONFIG_EXPORT_COLUMNS.find((c) => c.header === "Requiere Foto");
    expect(photoCol?.accessor?.(mockTask)).toBe("No");
  });
});
