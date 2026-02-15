"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

// Define a type for frontend state since we don't import Prisma types in client components usually
type UserWithRole = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const ROLES = [
  { label: "Administrador", value: "ADMIN" },
  { label: "Gerente", value: "MANAGER" },
  { label: "Mesero", value: "WAITER" },
  { label: "Chef", value: "CHEF" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "WAITER",
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al cargar usuarios");
      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Error al cargar la lista de usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }

      setSuccessMessage("Usuario creado exitosamente");
      setFormData({ name: "", email: "", password: "", role: "WAITER" });
      fetchUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Error al eliminar");

      fetchUsers();
    } catch (error) {
      alert("No se pudo eliminar el usuario");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Usuarios
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          {/* Formulario de Creación */}
          <div className="rounded-2xl bg-white p-6 shadow-md h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Nuevo Usuario
            </h2>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {errorMessage}
                {errorMessage.includes("service role key") && (
                  <p className="mt-1 text-xs">
                    Asegúrate de configurar SUPABASE_SERVICE_ROLE_KEY en las
                    variables de entorno.
                  </p>
                )}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="juan@tesorito.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="******"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:border-blue-500 outline-none"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
              >
                {isSubmitting ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>

          {/* Lista de Usuarios */}
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Usuarios del Sistema
            </h2>

            {isLoading ? (
              <p className="text-gray-500 text-sm">Cargando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          No hay usuarios registrados
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === "ADMIN"
                                  ? "bg-purple-100 text-purple-800"
                                  : user.role === "MANAGER"
                                    ? "bg-blue-100 text-blue-800"
                                    : user.role === "CHEF"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-green-100 text-green-800"
                              }`}
                            >
                              {ROLES.find((r) => r.value === user.role)
                                ?.label || user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900 font-bold text-xs"
                            >
                              ELIMINAR
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
