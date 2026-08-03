import {
  getTodayExecutions,
  getTaskCategories,
  getPrimordialTasks,
} from "@/lib/actions/tasks";
import { AdminTareasClient } from "@/components/tareas/AdminTareasClient";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CheckSquare } from "lucide-react";

export default async function AdminTareasPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const executions = await getTodayExecutions();
  const categories = await getTaskCategories();
  const tasks = await getPrimordialTasks();

  return (
    <main className="min-h-screen bg-background text-text-light">
      <PageHeader
        title="Administración de Tareas"
        subtitle="Control, monitoreo y configuración del checklist operativo diario"
        badgeColor="bg-primary"
        icon={<CheckSquare className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AdminTareasClient
          initialExecutions={executions}
          initialCategories={categories}
          initialTasks={tasks}
        />
      </div>
    </main>
  );
}
