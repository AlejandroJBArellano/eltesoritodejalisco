"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  ReceiptText,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  Tag,
  Calendar,
  Plus,
  Edit3,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  X,
  PieChart as PieChartIcon,
  Check,
  Building,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
  tipo_gasto: "fijo" | "variable";
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
    tipo_gasto: "fijo" | "variable";
  };
};

export default function GastosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Category Form
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#FFB7CE");
  const [newCatTipoGasto, setNewCatTipoGasto] = useState<"fijo" | "variable">("variable");
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Monthly Sales
  const [totalSales, setTotalSales] = useState(0);

  // Expense Form
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => {
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
    return mxDate; // e.g. "2026-07"
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, expRes] = await Promise.all([
        fetch("/api/gastos/categorias"),
        fetch(`/api/gastos?month=${currentMonth}`),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
        setTotalSales(data.totalSales || 0);
      }
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
      const isEditing = editingCategory !== null;
      const url = "/api/gastos/categorias";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? {
            id: editingCategory.id,
            name: newCatName,
            color: newCatColor,
            tipo_gasto: newCatTipoGasto,
          }
        : { name: newCatName, color: newCatColor, tipo_gasto: newCatTipoGasto };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || `Error al ${isEditing ? "editar" : "crear"} categoría`);
        return;
      }
      setIsCategoryModalOpen(false);
      setNewCatName("");
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || parseFloat(amount) <= 0 || !description) {
      alert("Comienza llenando todos los campos requeridos");
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
      fetchData();
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsSubmittingExp(false);
    }
  };

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const { fixedExpensesTotal, variableExpensesTotal } = useMemo(() => {
    let fixed = 0;
    let variable = 0;
    expenses.forEach((exp) => {
      const tipo = exp.expense_categories?.tipo_gasto;
      if (tipo === "fijo") {
        fixed += exp.amount;
      } else {
        variable += exp.amount;
      }
    });
    return { fixedExpensesTotal: fixed, variableExpensesTotal: variable };
  }, [expenses]);

  const netUtility = totalSales - (fixedExpensesTotal + variableExpensesTotal);
  const profitMargin = totalSales > 0 ? (netUtility / totalSales) * 100 : 0;

  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    expenses.forEach((exp) => {
      const catName = exp.expense_categories?.name || "Sin Categoría";
      const catColor = exp.expense_categories?.color || "#888888";
      if (!map.has(catName)) {
        map.set(catName, { name: catName, value: 0, color: catColor });
      }
      map.get(catName)!.value += exp.amount;
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [expenses]);

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
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Gastos Operativos
            </h1>
          </div>

          <div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setNewCatName("");
                setNewCatColor("#FFB7CE");
                setNewCatTipoGasto("variable");
                setIsCategoryModalOpen(true);
              }}
              className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-black text-[#E0E0E0] hover:bg-white/10 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              Nueva Categoría
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {/* Selector de Mes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
              Resumen Financiero
            </h2>
            <p className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase">
              Control de Egresos y Balance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#E0E0E0]/40" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="rounded-xl border border-white/5 bg-[#242424] px-4 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-primary transition-all scheme-dark"
            />
          </div>
        </div>

        {/* Resumen de Egresos (Top Metrics Grid Estilo app/page.tsx) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Gastos */}
          <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Gastos Totales ({currentMonth})
              </span>
              <div className="rounded-xl bg-red-500/10 p-2.5 text-red-400">
                <ReceiptText className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight tabular-nums">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Gastos Facturados */}
          <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Gastos Facturados
              </span>
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight tabular-nums">
              ${expenses
                .filter((e) => e.has_invoice)
                .reduce((acc, e) => acc + e.amount, 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Ventas del Mes */}
          <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Ventas del Mes
              </span>
              <div className="rounded-xl bg-success/10 p-2.5 text-success">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight tabular-nums">
              ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Utilidad Neta */}
          <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Utilidad Neta (Margen)
              </span>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p
                className={`text-2xl font-black tracking-tight tabular-nums ${
                  netUtility >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                ${netUtility.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span
                className={`text-xs font-black uppercase rounded-md px-1.5 py-0.5 ${
                  profitMargin >= 0
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Formulario + Categorías vs Gráficas */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Columna Izquierda: Formulario y Categorías */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Formulario Inteligente */}
            <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2 border-b border-white/5 pb-3">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Registrar Gasto
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                    Categoría *
                  </label>
                  {categories.length === 0 ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold mb-2">
                      Crea una categoría primero ☝️
                    </div>
                  ) : (
                    <div className="relative">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-3 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                      >
                        <option value="" disabled className="bg-[#242424]">
                          Selecciona un rubro...
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-[#242424]">
                            {cat.name} ({cat.tipo_gasto === "fijo" ? "Fijo" : "Variable"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                    Monto ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ej. 1500.00"
                      required
                      className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                    Descripción / Motivo *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej. Compra de insumos a proveedor"
                      required
                      className="w-full rounded-xl border border-white/5 bg-[#181818] pl-9 pr-4 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors scheme-dark"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                      ¿Facturado?
                    </label>
                    <div className="flex h-[42px] items-center">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={hasInvoice}
                          onChange={(e) => setHasInvoice(e.target.checked)}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        <span className="ml-2.5 text-xs font-black uppercase text-[#E0E0E0]/70">
                          {hasInvoice ? "Sí" : "No"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingExp || categories.length === 0}
                  className="w-full mt-2 rounded-xl bg-primary py-3 text-black font-black text-xs hover:brightness-105 transition-all uppercase tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isSubmittingExp ? "Registrando..." : "Guardar Gasto"}
                </button>
              </form>
            </section>

            {/* Categorías */}
            <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-sm font-black text-[#E0E0E0] uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  Categorías
                </h2>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCatName("");
                    setNewCatColor("#FFB7CE");
                    setNewCatTipoGasto("variable");
                    setIsCategoryModalOpen(true);
                  }}
                  className="text-xs text-primary hover:underline font-black uppercase tracking-wider flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-[#E0E0E0] font-black uppercase truncate max-w-[130px]">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          cat.tipo_gasto === "fijo"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {cat.tipo_gasto === "fijo" ? "Fijo" : "Var"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCatName(cat.name);
                          setNewCatColor(cat.color);
                          setNewCatTipoGasto(cat.tipo_gasto || "variable");
                          setIsCategoryModalOpen(true);
                        }}
                        className="text-xs text-[#E0E0E0]/40 hover:text-[#E0E0E0] p-1 transition-colors"
                        title="Editar categoría"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-[#E0E0E0]/40 text-xs italic text-center py-4">
                    No hay categorías registradas.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Columna Derecha: Gráficas y Balance */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
              <h2 className="text-sm font-black text-[#E0E0E0] uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                <PieChartIcon className="h-4 w-4 text-emerald-400" />
                Distribución y Métricas Mensuales
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Gráfica Donut */}
                <div className="h-[280px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={80}
                          innerRadius={50}
                          paddingAngle={4}
                          label={({ name, percent }) =>
                            `${name} ${((percent || 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#1D1D1D",
                            borderColor: "#333333",
                            borderRadius: "12px",
                            color: "#E0E0E0",
                          }}
                          formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#E0E0E0]/30 text-xs italic">
                      Aún no hay gastos registrados este mes.
                    </div>
                  )}
                </div>

                {/* Balance Operativo */}
                <div className="space-y-4 bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 shadow-inner">
                  <h3 className="text-xs font-black text-[#E0E0E0]/50 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    Balance Operativo Mensual
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                        Costos Fijos
                      </p>
                      <p className="text-base font-black text-amber-400 font-mono">
                        ${fixedExpensesTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                        Costos Variables
                      </p>
                      <p className="text-base font-black text-emerald-400 font-mono">
                        ${variableExpensesTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                      Ventas Totales
                    </p>
                    <p className="text-xl font-black text-[#E0E0E0] font-mono">
                      ${totalSales.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                        Utilidad Neta
                      </p>
                      <p
                        className={`text-xl font-black font-mono ${
                          netUtility >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        ${netUtility.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                        Margen %
                      </p>
                      <p
                        className={`text-xl font-black font-mono ${
                          profitMargin >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Historial de Gastos (Tabla) */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Historial de Gastos
            </h2>
            <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
              {expenses.length} registro{expenses.length !== 1 ? "s" : ""} este mes
            </span>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <p className="py-8 text-center text-[#E0E0E0]/40 text-xs font-bold italic">
                Cargando historial de gastos...
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Descripción</th>
                    <th className="py-3 px-3 text-center">Factura</th>
                    <th className="py-3 px-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3 text-[#E0E0E0]/80 font-medium">
                        {new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" }).format(
                          new Date(exp.date + "T12:00:00Z"),
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                          style={{
                            backgroundColor: `${exp.expense_categories?.color || "#555"}20`,
                            borderColor: `${exp.expense_categories?.color || "#555"}40`,
                            color: exp.expense_categories?.color || "#E0E0E0",
                          }}
                        >
                          {exp.expense_categories?.name || "Sin Categoría"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#E0E0E0] font-bold">{exp.description}</td>
                      <td className="py-3.5 px-3 text-center">
                        {exp.has_invoice ? (
                          <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-black text-blue-400 uppercase">
                            FAC
                          </span>
                        ) : (
                          <span className="text-[#E0E0E0]/30 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-red-400">
                        - ${exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#E0E0E0]/40 italic">
                        No hay registros de gastos encontrados para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Modal Nueva / Editar Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-[#242424] p-6 shadow-2xl border border-white/10 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-400" />
                {editingCategory ? "Editar Categoría" : "Crear Categoría de Gasto"}
              </h3>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej. Publicidad, Gasolina, Mantenimiento"
                  required
                  className="w-full rounded-xl border border-white/5 bg-[#181818] px-3.5 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                  Color Distintivo
                </label>
                <div className="flex items-center gap-3 bg-[#181818] p-2 rounded-xl border border-white/5">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-mono font-bold text-[#E0E0E0]/70">
                    {newCatColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                  Tipo de Gasto *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCatTipoGasto("variable")}
                    className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all ${
                      newCatTipoGasto === "variable"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-[#181818] border-white/5 text-[#E0E0E0]/50 hover:text-[#E0E0E0]"
                    }`}
                  >
                    Variable
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatTipoGasto("fijo")}
                    className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all ${
                      newCatTipoGasto === "fijo"
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-[#181818] border-white/5 text-[#E0E0E0]/50 hover:text-[#E0E0E0]"
                    }`}
                  >
                    Fijo
                  </button>
                </div>
                <p className="text-[10px] text-[#E0E0E0]/40 mt-2 italic">
                  {newCatTipoGasto === "variable"
                    ? "💡 Variables: Restan en el Corte Diario (ej. insumos, compras de jornada)."
                    : "💡 Fijos: No restan en el Corte Diario (ej. rentas, servicios, nómina fija)."}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isSubmittingCat ? "Guardando..." : "Guardar Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
