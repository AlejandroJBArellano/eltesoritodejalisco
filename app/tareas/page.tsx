import { getPrimordialTasks, getTodayExecutions } from "@/lib/actions/tasks";
import { TareasClient } from "@/components/tareas/TareasClient";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CheckSquare } from "lucide-react";

export default async function TareasPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const tasks = await getPrimordialTasks();
  const executions = await getTodayExecutions();

  return (
    <main className="min-h-screen bg-[#121212] text-[#E0E0E0]">
      <PageHeader
        title="Checklist & Tareas Diarias"
        subtitle="Registro y cumplimiento de tareas operativas del turno"
        badgeColor="bg-primary"
        icon={<CheckSquare className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <TareasClient
          initialTasks={tasks}
          initialExecutions={executions}
          userId={user.id}
        />
      </div>
    </main>
  );
}
