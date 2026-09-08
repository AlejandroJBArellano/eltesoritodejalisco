// TesoritoOS - Customers & CRM API
// Handles customer CRUD operations

import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDate } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import type { Tables, TablesUpdate } from "@/types/supabase";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

/**
 * GET /api/customers
 * Get all customers
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Calcular saldo deudor acumulado de cada cliente
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

    const enrichedCustomers = (customers || []).map((c) => ({
      ...c,
      debt_balance: debtMap[c.id] || 0,
      pending_orders_count: countMap[c.id] || 0,
    }));

    return NextResponse.json({ customers: enrichedCustomers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await request.json();
    const { name, phone, email, birthday } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (email && !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (phone && !phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 },
      );
    }

    let parsedBirthday: string | null = null;
    if (birthday) {
      const date = new Date(birthday);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid birthday format" },
          { status: 400 },
        );
      }
      parsedBirthday = date.toISOString().split("T")[0]; // Use YYYY-MM-DD for Supabase date
    }

    const supabase = await createClient();

    // Comprobar si ya existe un cliente con el mismo teléfono o correo en este tenant
    let existingCustomer: Tables<"customers"> | null = null;

    if (phone && phone.trim()) {
      const { data: byPhone } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("phone", phone.trim())
        .maybeSingle();
      if (byPhone) existingCustomer = byPhone;
    }

    if (!existingCustomer && email && email.trim()) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (byEmail) existingCustomer = byEmail;
    }

    if (existingCustomer) {
      // Actualizar datos si se proporcionaron nuevos valores
      const updatePayload: TablesUpdate<"customers"> = {
        name: name.trim() || existingCustomer.name,
        updated_at: getCurrentCDMXDate(),
      };
      if (phone) updatePayload.phone = phone.trim();
      if (email) updatePayload.email = email.trim().toLowerCase();
      if (parsedBirthday) updatePayload.birthday = parsedBirthday;

      const { data: updated, error: updateError } = await supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", existingCustomer.id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json(
        { customer: updated, isExisting: true },
        { status: 200 }
      );
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        birthday: parsedBirthday,
        updated_at: getCurrentCDMXDate(),
        tenant_id: tenant.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ customer, isExisting: false }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/customers
 * Update a customer
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await request.json();
    const { id, name, phone, email, birthday } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 },
      );
    }

    if (email && !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (phone && !phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 },
      );
    }

    let parsedBirthday: string | null = null;
    if (birthday) {
      const date = new Date(birthday);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid birthday format" },
          { status: 400 },
        );
      }
      parsedBirthday = date.toISOString().split("T")[0];
    }

    const supabase = await createClient();
    const { data: customer, error } = await supabase
      .from("customers")
      .update({
        name,
        phone: phone || null,
        email: email || null,
        birthday: parsedBirthday,
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/customers
 * Delete a customer
 */
export async function DELETE(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const tenant = await getTenantContext();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 },
    );
  }
}
