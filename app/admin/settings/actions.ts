"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantContext, invalidateTenantCache } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";

export interface UpdateSettingsState {
  success?: boolean;
  error?: string;
}

export async function updateTenantSettings(
  formData: FormData,
): Promise<UpdateSettingsState> {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return { error: "No autorizado" };
    }
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
    const loyaltyEnabled = formData.get("loyaltyEnabled") === "true";
    const loyaltyRatio = parseInt(formData.get("loyaltyRatio") as string, 10) || 10;
    const googleReviewsUrl = formData.get("googleReviewsUrl") as string;
    const ticketFooterText = formData.get("ticketFooterText") as string;

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

    const { error } = await supabase
      .from("tenants")
      .update({
        name: name.trim(),
        system_name: systemName ? systemName.trim() : "KittnOS",
        rfc: rfc ? rfc.trim() : null,
        postal_code: postalCode ? postalCode.trim() : null,
        regimen_fiscal: regimenFiscal ? regimenFiscal.trim() : null,
        primary_color: primaryColor || "#FFB7CE",
        secondary_color: secondaryColor || "#FFD1DC",
        dark_bg_color: darkBgColor || "#121212",
        logo_url: logoUrl ? logoUrl.trim() : null,
        loyalty_enabled: loyaltyEnabled,
        loyalty_ratio: loyaltyRatio,
        google_reviews_url: googleReviewsUrl ? googleReviewsUrl.trim() : null,
        ticket_footer_text: ticketFooterText ? ticketFooterText.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenant.id);

    if (error) {
      console.error("Error updating tenant settings:", error);
      return { error: "Error al guardar los cambios en la base de datos" };
    }

    // Invalidate in-memory tenant cache
    invalidateTenantCache(tenant.slug);

    // Force revalidation of all server-rendered layouts and components
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in updateTenantSettings:", error);
    return { error: "Error interno al procesar los cambios" };
  }
}
