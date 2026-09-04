"use client";

import React from "react";
import type { TaskExecution, TaskCategory, PrimordialTask } from "@/types";
import { AdminTareasProvider } from "./admin/AdminTareasContext";
import { AdminTareasContent } from "./admin/AdminTareasContent";

interface AdminTareasClientProps {
  initialExecutions: TaskExecution[];
  initialCategories: TaskCategory[];
  initialTasks: PrimordialTask[];
}

export function AdminTareasClient({
  initialExecutions,
  initialCategories,
  initialTasks,
}: AdminTareasClientProps) {
  return (
    <AdminTareasProvider
      initialExecutions={initialExecutions}
      initialCategories={initialCategories}
      initialTasks={initialTasks}
    >
      <AdminTareasContent />
    </AdminTareasProvider>
  );
}
