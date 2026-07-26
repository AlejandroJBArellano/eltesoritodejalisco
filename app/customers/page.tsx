"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Users,
  Award,
  DollarSign,
  BarChart3,
  User,
  Phone,
  Mail,
  Cake,
  Search,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowLeft,
  X,
  AlertTriangle,
  Gift,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  loyalty_points: number;
  total_spend: number;
  createdAt?: string;
};

type CustomerFormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
};

const emptyForm: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  birthday: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CustomerFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const isEditing = Boolean(formState.id);

  const totalLoyaltyPoints = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => acc + (customer.loyalty_points || 0),
        0,
      ),
    [customers],
  );

  const totalSpendSum = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => acc + Number(customer.total_spend || 0),
        0,
      ),
    [customers],
  );

  const avgPointsPerCustomer = useMemo(
    () =>
      customers.length > 0 ? (totalLoyaltyPoints / customers.length).toFixed(1) : "0",
    [customers, totalLoyaltyPoints],
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  }, [customers, searchQuery]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar clientes");
      }
      setCustomers(data.customers || []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const validateForm = (state: CustomerFormState) => {
    const errors: Record<string, string> = {};

    if (!state.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    if (state.email && !emailRegex.test(state.email)) {
      errors.email = "El correo no es válido";
    }

    if (state.phone && !phoneRegex.test(state.phone)) {
      errors.phone = "El teléfono no es válido";
    }

    return errors;
  };

  const handleFormChange = (field: keyof CustomerFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setFormErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: formState.id,
        name: formState.name.trim(),
        phone: formState.phone || undefined,
        email: formState.email || undefined,
        birthday: formState.birthday || undefined,
      };

      const response = await fetch("/api/customers", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el cliente");
      }
      await fetchCustomers();
      resetForm();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormState({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      birthday: customer.birthday
        ? new Date(customer.birthday).toISOString().slice(0, 10)
        : "",
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (customerId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este cliente? Esta acción no se puede deshacer.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el cliente");
      }
      await fetchCustomers();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0]">
      {/* Top Navbar */}
      <header className="bg-[#121212]/90 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-1.5 text-xs font-bold text-[#E0E0E0]/60 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Dashboard
            </Link>
            <span className="text-white/20">|</span>
            <h1 className="text-xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Clientes & CRM
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-black text-[#E0E0E0]/70 hover:bg-white/10 transition-all uppercase tracking-wider"
              >
                Cancelar Edición
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumen CRM (Metric Cards in app/page.tsx Style) */}
        <div>
          <h2 className="mb-4 text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
            Resumen del CRM
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Clientes */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Total Clientes
                </span>
                <div className="rounded-xl bg-success/10 p-2.5 text-success">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {customers.length}
              </p>
            </div>

            {/* Puntos de Lealtad */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Puntos Totales
                </span>
                <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {totalLoyaltyPoints}
              </p>
            </div>

            {/* Consumo Acumulado */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Ventas a Clientes
                </span>
                <div className="rounded-xl bg-secondary/10 p-2.5 text-secondary">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(totalSpendSum)}
              </p>
            </div>

            {/* Promedio Puntos/Cliente */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Prom. Puntos / Cliente
                </span>
                <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {avgPointsPerCustomer}
              </p>
            </div>
          </div>
        </div>

        {/* Sección Formulario + Reglas de Lealtad */}
        <section className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Formulario de Cliente */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {isEditing ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-400 font-bold">{formErrors.name}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                      placeholder="3312345678"
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-400 font-bold">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-400 font-bold">{formErrors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                  Cumpleaños
                </label>
                <div className="relative">
                  <Cake className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                  <input
                    type="date"
                    value={formState.birthday}
                    onChange={(e) => handleFormChange("birthday", e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors scheme-dark"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary py-3 text-black font-black text-xs hover:brightness-105 transition-all uppercase tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : isEditing
                      ? "Actualizar Cliente"
                      : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>

          {/* Tarjeta Programa de Lealtad */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
            <h2 className="text-sm font-black text-[#E0E0E0] uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Gift className="h-4 w-4 text-purple-400" />
              Programa de Lealtad
            </h2>
            <p className="text-xs text-[#E0E0E0]/60 font-medium leading-relaxed">
              Los clientes acumulan automáticamente puntos de lealtad al realizar sus consumos en el Punto de Venta.
            </p>
            <div className="rounded-xl bg-purple-500/10 p-4 border border-purple-500/20 text-xs text-purple-300 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest block text-purple-400">
                Puntos Acumulados
              </span>
              <p className="text-2xl font-black text-[#E0E0E0] font-mono">
                {totalLoyaltyPoints} pts
              </p>
              <p className="text-[10px] font-medium text-purple-300/70 pt-1">
                Equivalente a recompensas de lealtad activas.
              </p>
            </div>
          </div>
        </section>

        {/* Listado de Clientes */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Clientes Registrados
            </h2>

            <div className="flex items-center gap-3">
              {/* Buscador Rápido */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#E0E0E0]/40 hover:text-[#E0E0E0]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={fetchCustomers}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-[#E0E0E0]/60 hover:text-[#E0E0E0] hover:bg-white/10 transition-all"
                title="Recargar clientes"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-xs text-[#E0E0E0]/50 font-bold italic py-8 text-center">
              Cargando catálogo de clientes...
            </p>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-xs text-[#E0E0E0]/50 font-bold italic py-8 text-center">
              No se encontraron clientes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Contacto</th>
                    <th className="py-3 px-3">Cumpleaños</th>
                    <th className="py-3 px-3">Puntos</th>
                    <th className="py-3 px-3 text-right">Total Gastado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3">
                        <p className="font-black text-[#E0E0E0] uppercase text-sm">
                          {customer.name}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-[#E0E0E0]/80">{customer.phone || "—"}</p>
                        {customer.email && (
                          <p className="text-[10px] font-medium text-[#E0E0E0]/40">
                            {customer.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-[#E0E0E0]/70 font-medium">
                        {customer.birthday
                          ? new Date(customer.birthday).toLocaleDateString("es-MX", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-[10px] font-black text-purple-300 uppercase tracking-wider font-mono">
                          {customer.loyalty_points || 0} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400">
                        ${Number(customer.total_spend || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="h-3 w-3" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(customer.id)}
                            className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-1 text-[10px] font-black uppercase transition-colors"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
