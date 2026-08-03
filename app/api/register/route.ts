import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/register
 * Register a new restaurant tenant (Self-serve onboarding)
 * Body: { ownerName, email, password, restaurantName, slug, primaryColor, secondaryColor, darkBgColor }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerName,
      email,
      password,
      restaurantName,
      slug,
      primaryColor,
      secondaryColor,
      darkBgColor,
    } = body;

    // 1. Validation
    if (!ownerName || !email || !password || !restaurantName || !slug) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios deben ser completados" },
        { status: 400 },
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");
    if (!cleanSlug) {
      return NextResponse.json(
        { error: "El subdominio ingresado no es válido" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    // 2. Check if slug already exists
    const { data: existingTenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existingTenant) {
      return NextResponse.json(
        { error: "El subdominio ya está registrado por otro restaurante" },
        { status: 400 },
      );
    }

    // 3. Create Tenant Record
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: restaurantName,
        system_name: `${restaurantName}OS`,
        slug: cleanSlug,
        primary_color: primaryColor || "#ff7da0",
        secondary_color: secondaryColor || "#ff9ebb",
        dark_bg_color: darkBgColor || "#0f0f11",
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error("Error creating tenant:", tenantError);
      return NextResponse.json(
        { error: "Error al registrar el restaurante en la base de datos" },
        { status: 500 },
      );
    }

    // 4. Create Auth User
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email so they can log in immediately
      });

    if (createError || !newUser.user) {
      console.error("Error creating auth user:", createError);
      // Clean up created tenant if auth fails
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Error al crear la cuenta del administrador",
        },
        { status: 500 },
      );
    }

    // 5. Create Profile Record
    const { error: upsertError } = await adminClient.from("profiles").upsert({
      id: newUser.user.id,
      email: email,
      full_name: ownerName,
      role: "ADMIN",
      tenant_id: tenant.id,
    });

    if (upsertError) {
      console.error("Error creating profile:", upsertError);
      // Clean up created auth user and tenant
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "Error al crear el perfil del administrador" },
        { status: 500 },
      );
    }

    // 6. SEED DEFAULT BUSINESS HOURS (Days 0 to 6)
    const defaultHours = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: "09:00",
      close_time: "22:00",
      is_closed: false,
      tenant_id: tenant.id,
    }));

    const { error: hoursError } = await adminClient
      .from("business_hours")
      .insert(defaultHours);

    if (hoursError) {
      console.error(
        "Warning: failed to seed default business hours:",
        hoursError,
      );
    }

    // 7. SEED DEFAULT MENU CATEGORIES
    const defaultCategories = [
      { name: "Comida", sort_order: 1, is_active: true, tenant_id: tenant.id },
      { name: "Bebidas", sort_order: 2, is_active: true, tenant_id: tenant.id },
      { name: "Postres", sort_order: 3, is_active: true, tenant_id: tenant.id },
    ];

    const { error: catsError } = await adminClient
      .from("menu_categories")
      .insert(defaultCategories);

    if (catsError) {
      console.error("Warning: failed to seed default categories:", catsError);
    }

    // 8. SEED DEFAULT TASK CATEGORIES & PRIMORDIAL TASKS
    try {
      const defaultTaskCategories = [
        { name: "Apertura", tenant_id: tenant.id },
        { name: "Cierre", tenant_id: tenant.id },
      ];

      const { data: insertedTaskCats, error: taskCatsError } = await adminClient
        .from("task_categories")
        .insert(defaultTaskCategories)
        .select();

      if (!taskCatsError && insertedTaskCats) {
        const aperturaCat = insertedTaskCats.find(
          (c: any) => c.name === "Apertura",
        );
        const cierreCat = insertedTaskCats.find(
          (c: any) => c.name === "Cierre",
        );

        const defaultTasks = [];
        if (aperturaCat) {
          defaultTasks.push(
            {
              title: "Limpiar mesas y barra",
              category_id: aperturaCat.id,
              shift: "APERTURA",
              tenant_id: tenant.id,
            },
            {
              title: "Verificar stock inicial",
              category_id: aperturaCat.id,
              shift: "APERTURA",
              tenant_id: tenant.id,
            },
          );
        }
        if (cierreCat) {
          defaultTasks.push(
            {
              title: "Hacer corte de caja",
              category_id: cierreCat.id,
              shift: "CIERRE",
              tenant_id: tenant.id,
            },
            {
              title: "Limpiar cocina y apagar parrillas",
              category_id: cierreCat.id,
              shift: "CIERRE",
              tenant_id: tenant.id,
            },
          );
        }

        if (defaultTasks.length > 0) {
          await adminClient.from("primordial_tasks").insert(defaultTasks);
        }
      }
    } catch (taskSeedErr) {
      console.error(
        "Warning: failed to seed task configurations:",
        taskSeedErr,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Registro completado con éxito",
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  } catch (error) {
    console.error("Error in registration controller:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el registro" },
      { status: 500 },
    );
  }
}
