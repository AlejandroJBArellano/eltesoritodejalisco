import type { PrimordialTask, TaskCategory, TaskExecution, TaskFrequency } from "@/types";

export type AdminTareasTab = "history" | "performance" | "config";

export interface StaffPerformanceMetric {
  userId: string;
  name: string;
  completedCount: number;
  avgDurationMinutes: number;
}

export type ExecSortField = "task" | "user" | "status" | "duration";
export type TaskSortField = "name" | "category" | "frequency";
export type SortDir = "asc" | "desc";

export interface TaskFormData {
  name: string;
  categoryId: string;
  frequencyType: TaskFrequency;
  requiresPhoto: boolean;
  timeoutMinutes: number;
}
