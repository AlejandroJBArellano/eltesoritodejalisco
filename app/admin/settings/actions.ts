"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { headers } from "next/headers";

export interface UpdateSettingsState {
  success?: boolean;
  error?: string;
}

export async function updateTenantSettings(
  formData: FormData,
): Promise<UpdateSettingsState> {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const systemName = formData.get("systemName") as string;
    const rfc = formData.get("rfc") as string;
    const postalCode = formData.get("postalCode") as string;
    const regimenFiscal = formData.get("regimenFiscal") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const secondaryColor = formData.get("secondaryColor") as string;
    const darkBgColor = formData.get("darkBgColor") as string;

    // File Upload handling
    const logoFile = formData.get("logoFile") as File | null;
    let logoUrl = formData.get("logoUrl") as string;

    if (logoFile && logoFile.size > 0) {
      const adminClient = createAdminClient();

      // Ensure the "logos" bucket exists and is public
      try {
        await adminClient.storage.createBucket("logos", { public: true });
      } catch {
        // Bucket already exists — safe to ignore
      }

      const fileExt = logoFile.name.split(".").pop() || "jpg";
      const fileName = `${tenant.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await adminClient.storage
        .from("logos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error for logo:", uploadError);
        return { error: `Error al subir el logo: ${uploadError.message}` };
      }

      const {
        data: { publicUrl },
      } = adminClient.storage.from("logos").getPublicUrl(fileName);

      logoUrl = publicUrl;
    }

    if (!name || !name.trim()) {
      return { error: "El nombre del restaurante es obligatorio" };
    }

    const stripeSecretKey = formData.get("stripeSecretKey") as string;

    const updateData: any = {
      name: name.trim(),
      system_name: systemName ? systemName.trim() : "KittnOS",
      rfc: rfc ? rfc.trim() : null,
      postal_code: postalCode ? postalCode.trim() : null,
      regimen_fiscal: regimenFiscal ? regimenFiscal.trim() : null,
      primary_color: primaryColor || "#FFB7CE",
      secondary_color: secondaryColor || "#FFD1DC",
      dark_bg_color: darkBgColor || "#121212",
      logo_url: logoUrl ? logoUrl.trim() : null,
      updated_at: new Date().toISOString(),
    };

    // Automate Stripe Webhook creation when key is configured/updated
    if (stripeSecretKey === "") {
      // Clear Stripe credentials if input was cleared
      updateData.stripe_secret_key = null;
      updateData.stripe_webhook_secret = null;
    } else if (stripeSecretKey && stripeSecretKey !== "••••••••") {
      const trimmedKey = stripeSecretKey.trim();
      try {
        const stripeClient = getStripeClient(trimmedKey);
        
        // Resolve dynamic server callback origin
        const headersList = await headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host");
        const protocol = headersList.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
        const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "https://trykittn.com";
        
        const webhookUrl = `${origin}/api/webhooks/stripe?tenant_slug=${tenant.slug}`;
        
        // Create the webhook endpoint on the tenant's Stripe account via SDK
        const webhook = await stripeClient.webhookEndpoints.create({
          url: webhookUrl,
          enabled_events: ["checkout.session.completed"],
        });

        updateData.stripe_secret_key = trimmedKey;
        updateData.stripe_webhook_secret = webhook.secret;
      } catch (stripeErr) {
        console.error("Error registering Stripe webhook:", stripeErr);
        return { error: `La llave secreta de Stripe no es válida o no se pudo crear el webhook: ${(stripeErr as Error).message}` };
      }
    }

    const { error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenant.id);

    if (error) {
      console.error("Error updating tenant settings:", error);
      return { error: "Error al guardar los cambios en la base de datos" };
    }

    // Force revalidation of all server-rendered layouts and components
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in updateTenantSettings:", error);
    return { error: "Error interno al procesar los cambios" };
  }
}
