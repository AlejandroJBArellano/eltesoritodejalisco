import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional: Check if current user is admin
  // const currentUser = await prisma.user.findUnique({ where: { email: user.email } });
  // if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Sync with Supabase Auth users if database is empty or desynchronized
    const supabaseAdmin = createAdminClient();
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (!authError && authUsers) {
      // Find users that exist in Auth but not in our DB (likely the initial admin)
      for (const authUser of authUsers) {
        const dbUser = await prisma.user.findFirst({
          where: { email: authUser.email },
        });

        if (!dbUser && authUser.email) {
          // Create missing user record from Auth data
          await prisma.user.create({
            data: {
              email: authUser.email,
              name:
                authUser.user_metadata?.name || authUser.email.split("@")[0],
              role: (authUser.user_metadata?.role as any) || "ADMIN", // Default to ADMIN for existing users if role missing
              password: "MANAGED_BY_SUPABASE",
            },
          });
        }
      }
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 },
      );
    }

    // 1. Create user in Supabase Auth
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });

    if (authError) {
      console.error("Supabase Auth Error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario en Supabase" },
        { status: 500 },
      );
    }

    // 2. Create user in Prisma Database
    // We store the Supabase ID as the User ID or link them.
    // The current schema uses CUID for ID. We might want to store the Supabase ID.
    // For now, let's keep the schema as is, but we might have issues linking them if we don't store the Supabase ID.
    // However, the email is unique, so we can link by email.

    // Note: The schema has a 'password' field. Since we use Supabase Auth, we can store a dummy or empty string, or the hashed password if we wanted (but we don't have it hashed).
    // Let's store "MANAGED_BY_SUPABASE" as password placeholder.

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: "MANAGED_BY_SUPABASE", // Placeholder
        // If we want to link by ID, we should probably update the schema to use the Supabase ID.
        // But for now, let's just create it.
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json(); // This is the Prisma User ID

    // Get the user from Prisma to find their email
    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // 1. Delete from Supabase Auth (by email or ID if we had it)
    // We need the Supabase User ID to delete from Auth. We don't have it stored in Prisma (yet).
    // So we search by email.

    const supabaseAdmin = createAdminClient();
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (!listError && users) {
      const authUser = users.find((u) => u.email === userToDelete.email);
      if (authUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
    }

    // 2. Delete from Prisma
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 },
    );
  }
}
