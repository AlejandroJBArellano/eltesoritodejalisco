"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface UpdateSettingsState {
  success?: boolean;
  error?: string;
}

export async function updateTenantSettings(formData: FormData): Promise<UpdateSettingsState> {
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
    const logoUrl = formData.get("logoUrl") as string;

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
        updated_at: new Date().toISOString(),
      })
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
