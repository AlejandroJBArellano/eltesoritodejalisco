// TesoritoOS / KittnOS - Loyalty Campaigns API
// Handles loyalty campaign creation, segmentation, dispatch via Resend, and history

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { sendLoyaltyCampaignEmail } from "@/lib/services/email";
import type { Tables } from "@/types/supabase";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export interface CampaignFilters {
  inactiveDays?: number;
  minPoints?: number;
  frequency?: "all" | "recurrent" | "inactive";
  antiSaturationDays?: number;
}

/**
 * Filters a list of customers based on campaign criteria
 */
export function filterCampaignAudience(
  customers: Tables<"customers">[],
  orders: { customer_id: string | null; created_at: string }[],
  recentRecipients: { customer_id: string; sent_at: string | null }[],
  filters: CampaignFilters = {},
  nowDate = new Date(),
) {
  const {
    inactiveDays = 0,
    minPoints = 0,
    frequency = "all",
    antiSaturationDays = 0,
  } = filters;

  // Map orders to latest date and count
  const customerOrdersMap: Record<
    string,
    { lastOrderDate: Date | null; count: number }
  > = {};
  for (const o of orders) {
    if (!o.customer_id) continue;
    const existing = customerOrdersMap[o.customer_id] || {
      lastOrderDate: null,
      count: 0,
    };
    existing.count += 1;
    const orderDate = new Date(o.created_at);
    if (!existing.lastOrderDate || orderDate > existing.lastOrderDate) {
      existing.lastOrderDate = orderDate;
    }
    customerOrdersMap[o.customer_id] = existing;
  }

  // Map recent sent emails
  const recentSentMap: Record<string, Date> = {};
  for (const r of recentRecipients) {
    if (!r.sent_at) continue;
    const sentDate = new Date(r.sent_at);
    const existing = recentSentMap[r.customer_id];
    if (!existing || sentDate > existing) {
      recentSentMap[r.customer_id] = sentDate;
    }
  }

  return customers.filter((c) => {
    // Must have a valid email
    if (!c.email || !emailRegex.test(c.email.trim())) {
      return false;
    }

    const orderInfo = customerOrdersMap[c.id];
    const lastActivityDate =
      orderInfo?.lastOrderDate ||
      (c.created_at ? new Date(c.created_at) : new Date(0));
    const daysSinceActivity = Math.max(
      0,
      Math.floor(
        (nowDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const orderCount = orderInfo?.count || 0;

    // Filter by inactive days
    if (inactiveDays > 0 && daysSinceActivity < inactiveDays) {
      return false;
    }

    // Filter by points
    if (minPoints > 0 && (c.loyalty_points || 0) < minPoints) {
      return false;
    }

    // Filter by frequency
    if (frequency === "recurrent" && orderCount < 3) {
      return false;
    }
    if (frequency === "inactive" && daysSinceActivity < 30) {
      return false;
    }

    // Filter by anti-saturation
    if (antiSaturationDays > 0) {
      const lastSent = recentSentMap[c.id];
      if (lastSent) {
        const daysSinceSent = Math.floor(
          (nowDate.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceSent < antiSaturationDays) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * GET /api/customers/campaigns
 * Returns campaign history with stats and recipients
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";

    // Audience preview mode
    if (isPreview) {
      const inactiveDays = Number(searchParams.get("inactiveDays") || 0);
      const minPoints = Number(searchParams.get("minPoints") || 0);
      const frequency = (searchParams.get("frequency") || "all") as
        | "all"
        | "recurrent"
        | "inactive";
      const antiSaturationDays = Number(
        searchParams.get("antiSaturationDays") || 0,
      );

      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenant.id);

      const { data: orders } = await supabase
        .from("orders")
        .select("customer_id, created_at")
        .eq("tenant_id", tenant.id)
        .not("customer_id", "is", null);

      const { data: recentRecipients } = await supabase
        .from("loyalty_campaign_recipients")
        .select("customer_id, sent_at")
        .eq("tenant_id", tenant.id)
        .eq("status", "SENT");

      const audience = filterCampaignAudience(
        customers || [],
        orders || [],
        recentRecipients || [],
        { inactiveDays, minPoints, frequency, antiSaturationDays },
      );

      return NextResponse.json({
        totalAudienceCount: audience.length,
        sample: audience.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          loyalty_points: c.loyalty_points,
        })),
      });
    }

    // Fetch campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("loyalty_campaigns")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (campaignsError) throw campaignsError;

    // Fetch recipients for these campaigns
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

    // Calculate aggregated stats
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error in GET /api/customers/campaigns:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de campañas" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customers/campaigns
 * Creates a new campaign, targets audience, and sends emails
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "No tienes permisos para enviar campañas" },
        { status: 403 },
      );
    }

    const tenant = await getTenantContext();
    const body = await request.json();
    const {
      name,
      subject,
      templateKey = "te_extranamos",
      messageContent,
      filters = {},
      previewOnly = false,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre de la campaña es obligatorio" },
        { status: 400 },
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: "El asunto del correo es obligatorio" },
        { status: 400 },
      );
    }

    if (!messageContent || !messageContent.trim()) {
      return NextResponse.json(
        { error: "El contenido del mensaje es obligatorio" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Fetch customers, orders, and recent recipients
    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenant.id);

    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id, created_at")
      .eq("tenant_id", tenant.id)
      .not("customer_id", "is", null);

    const { data: recentRecipients } = await supabase
      .from("loyalty_campaign_recipients")
      .select("customer_id, sent_at")
      .eq("tenant_id", tenant.id)
      .eq("status", "SENT");

    const targetAudience = filterCampaignAudience(
      customers || [],
      orders || [],
      recentRecipients || [],
      filters,
    );

    if (previewOnly) {
      return NextResponse.json({
        totalAudienceCount: targetAudience.length,
        audience: targetAudience.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          loyalty_points: c.loyalty_points,
        })),
      });
    }

    if (targetAudience.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se encontraron clientes con correo electrónico válido que cumplan los filtros seleccionados.",
        },
        { status: 400 },
      );
    }

    // Create campaign record
    const { data: campaign, error: campaignCreateError } = await supabase
      .from("loyalty_campaigns")
      .insert({
        tenant_id: tenant.id,
        name: name.trim(),
        subject: subject.trim(),
        template_key: templateKey,
        message_content: messageContent.trim(),
        segment_filters: filters,
        status: "SENDING",
        total_recipients: targetAudience.length,
        sent_count: 0,
        failed_count: 0,
        created_by: profile.id,
      })
      .select()
      .single();

    if (campaignCreateError || !campaign) {
      throw campaignCreateError || new Error("Error al crear campaña");
    }

    // Create recipient records
    const recipientInserts = targetAudience.map((c) => ({
      campaign_id: campaign.id,
      tenant_id: tenant.id,
      customer_id: c.id,
      customer_name: c.name,
      customer_email: c.email!,
      loyalty_points: c.loyalty_points || 0,
      status: "PENDING",
    }));

    const { data: recipients, error: recipientsInsertError } = await supabase
      .from("loyalty_campaign_recipients")
      .insert(recipientInserts)
      .select();

    if (recipientsInsertError) {
      console.error(
        "Error inserting campaign recipients:",
        recipientsInsertError,
      );
    }

    // Process dispatch in batches with error isolation
    let sentCount = 0;
    let failedCount = 0;
    const nowUtc = new Date().toISOString();

    for (const recipient of targetAudience) {
      const emailResult = await sendLoyaltyCampaignEmail({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          system_name: tenant.system_name,
          primary_color: tenant.primary_color,
          logo_url: tenant.logo_url,
        },
        customerName: recipient.name,
        customerEmail: recipient.email!,
        loyaltyPoints: recipient.loyalty_points || 0,
        subject: subject.trim(),
        messageContent: messageContent.trim(),
        templateKey,
      });

      const recipientRecord = (recipients || []).find(
        (r) => r.customer_id === recipient.id,
      );

      if (emailResult.success) {
        sentCount += 1;
        if (recipientRecord) {
          await supabase
            .from("loyalty_campaign_recipients")
            .update({
              status: "SENT",
              sent_at: nowUtc,
            })
            .eq("id", recipientRecord.id);
        }
      } else {
        failedCount += 1;
        if (recipientRecord) {
          await supabase
            .from("loyalty_campaign_recipients")
            .update({
              status: "FAILED",
              error_message: String(emailResult.error || "Error de envío"),
            })
            .eq("id", recipientRecord.id);
        }
      }
    }

    const finalStatus =
      failedCount === targetAudience.length ? "FAILED" : "SENT";

    const { data: updatedCampaign } = await supabase
      .from("loyalty_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: nowUtc,
      })
      .eq("id", campaign.id)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign || campaign,
      sentCount,
      failedCount,
      totalRecipients: targetAudience.length,
    });
  } catch (error) {
    console.error("Error in POST /api/customers/campaigns:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al procesar campaña",
      },
      { status: 500 },
    );
  }
}
