import {
  getTodayExecutions,
  getTaskCategories,
  getPrimordialTasks,
} from "@/lib/actions/tasks";
import { AdminTareasClient } from "@/components/tareas/AdminTareasClient";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Control de Tareas | KittnOS",
  description:
    "Monitoreo, historial y configuración de checklist operativo diario",
};

export default async function AdminUsersTareasPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const executions = await getTodayExecutions();
  const categories = await getTaskCategories();
  const tasks = await getPrimordialTasks();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <AdminTareasClient
        initialExecutions={executions}
        initialCategories={categories}
        initialTasks={tasks}
      />
    </main>
  );
}
