"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Users,
  Award,
  DollarSign,
  User,
  Phone,
  Mail,
  Cake,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Gift,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";

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
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<CustomerFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Table Filters, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  
  type SortField = "name" | "loyalty_points" | "total_spend" | "birthday";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isEditing = Boolean(formState.id);

  const totalLoyaltyPoints = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => acc + (customer.loyalty_points || 0),
        0
      ),
    [customers]
  );

  const totalSpendSum = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => acc + Number(customer.total_spend || 0),
        0
      ),
    [customers]
  );

  const avgPointsPerCustomer = useMemo(
    () =>
      customers.length > 0 ? (totalLoyaltyPoints / customers.length).toFixed(1) : "0",
    [customers, totalLoyaltyPoints]
  );

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
        error instanceof Error ? error.message : "Error inesperado al cargar"
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

  const openNewCustomerModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
      setIsModalOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (deleteArmedId !== customerId) {
      setDeleteArmedId(customerId);
      setTimeout(() => setDeleteArmedId(null), 3000);
      return;
    }
    setDeleteArmedId(null);

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
        error instanceof Error ? error.message : "Error inesperado al eliminar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [customers, searchQuery]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === "loyalty_points") {
        comp = a.loyalty_points - b.loyalty_points;
      } else if (sortField === "total_spend") {
        comp = a.total_spend - b.total_spend;
      } else if (sortField === "birthday") {
        comp = (a.birthday || "").localeCompare(b.birthday || "");
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredCustomers, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, pageSize]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0]">
      {/* Header reutilizable */}
      <PageHeader
        title="Clientes & CRM"
        subtitle="Gestión de fidelización, puntos y directorio de clientes"
        badgeColor="bg-emerald-500"
        actions={
          <button
            onClick={openNewCustomerModal}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Tarjetas de Métricas de CRM */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Registrados
              </p>
              <p className="mt-1 text-2xl font-black text-[#E0E0E0]">{customers.length}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Puntos de Lealtad
              </p>
              <p className="mt-1 text-2xl font-black text-amber-400">{totalLoyaltyPoints}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Consumo Acumulado
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                ${totalSpendSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Prom. Puntos/Cliente
              </p>
              <p className="mt-1 text-2xl font-black text-purple-400">{avgPointsPerCustomer}</p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <Gift className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TABLA DE CLIENTES CON BUSQUEDA, ORDENAMIENTO Y PAGINACION */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Directorio de Clientes ({filteredCustomers.length})
            </h2>
            <div className="flex items-center gap-3">
              <TableSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar cliente, teléfono o email..."
              />
              <button
                onClick={fetchCustomers}
                className="text-xs text-[#E0E0E0]/60 hover:text-white flex items-center gap-1.5 font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] uppercase tracking-wider text-[#E0E0E0]/60 border-b border-white/5">
                <tr>
                  <TableHeaderSortCell
                    field="name"
                    label="Cliente"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="py-3 px-4 font-bold">Contacto</th>
                  <TableHeaderSortCell
                    field="birthday"
                    label="Cumpleaños"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="loyalty_points"
                    label="Puntos"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="total_spend"
                    label="Gasto Total"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-[#E0E0E0] flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <p className="text-[#E0E0E0]/80 flex items-center gap-1.5 font-mono">
                            <Phone className="h-3 w-3 text-[#E0E0E0]/40" />
                            {c.phone}
                          </p>
                        )}
                        {c.email && (
                          <p className="text-[#E0E0E0]/50 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-[#E0E0E0]/40" />
                            {c.email}
                          </p>
                        )}
                        {!c.phone && !c.email && (
                          <span className="text-[#E0E0E0]/30 italic">Sin datos</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#E0E0E0]/70">
                      {c.birthday ? (
                        <span className="inline-flex items-center gap-1">
                          <Cake className="h-3.5 w-3.5 text-pink-400" />
                          {new Date(c.birthday).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ) : (
                        <span className="text-[#E0E0E0]/30 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 font-black text-amber-400">
                        <Award className="h-3 w-3" />
                        {c.loyalty_points} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-400">
                      ${Number(c.total_spend || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditCustomerModal(c)}
                          className="rounded-lg bg-white/5 border border-white/10 p-2 text-[#E0E0E0]/80 hover:text-white hover:bg-white/10 transition-colors"
                          title="Editar Cliente"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className={`rounded-lg border p-2 transition-all text-xs font-black ${
                            deleteArmedId === c.id
                              ? "bg-red-500/30 border-red-500/50 text-red-300 px-2"
                              : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          }`}
                          title={deleteArmedId === c.id ? "Confirmar eliminación" : "Eliminar Cliente"}
                        >
                          {deleteArmedId === c.id ? "¿Seguro?" : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-[#E0E0E0]/40 italic"
                    >
                      {isLoading
                        ? "Cargando directorio..."
                        : "No se encontraron clientes."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedCustomers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      </main>

      {/* MODAL DE CLIENTE (NUEVO / EDITAR) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Editar Cliente" : "Nuevo Cliente"}
        subtitle="Registra información de contacto y fecha de cumpleaños para CRM"
        icon={<User className="h-5 w-5 text-emerald-400" />}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-emerald-500"
              placeholder="Ej. Juan Pérez"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formState.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-emerald-500"
              placeholder="Ej. 3312345678"
            />
            {formErrors.phone && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-emerald-500"
              placeholder="ejemplo@correo.com"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Fecha de Cumpleaños
            </label>
            <input
              type="date"
              value={formState.birthday}
              onChange={(e) => handleFormChange("birthday", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-emerald-500 scheme-dark"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#E0E0E0]/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                ? "Actualizar Cliente"
                : "Guardar Cliente"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
