import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { CampaignsContent } from "@/components/customers/campaigns/CampaignsContent";
import type { Tables } from "@/types/supabase";

export const dynamic = "force-dynamic";

async function getCampaignsData() {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { data: campaigns } = await supabase
      .from("loyalty_campaigns")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    const campaignIds = (campaigns || []).map((c) => c.id);
    let recipients: Tables<"loyalty_campaign_recipients">[] = [];

    if (campaignIds.length > 0) {
      const { data: recipientsData } = await supabase
        .from("loyalty_campaign_recipients")
        .select("*")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false });
      recipients = recipientsData || [];
    }

    const recipientsMap: Record<
      string,
      Tables<"loyalty_campaign_recipients">[]
    > = {};
    for (const r of recipients) {
      if (!recipientsMap[r.campaign_id]) {
        recipientsMap[r.campaign_id] = [];
      }
      recipientsMap[r.campaign_id].push(r);
    }

    const enrichedCampaigns = (campaigns || []).map((c) => ({
      ...c,
      recipients: recipientsMap[c.id] || [],
    }));

    const totalCampaigns = enrichedCampaigns.length;
    const totalSent = enrichedCampaigns.reduce(
      (acc, c) => acc + (c.sent_count || 0),
      0,
    );
    const totalFailed = enrichedCampaigns.reduce(
      (acc, c) => acc + (c.failed_count || 0),
      0,
    );
    const uniqueReachedCustomerIds = new Set(
      recipients.filter((r) => r.status === "SENT").map((r) => r.customer_id),
    );

    return {
      campaigns: enrichedCampaigns,
      stats: {
        totalCampaigns,
        totalSent,
        totalFailed,
        uniqueCustomersReached: uniqueReachedCustomerIds.size,
        successRate:
          totalSent + totalFailed > 0
            ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
            : 100,
      },
    };
  } catch (err) {
    console.error("Error loading campaigns page data:", err);
    return {
      campaigns: [],
      stats: {
        totalCampaigns: 0,
        totalSent: 0,
        totalFailed: 0,
        uniqueCustomersReached: 0,
        successRate: 100,
      },
    };
  }
}

export default async function CampaignsPage() {
  const { campaigns, stats } = await getCampaignsData();

  return <CampaignsContent initialCampaigns={campaigns} initialStats={stats} />;
}
