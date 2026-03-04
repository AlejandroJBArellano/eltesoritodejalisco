"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createUser, deleteUser, updateUserRole } from "./actions";

type Profile = {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
};

export default function AdminUsersPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [isPending, startTransition] = useTransition();

    // Load profiles on mount
    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/users/list");
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            } else {
                setErrorMsg("Error al obtener usuarios.");
            }
        } catch (e) {
            setErrorMsg("Error desconocido.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");
        const formData = new FormData(e.currentTarget);
        const form = e.currentTarget;

        startTransition(async () => {
            const res = await createUser(formData);
            if (res?.error) {
                setErrorMsg(res.error);
            } else if (res?.success) {
                setSuccessMsg("Usuario creado exitosamente.");
                form.reset();
                fetchProfiles();
            }
        });
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${name}? Esta acción no se puede deshacer.`)) {
            return;
        }

        setErrorMsg("");
        setSuccessMsg("");

        const res = await deleteUser(id);
        if (res?.error) {
            setErrorMsg(res.error);
        } else if (res?.success) {
            setSuccessMsg("Usuario eliminado.");
            fetchProfiles();
        }
    };

    const handleRoleChange = async (id: string, newRole: string) => {
        setErrorMsg("");
        setSuccessMsg("");

        const res = await updateUserRole(id, newRole);
        if (res?.error) {
            setErrorMsg(res.error);
        } else if (res?.success) {
            setSuccessMsg("Rol actualizado.");
            fetchProfiles();
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] pb-12">
            {/* Header */}
            <header className="bg-[#242424] shadow-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <Link
                            href="/"
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            ← Volver al Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-[#E0E0E0]">
                            Personal y Usuarios
                        </h1>
                        <p className="text-sm text-gray-400">
                            Administración de cuentas y permisos
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

                {/* Messages */}
                {errorMsg && (
                    <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
                        {successMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* New User Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#242424] rounded-xl shadow-md p-6 border border-gray-100">
                            <h2 className="text-lg font-bold text-[#E0E0E0] mb-4 flex items-center gap-2">
                                <span>➕</span> Nuevo Usuario
                            </h2>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        className="mt-1 block w-full rounded-md border-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-[#181818] border p-2"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="mt-1 block w-full rounded-md border-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-[#181818] border p-2"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Contraseña Temporal</label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        minLength={6}
                                        className="mt-1 block w-full rounded-md border-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-[#181818] border p-2"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Rol del Empleado</label>
                                    <select
                                        name="role"
                                        required
                                        className="mt-1 block w-full rounded-md border-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-[#181818] border p-2"
                                        defaultValue="WAITER"
                                    >
                                        <option value="ADMIN">Administrador (ADMIN)</option>
                                        <option value="MANAGER">Gerente (MANAGER)</option>
                                        <option value="WAITER">Mesero (WAITER) - Sólo POS/Clientes</option>
                                        <option value="CHEF">Cocinero (CHEF) - Sólo Cocina</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                >
                                    {isPending ? "Creando..." : "Crear Usuario"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* User List */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#242424] rounded-xl shadow-md p-6 border border-gray-100 overflow-x-auto">
                            <h2 className="text-lg font-bold text-[#E0E0E0] mb-4 flex items-center gap-2">
                                <span>👥</span> Personal Registrado
                            </h2>

                            {isLoading ? (
                                <p className="text-gray-400 italic py-4">Cargando usuarios...</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-gray-400">
                                            <th className="py-2">Nombre y Correo</th>
                                            <th className="py-2">Rol Actual</th>
                                            <th className="py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {profiles.map((profile) => (
                                            <tr key={profile.id} className="border-b last:border-0 hover:bg-[#181818]">
                                                <td className="py-3">
                                                    <p className="font-medium text-[#E0E0E0]">{profile.full_name || 'Sin Nombre'}</p>
                                                    <p className="text-xs text-gray-400">{profile.email}</p>
                                                </td>
                                                <td className="py-3">
                                                    <select
                                                        className="bg-[#181818] border border-[#333333] text-[#E0E0E0] text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1 max-w-[130px]"
                                                        value={profile.role}
                                                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                                    >
                                                        <option value="ADMIN">ADMIN</option>
                                                        <option value="MANAGER">MANAGER</option>
                                                        <option value="WAITER">WAITER</option>
                                                        <option value="CHEF">CHEF</option>
                                                    </select>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => handleDelete(profile.id, profile.full_name || profile.email)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {profiles.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-gray-400">
                                                    No hay usuarios registrados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
