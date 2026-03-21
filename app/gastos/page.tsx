"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

type Category = {
    id: string;
    name: string;
    color: string;
};

type Expense = {
    id: string;
    amount: number;
    description: string;
    date: string;
    has_invoice: boolean;
    category_id: string;
    expense_categories?: {
        name: string;
        color: string;
    };
};

export default function GastosPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Category Form
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [newCatColor, setNewCatColor] = useState("#3B82F6");
    const [isSubmittingCat, setIsSubmittingCat] = useState(false);

    // Expense Form
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(() => {
        // Init with Mexico City date
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
    });
    const [hasInvoice, setHasInvoice] = useState(false);
    const [isSubmittingExp, setIsSubmittingExp] = useState(false);

    // Filter
    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        const mxDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
        }).format(today);
        return mxDate; // e.g. "2024-03"
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [catRes, expRes] = await Promise.all([
                fetch("/api/gastos/categorias"),
                fetch(`/api/gastos?month=${currentMonth}`),
            ]);
            if (catRes.ok) setCategories(await catRes.json());
            if (expRes.ok) setExpenses(await expRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentMonth]);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingCat(true);
        try {
            const res = await fetch("/api/gastos/categorias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCatName, color: newCatColor }),
            });
            if (!res.ok) {
                const d = await res.json();
                alert(d.error || "Error al crear categoría");
                return;
            }
            setIsCategoryModalOpen(false);
            setNewCatName("");
            fetchData(); // reload categories
        } catch (error) {
            alert("Error de conexión");
        } finally {
            setIsSubmittingCat(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount || parseFloat(amount) <= 0 || !description) {
            alert("Comienza llenando todos los campos");
            return;
        }
        setIsSubmittingExp(true);
        try {
            const res = await fetch("/api/gastos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category_id: categoryId,
                    amount: parseFloat(amount),
                    description,
                    has_invoice: hasInvoice,
                    date,
                }),
            });
            if (!res.ok) {
                alert("Error al registrar gasto");
                return;
            }
            setAmount("");
            setDescription("");
            // keep hasInvoice and date for convenience
            fetchData(); // reload expenses
        } catch (error) {
            alert("Error de conexión");
        } finally {
            setIsSubmittingExp(false);
        }
    };

    const totalExpenses = useMemo(() => {
        return expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [expenses]);

    const chartData = useMemo(() => {
        const map = new Map<string, { name: string; value: number; color: string }>();
        expenses.forEach((exp) => {
            const catName = exp.expense_categories?.name || "Sin Categoría";
            const catColor = exp.expense_categories?.color || "#555555";
            if (!map.has(catName)) {
                map.set(catName, { name: catName, value: 0, color: catColor });
            }
            map.get(catName)!.value += exp.amount;
        });
        return Array.from(map.values()).sort((a, b) => b.value - a.value);
    }, [expenses]);

    return (
        <div className="min-h-screen bg-[#121212] pb-12">
            <header className="bg-[#242424] shadow-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
                            ← Volver al Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-[#E0E0E0]">Gastos Operativos</h1>
                        <p className="text-sm text-gray-400">Control de egresos y facturación</p>
                    </div>
                    <div>
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition font-medium"
                        >
                            ➕ Nueva Categoría
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Resumen del Mes</h2>
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={e => setCurrentMonth(e.target.value)}
                        className="rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white"
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Formulario Inteligente */}
                    <section className="lg:col-span-1 rounded-lg bg-[#242424] p-6 shadow-md border border-white/5">
                        <h2 className="mb-6 text-lg font-bold text-[#E0E0E0]">Registrar Gasto</h2>
                        <form onSubmit={handleAddExpense} className="space-y-4">

                            <div>
                                <label className="mb-1 block text-sm text-gray-400">Categoría</label>
                                {categories.length === 0 ? (
                                    <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm mb-2">
                                        Crea una categoría primero ☝️
                                    </div>
                                ) : (
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        required
                                        className="w-full rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="" disabled>Selecciona un rubro...</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm text-gray-400">Monto ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Ej. 1500.00"
                                    required
                                    className="w-full rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm text-gray-400">Descripción / Motivo</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ej. Compra de carne a proveedor"
                                    required
                                    className="w-full rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm text-gray-400">Fecha</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        className="w-full rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white outline-none focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-gray-400">¿Tiene factura?</label>
                                    <div className="flex h-[42px] items-center gap-3">
                                        <label className="relative inline-flex cursor-pointer items-center">
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={hasInvoice}
                                                onChange={(e) => setHasInvoice(e.target.checked)}
                                            />
                                            <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-300">
                                                {hasInvoice ? "Sí" : "No"}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingExp || categories.length === 0}
                                className="w-full mt-4 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmittingExp ? "Registrando..." : "Guardar Gasto"}
                            </button>
                        </form>
                    </section>

                    {/* Gráficas Automáticas */}
                    <section className="lg:col-span-2 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border-l-4 border-red-500">
                                <p className="text-sm font-medium text-gray-400">Total Gastos ({currentMonth})</p>
                                <p className="mt-2 text-3xl font-black text-[#E0E0E0]">
                                    ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border-l-4 border-blue-500">
                                <p className="text-sm font-medium text-gray-400">Gastos Facturados</p>
                                <p className="mt-2 text-3xl font-black text-[#E0E0E0]">
                                    ${expenses.filter(e => e.has_invoice).reduce((acc, e) => acc + e.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg bg-[#242424] p-6 shadow-md border border-white/5 h-[350px]">
                            <h2 className="mb-4 text-lg font-bold text-[#E0E0E0]">Distribución por Categoría</h2>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            outerRadius={100}
                                            innerRadius={60}
                                            paddingAngle={5}
                                            label={({ name, percent }) => `${name} ${(percent || 1 * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500 pb-10">
                                    Aún no hay gastos registrados este mes.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Historial Tabla */}
                <section className="rounded-lg bg-[#242424] p-6 shadow-md">
                    <h2 className="mb-4 text-lg font-bold text-[#E0E0E0]">Historial de Gastos</h2>
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <p className="py-4 text-center text-gray-400">Cargando...</p>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700 text-gray-400">
                                        <th className="py-2">Fecha</th>
                                        <th className="py-2">Categoría</th>
                                        <th className="py-2">Descripción</th>
                                        <th className="py-2 text-center">Factura</th>
                                        <th className="py-2 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((exp) => (
                                        <tr key={exp.id} className="border-b border-gray-800 last:border-0 hover:bg-white/5 transition">
                                            <td className="py-3 text-gray-300">
                                                {new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" }).format(new Date(exp.date + "T12:00:00Z"))}
                                            </td>
                                            <td className="py-3 font-medium">
                                                <span
                                                    className="px-2 py-1 rounded inline-block text-xs"
                                                    style={{
                                                        backgroundColor: `${exp.expense_categories?.color || "#555"}20`,
                                                        color: exp.expense_categories?.color
                                                    }}
                                                >
                                                    {exp.expense_categories?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="py-3 text-[#E0E0E0]">{exp.description}</td>
                                            <td className="py-3 text-center">
                                                {exp.has_invoice ? <span className="text-blue-400 font-bold">✓</span> : <span className="text-gray-600">-</span>}
                                            </td>
                                            <td className="py-3 text-right font-bold text-red-400">
                                                - ${exp.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                No hay registros encontrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

            </main>

            {/* Modal Nueva Categoría */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#242424] p-6 shadow-2xl border border-white/10">
                        <h3 className="mb-4 text-xl font-bold text-white">Crear Categoría de Gasto</h3>
                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm text-gray-400">Nombre de la Categoría</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder="Ej. Publicidad, Gasolina, Mantenimiento"
                                    required
                                    className="w-full rounded-lg border border-gray-600 bg-[#333] px-4 py-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-gray-400">Color Distintivo (Gráficas)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={newCatColor}
                                        onChange={(e) => setNewCatColor(e.target.value)}
                                        className="h-10 w-16 cursor-pointer rounded border-0 bg-transparent p-0"
                                    />
                                    <span className="text-sm font-mono text-gray-400">{newCatColor}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingCat}
                                    className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isSubmittingCat ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
