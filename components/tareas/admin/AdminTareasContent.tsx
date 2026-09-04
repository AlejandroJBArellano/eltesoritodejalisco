"use client";

import React from "react";
import { useAdminTareasContext } from "./AdminTareasContext";
import { AdminTareasNav } from "./AdminTareasNav";
import { AdminTaskHistoryTab } from "./AdminTaskHistoryTab";
import { AdminStaffPerformanceTab } from "./AdminStaffPerformanceTab";
import { AdminTaskConfigTab } from "./AdminTaskConfigTab";
import { TaskCategoryModal } from "./TaskCategoryModal";
import { PrimordialTaskModal } from "./PrimordialTaskModal";

export function AdminTareasContent() {
  const { activeTab } = useAdminTareasContext();

  return (
    <div className="space-y-6">
      <AdminTareasNav />

      {activeTab === "history" && <AdminTaskHistoryTab />}
      {activeTab === "performance" && <AdminStaffPerformanceTab />}
      {activeTab === "config" && <AdminTaskConfigTab />}

      <TaskCategoryModal />
      <PrimordialTaskModal />
    </div>
  );
}
