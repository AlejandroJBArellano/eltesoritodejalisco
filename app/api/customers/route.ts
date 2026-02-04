// TesoritoOS - Customers & CRM API
// Handles customer CRUD operations

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

/**
 * GET /api/customers
 * Get all customers
 */
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers });
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

    let parsedBirthday: Date | null = null;
    if (birthday) {
      const date = new Date(birthday);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid birthday format" },
          { status: 400 },
        );
      }
      parsedBirthday = date;
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        birthday: parsedBirthday,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
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

    let parsedBirthday: Date | null = null;
    if (birthday) {
      const date = new Date(birthday);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid birthday format" },
          { status: 400 },
        );
      }
      parsedBirthday = date;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        birthday: parsedBirthday,
      },
    });

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
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 },
    );
  }
}
