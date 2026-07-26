import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsersContent } from "@/components/admin/AdminUsersContent";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

async function getUsers(): Promise<Profile[]> {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
    redirect("/");
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } =
    await adminClient.auth.admin.listUsers();

  if (authError) {
    console.error("Error fetching auth users:", authError);
    return [];
  }

  const { data: profiles } = await adminClient.from("profiles").select("*");

  const combinedUsers = authData.users.map((authUser) => {
    const dbProfile = profiles?.find((p) => p.id === authUser.id);
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      full_name:
        authUser.user_metadata?.name || dbProfile?.full_name || "Sin nombre",
      role: dbProfile?.role || authUser.user_metadata?.role || "WAITER",
      created_at: authUser.created_at,
    };
  });

  combinedUsers.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return combinedUsers;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return <AdminUsersContent initialProfiles={users} />;
}
