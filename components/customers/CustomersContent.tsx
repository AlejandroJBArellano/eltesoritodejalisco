"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  TableHeaderSortCell,
  TablePagination,
  TableSearchInput,
} from "@/components/ui/DataTableControls";
import { Modal } from "@/components/ui/Modal";
import {
  Award,
  Cake,
  DollarSign,
  Edit3,
  Gift,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

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

interface CustomersContentProps {
  initialCustomers: Customer[];
}

export function CustomersContent({ initialCustomers }: CustomersContentProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isLoading, setIsLoading] = useState(false);
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
      customers.length > 0
        ? (totalLoyaltyPoints / customers.length).toFixed(1)
        : "0",
    [customers, totalLoyaltyPoints],
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
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        error instanceof Error ? error.message : "Error inesperado al guardar",
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
        error instanceof Error
          ? error.message
          : "Error inesperado al eliminar",
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

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-text-light">
      <PageHeader
        title="Clientes & CRM"
        subtitle="Gestión de fidelización, puntos y directorio de clientes"
        badgeColor="bg-emerald-500"
        actions={
          <button
            onClick={openNewCustomerModal}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
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
          <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Total Registrados
              </p>
              <p className="mt-1 text-2xl font-black text-text-light">
                {customers.length}
              </p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Puntos de Lealtad
              </p>
              <p className="mt-1 text-2xl font-black text-amber-400">
                {totalLoyaltyPoints}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Consumo Acumulado
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                $
                {totalSpendSum.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Prom. Puntos/Cliente
              </p>
              <p className="mt-1 text-2xl font-black text-purple-400">
                {avgPointsPerCustomer}
              </p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <Gift className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TABLA DE CLIENTES */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Directorio de Clientes ({filteredCustomers.length})
            </h2>
            <div className="flex items-center gap-3">
              <TableSearchInput
                value={searchQuery}
                onChange={(v) => {
                  setSearchQuery(v);
                  handleFilterChange();
                }}
                placeholder="Buscar cliente, teléfono o email..."
              />
              <button
                onClick={fetchCustomers}
                className="text-xs text-text-light/60 hover:text-text-light flex items-center gap-1.5 font-bold cursor-pointer transition-colors duration-200"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark/40 uppercase tracking-wider text-text-light/60 border-b border-border">
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
              <tbody className="divide-y divide-border">
                {paginatedCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/2 dark:hover:bg-card-light/10 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-text-light flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <p className="text-text-light/80 flex items-center gap-1.5 font-mono">
                            <Phone className="h-3 w-3 text-text-light/40" />
                            {c.phone}
                          </p>
                        )}
                        {c.email && (
                          <p className="text-text-light/50 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-text-light/40" />
                            {c.email}
                          </p>
                        )}
                        {!c.phone && !c.email && (
                          <span className="text-text-light/30 italic">
                            Sin datos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-light/70">
                      {c.birthday ? (
                        <span className="inline-flex items-center gap-1">
                          <Cake className="h-3.5 w-3.5 text-pink-400" />
                          {new Date(c.birthday).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ) : (
                        <span className="text-text-light/30 italic">-</span>
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
                          className="rounded-lg bg-white/5 border border-border p-2 text-text-light/80 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
                          title="Editar Cliente"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className={`rounded-lg border p-2 transition-all text-xs font-black ${deleteArmedId === c.id
                              ? "bg-red-500/30 border-red-500/50 text-red-300 px-2"
                              : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                            }`}
                          title={
                            deleteArmedId === c.id
                              ? "Confirmar eliminación"
                              : "Eliminar Cliente"
                          }
                        >
                          {deleteArmedId === c.id ? (
                            "¿Seguro?"
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-text-light/40 italic"
                    >
                      No se encontraron clientes.
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
            onPageSizeChange={(size) => {
              setPageSize(size);
              handleFilterChange();
            }}
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
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-emerald-500 transition-colors duration-200"
              placeholder="Ej. Juan Pérez"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formState.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-emerald-500 transition-colors duration-200"
              placeholder="Ej. 3312345678"
            />
            {formErrors.phone && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-emerald-500 transition-colors duration-200"
              placeholder="ejemplo@correo.com"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Fecha de Cumpleaños
            </label>
            <input
              type="date"
              value={formState.birthday}
              onChange={(e) => handleFormChange("birthday", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-emerald-500 scheme-dark transition-colors duration-200"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5 transition-colors duration-200 cursor-pointer"
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
