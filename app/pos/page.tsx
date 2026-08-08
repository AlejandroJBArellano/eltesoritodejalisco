import { getTenantContext } from "@/lib/tenant";
import POSPageClient from "./POSPageClient";

export default async function POSPage() {
  const tenant = await getTenantContext();
  return <POSPageClient tenantId={tenant.id} />;
}
