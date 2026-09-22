import { redirect } from "next/navigation";

export default function AdminUsersRootPage() {
  redirect("/admin/users/list");
}
