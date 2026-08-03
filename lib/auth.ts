import { createClient } from "./supabase/server";
import { getTenantContext } from "./tenant";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .eq("tenant_id", tenant.id)
    .single();

  return profile;
}

export type UserRole = "ADMIN" | "MANAGER" | "WAITER" | "CHEF";
