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
  debt_balance?: number;
  pending_orders_count?: number;
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

  // Obtener órdenes UNCOLLECTED para calcular deuda
  const { data: unpaidOrders } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      total,
      payments (
        amount
      )
    `)
    .eq("tenant_id", tenant.id)
    .eq("status", "UNCOLLECTED")
    .not("customer_id", "is", null);

  const debtMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};

  (unpaidOrders || []).forEach((order) => {
    if (!order.customer_id) return;
    const totalPaid = (order.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const balance = Math.max(0, Number(order.total || 0) - totalPaid);
    if (balance > 0) {
      debtMap[order.customer_id] = (debtMap[order.customer_id] || 0) + balance;
      countMap[order.customer_id] = (countMap[order.customer_id] || 0) + 1;
    }
  });

  return (customers || []).map((c) => ({
    ...c,
    debt_balance: debtMap[c.id] || 0,
    pending_orders_count: countMap[c.id] || 0,
  }));
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return <CustomersContent initialCustomers={customers} />;
}
