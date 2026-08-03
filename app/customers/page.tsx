import { createClient } from "@/lib/supabase/server";
import { CustomersContent } from "@/components/customers/CustomersContent";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  loyalty_points: number;
  total_spend: number;
  createdAt?: string;
};

import { getTenantContext } from "@/lib/tenant";

async function getCustomers(): Promise<Customer[]> {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return customers || [];
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return <CustomersContent initialCustomers={customers} />;
}
