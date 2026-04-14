"use client";

import FacturarModal from "@/components/FacturarModal";
import { OrderWithDetails, PaymentMethod } from "@/types";
import { format, isSameMonth, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis, YAxis
} from 'recharts';

import { createClient } from "@/lib/supabase/client";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type Order = OrderWithDetails;

type ExpenseDetailItem = {
    description: string;
    amount: number;
    category?: string;
    has_invoice?: boolean;
};

type ExpenseRow = {
    description: string;
    amount: number;
    has_invoice: boolean;
    expense_categories?: { name?: string } | null;
};

type DailyCut = {
    id: string;
    cut_date: string;
    venta_neta: number;
    iva_acumulado: number;
    propinas_efectivo: number;
    propinas_tarjeta: number;
    caja_efectivo: number;
    caja_tarjeta: number;
    utilidad_real: number;
    total_gastos: number;
    utilidad_final: number;
    total_orders: number;
    notes: string | null;
    expenses_detail: ExpenseDetailItem[] | null;
    created_at: string;
};

export default function HistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingRole, setIsCheckingRole] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
    const [tableFilter, setTableFilter] = useState("");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Corte Diario state
    const [todayExpenses, setTodayExpenses] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [finalizeSuccess, setFinalizeSuccess] = useState(false);
    const [showCutsArchive, setShowCutsArchive] = useState(false);
    const [dailyCuts, setDailyCuts] = useState<DailyCut[]>([]);
    const [isLoadingCuts, setIsLoadingCuts] = useState(false);
    const [manualCash, setManualCash] = useState<string>("");
    const [manualCard, setManualCard] = useState<string>("");
    const [manualTipsEfectivo, setManualTipsEfectivo] = useState<string>("");
    const [manualTipsTarjeta, setManualTipsTarjeta] = useState<string>("");
    const [selectedCutDetail, setSelectedCutDetail] = useState<DailyCut | null>(null);

    // Facturar state
    const [facturarOrder, setFacturarOrder] = useState<Order | null>(null);
    // Map of orderId -> cfdi_uid for already-invoiced orders
    const [invoicedOrders, setInvoicedOrders] = useState<Record<string, string>>({});

    const checkRole = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profile?.role || null);
            }
        } catch (error) {
            console.error("Error checking role:", error);
        } finally {
            setIsCheckingRole(false);
        }
    };

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/orders");
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Error al cargar órdenes");

            const mappedOrders = (data.orders || []).map((dbOrder: any) => ({
                ...dbOrder,
                orderNumber: dbOrder.order_number,
                customerId: dbOrder.customer_id,
                createdAt: dbOrder.created_at ? (dbOrder.created_at.includes('Z') || dbOrder.created_at.includes('+') ? dbOrder.created_at : `${dbOrder.created_at.replace(' ', 'T')}Z`) : null,
                updatedAt: dbOrder.updated_at ? (dbOrder.updated_at.includes('Z') || dbOrder.updated_at.includes('+') ? dbOrder.updated_at : `${dbOrder.updated_at.replace(' ', 'T')}Z`) : null,
                orderItems: Array.isArray(dbOrder.order_items)
                    ? dbOrder.order_items.map((item: any) => ({
                        ...item,
                        orderId: item.order_id,
                        menuItemId: item.menu_item_id,
                        unitPrice: item.unit_price,
                        menuItem: item.menu_items
                            ? {
                                ...item.menu_items,
                                imageUrl: item.menu_items?.image_url,
                                isAvailable: item.menu_items?.is_available,
                            }
                            : { name: "Producto", price: item.unit_price || 0 },
                    }))
                    : [],
                payments: Array.isArray(dbOrder.payments)
                    ? dbOrder.payments.map((p: any) => ({
                        ...p,
                        orderId: p.order_id,
                        tipAmount: p.tip_amount,
                    }))
                    : [],
                customer: dbOrder.customers || dbOrder.customer || undefined,
            })) as Order[];

            setOrders(mappedOrders);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkRole();
        fetchOrders();
        fetchTodayExpenses();
        fetchAllInvoices();
    }, []);

    const fetchTodayExpenses = async () => {
        try {
            const supabase = createClient();
            const mxDateStr = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Mexico_City",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date());
            const { data } = await supabase
                .from("expenses")
                .select("amount")
                .eq("date", mxDateStr);
            const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
            setTodayExpenses(total);
        } catch (err) {
            console.error("Error fetching today expenses:", err);
        }
    };

    const fetchAllInvoices = async () => {
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("invoices")
                .select("order_id, cfdi_uid")
                .eq("status", "issued");
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((inv: { order_id: string; cfdi_uid: string }) => {
                    map[inv.order_id] = inv.cfdi_uid;
                });
                setInvoicedOrders(map);
            }
        } catch (err) {
            console.error("Error fetching invoices:", err);
        }
    };

    const fetchDailyCuts = async () => {
        try {
            setIsLoadingCuts(true);
            const response = await fetch("/api/daily-cuts");
            const data = await response.json();
            setDailyCuts(data.cuts || []);
        } catch (err) {
            console.error("Error fetching daily cuts:", err);
        } finally {
            setIsLoadingCuts(false);
        }
    };

    const handleFinalizarDia = async () => {
        if (openOrders.length > 0) {
            alert(`No se puede cerrar: Hay ${openOrders.length} órdenes pendientes de pago. Favor de cobrarlas o cancelarlas antes de continuar.`);
            setShowFinalizeModal(false);
            return;
        }

        try {
            setIsFinalizing(true);
            const supabase = createClient();
            const mxDateStr = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Mexico_City",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date());

            // Fetch today's itemized expenses to store as a snapshot
            const { data: expensesData } = await supabase
                .from("expenses")
                .select("description, amount, has_invoice, expense_categories(name)")
                .eq("date", mxDateStr);

            const expensesDetail: ExpenseDetailItem[] = ((expensesData || []) as ExpenseRow[]).map((e) => ({
                description: e.description,
                amount: Number(e.amount),
                category: e.expense_categories?.name ?? undefined,
                has_invoice: e.has_invoice ?? false,
            }));

            const cashFinal = manualCash !== "" ? Number(manualCash) : todayTotals.cajaEfectivo;
            const cardFinal = manualCard !== "" ? Number(manualCard) : todayTotals.cajaTarjeta;
            const tipsEfectivoFinal = manualTipsEfectivo !== "" ? Number(manualTipsEfectivo) : todayTotals.propinasEfectivo;
            const tipsTarjetaFinal = manualTipsTarjeta !== "" ? Number(manualTipsTarjeta) : todayTotals.propinasTarjeta;

            const response = await fetch("/api/daily-cuts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cut_date: mxDateStr,
                    venta_neta: todayTotals.ventaNeta,
                    iva_acumulado: todayTotals.ivaAcumulado,
                    propinas_efectivo: tipsEfectivoFinal,
                    propinas_tarjeta: tipsTarjetaFinal,
                    caja_efectivo: cashFinal,
                    caja_tarjeta: cardFinal,
                    utilidad_real: todayTotals.ventaNeta + tipsEfectivoFinal + tipsTarjetaFinal,
                    total_gastos: todayExpenses,
                    utilidad_final: (todayTotals.ventaNeta + tipsEfectivoFinal + tipsTarjetaFinal) - todayExpenses,
                    total_orders: todayOrders.length,
                    expenses_detail: expensesDetail,
                }),
            });

            if (!response.ok) throw new Error("Error al guardar el corte");

            setFinalizeSuccess(true);
            setShowFinalizeModal(false);
            alert("¡Corte de día finalizado con éxito! Los folios de órdenes se han reiniciado.");
        } catch (err) {
            console.error("Error finalizing day:", err);
            alert("Error al finalizar el día. Por favor intente de nuevo.");
        } finally {
            setIsFinalizing(false);
        }
    };



    const filteredOrders = useMemo(() => {
        // ... (rest of the filteredOrders logic remains the same)
        return orders.filter((order) => {
            if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (dateFilter) {
                const orderDate = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Mexico_City",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }).format(new Date(order.createdAt));
                if (orderDate !== dateFilter) return false;
            }
            if (tableFilter && order.table !== tableFilter) return false;
            if (paymentMethodFilter) {
                const primaryPayment = order.payments && order.payments[0] ? order.payments[0].method : null;
                if (primaryPayment !== paymentMethodFilter) return false;
            }
            return true;
        });
    }, [orders, searchQuery, dateFilter, tableFilter, paymentMethodFilter]);

    const toggleRow = (orderId: string) => {
        setExpandedRow((prev) => (prev === orderId ? null : orderId));
    };

    // Unique Tables for filter dropdown
    const availableTables = useMemo(() => {
        const tables = new Set(orders.map((o) => o.table).filter(Boolean) as string[]);
        return Array.from(tables).sort();
    }, [orders]);

    // Today's orders and totals for the Corte Diario (always filtered to today in MX timezone)
    const todayDateStr = useMemo(() => new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date()), []);

    const todayOrders = useMemo(() => {
        return orders.filter((order) => {
            const orderDate = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Mexico_City",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date(order.createdAt));
            return orderDate === todayDateStr &&
                (order.status === "PAID" || order.status === "DELIVERED" || order.status === "UNCOLLECTED");
        });
    }, [orders, todayDateStr]);

    const openOrders = useMemo(() => {
        return orders.filter((order) => {
            const orderDate = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Mexico_City",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date(order.createdAt));
            return orderDate === todayDateStr &&
                !(order.status === "PAID" || order.status === "CANCELLED" || order.status === "UNCOLLECTED");
        });
    }, [orders, todayDateStr]);

    const todayTotals = useMemo(() => {
        let ventaNeta = 0;
        let ivaAcumulado = 0;
        let propinasEfectivo = 0;
        let propinasTarjeta = 0;
        let cajaEfectivo = 0;
        let cajaTarjeta = 0;

        todayOrders.forEach((order) => {
            const payment = order.payments?.[0];
            const tipAmount = payment?.tipAmount || 0;
            const paymentMethod = payment?.method || "N/A";
            const subtotalFiscal = order.total / 1.16;
            const ivaFiscal = order.total - subtotalFiscal;
            const totalPago = order.total + tipAmount;

            // Venta neta always counts if the order was served (delivered/paid/uncollected)
            ventaNeta += subtotalFiscal;
            ivaAcumulado += ivaFiscal;

            if (payment) {
                if (paymentMethod === PaymentMethod.CASH) {
                    propinasEfectivo += tipAmount;
                    cajaEfectivo += totalPago;
                } else if (paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.TRANSFER) {
                    propinasTarjeta += tipAmount;
                    cajaTarjeta += totalPago;
                } else {
                    cajaEfectivo += totalPago;
                }
            } else if (order.status === "UNCOLLECTED") {
                // For uncollected, we count the sale but don't add to caja (it's a loss later)
                // Actually, if it's a loss, it should probably be subtracted from utility
                // But typically ventaNeta is "what was sold".
            }
        });

        const utilidadReal = ventaNeta + propinasEfectivo + propinasTarjeta;
        const utilidadFinal = utilidadReal - todayExpenses;

        // NEW: Operational Summary Calculations
        const ordersAtTable = todayOrders.filter(o => o.table && o.table !== "Domicilio").length;
        const ordersDelivery = todayOrders.filter(o => o.table === "Domicilio").length;
        const averageTicket = todayOrders.length > 0 ? (ventaNeta + ivaAcumulado) / todayOrders.length : 0;

        return { 
            ventaNeta, 
            ivaAcumulado, 
            propinasEfectivo, 
            propinasTarjeta, 
            cajaEfectivo, 
            cajaTarjeta, 
            utilidadReal, 
            utilidadFinal,
            ordersAtTable,
            ordersDelivery,
            averageTicket
        };
    }, [todayOrders, todayExpenses]);

    const chartsData = useMemo(() => {
        const now = new Date();
        const dailyMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();
        let currentMonthTotal = 0;
        let previousMonthTotal = 0;

        orders.forEach(order => {
            if (order.status !== "PAID" && order.status !== "DELIVERED") return;

            const date = new Date(order.createdAt);
            const subtotalFiscal = order.total / 1.16;

            if (isSameMonth(date, now)) {
                currentMonthTotal += subtotalFiscal;
                const dayKey = format(date, 'yyyy-MM-dd');
                dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + subtotalFiscal);

                order.orderItems?.forEach(item => {
                    const cat = item.menuItem?.category || 'Otros';
                    const itemImporteFiscal = (item.quantity * item.unitPrice) / 1.16;
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + itemImporteFiscal);
                });
            } else if (isSameMonth(date, subMonths(now, 1))) {
                previousMonthTotal += subtotalFiscal;
            }
        });

        const dailySales = Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, total]) => ({
                date: format(parseISO(date), 'dd MMM', { locale: es }),
                total
            }));

        const salesMix = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const growth = [
            { name: format(subMonths(now, 1), 'MMMM', { locale: es }).toUpperCase(), total: previousMonthTotal },
            { name: format(now, 'MMMM', { locale: es }).toUpperCase(), total: currentMonthTotal }
        ];

        return { dailySales, salesMix, growth };
    }, [orders]);

    if (isCheckingRole) {
        return (
            <div className="min-h-screen bg-dark flex justify-center items-center">
                <p className="text-white">Verificando permisos...</p>
            </div>
        );
    }

    if (userRole === "WAITER") {
        return (
            <div className="min-h-screen bg-dark flex flex-col justify-center items-center p-4">
                <div className="bg-[#242424] p-8 rounded-2xl shadow-xl border border-red-900/30 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
                    <p className="text-gray-400 mb-8">
                        Lo sentimos, el rol de <strong>MESERO</strong> no tiene permisos para acceder al historial y estadísticas financieras.
                    </p>
                    <Link
                        href="/"
                        className="inline-block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Volver al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark flex justify-center items-center">
                <p className="text-white">Cargando historial...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark">
            <header className="bg-[#242424] shadow-sm no-print">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
                            ← Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-text-light">Historial y Estadísticas</h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {errorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="bg-[#242424] p-6 rounded-lg shadow-md space-y-6 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Buscar Folio</label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ej. 001"
                                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-[7px] text-sm focus:border-blue-500 focus:outline-none scheme-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Mesa</label>
                            <select
                                value={tableFilter}
                                onChange={(e) => setTableFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none leading-normal"
                            >
                                <option value="">Todas</option>
                                {availableTables.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Método de Pago</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none leading-normal"
                            >
                                <option value="">Todos</option>
                                <option value={PaymentMethod.CASH}>Efectivo</option>
                                <option value={PaymentMethod.CARD}>Tarjeta</option>
                                <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                                <option value={PaymentMethod.OTHER}>Otro</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* CORTE DIARIO */}
                <div className={`bg-[#242424] p-6 rounded-lg shadow-md space-y-4 flex flex-col mb-2 border-l-4 ${finalizeSuccess ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                    <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                        <div>
                            <h2 className="text-lg font-bold text-white">Corte Diario</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {finalizeSuccess
                                    ? '✅ Corte guardado — contadores reiniciados para mañana'
                                    : `Hoy · ${todayOrders.length} orden${todayOrders.length !== 1 ? 'es' : ''} completada${todayOrders.length !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setShowCutsArchive((v) => !v);
                                    if (!showCutsArchive) fetchDailyCuts();
                                }}
                                className="rounded-lg border border-gray-600 bg-[#181818] px-3 py-2 text-xs font-semibold text-gray-300 hover:border-blue-500 hover:text-white transition-all"
                            >
                                📁 Archivo de Cortes
                            </button>
                            {!finalizeSuccess && (
                                <button
                                    onClick={() => {
                                        if (openOrders.length > 0) {
                                            alert(`No se puede cerrar: Hay ${openOrders.length} órdenes pendientes de pago.`);
                                            return;
                                        }
                                        setManualCash(todayTotals.cajaEfectivo.toString());
                                        setManualCard(todayTotals.cajaTarjeta.toString());
                                        setManualTipsEfectivo(todayTotals.propinasEfectivo.toString());
                                        setManualTipsTarjeta(todayTotals.propinasTarjeta.toString());
                                        setShowFinalizeModal(true);
                                    }}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition-all"
                                >
                                    ✅ Finalizar Día
                                </button>
                            )}
                        </div>
                    </div>

                    {finalizeSuccess ? (
                        // After finalizing: show reset state ($0.00)
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Venta Neta Total (Sin IVA)</span>
                                    <span className="text-gray-500 text-xl font-mono font-medium">$0.00</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">IVA Acumulado</span>
                                    <span className="text-gray-500 text-xl font-mono">$0.00</span>
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Efectivo)</span>
                                    <span className="text-gray-500 text-xl font-mono">$0.00</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Tarjeta)</span>
                                    <span className="text-gray-500 text-xl font-mono">$0.00</span>
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-green-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Efectivo)</span>
                                    <span className="text-gray-500 text-xl font-mono font-bold">$0.00</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-blue-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Tarjeta)</span>
                                    <span className="text-gray-500 text-xl font-mono font-bold">$0.00</span>
                                </div>
                            </div>
                            <div className="bg-linear-to-br from-[#1a3a1a] to-[#0f1f0f] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg border border-green-500/30 lg:col-span-1 md:col-span-2">
                                <span className="text-green-300 text-xs font-bold uppercase tracking-wider mb-2">Día Finalizado ✓</span>
                                <span className="text-white text-3xl font-black font-mono">$0.00</span>
                                <span className="text-green-400/60 text-[10px] mt-2 text-center uppercase">Nuevo día — caja en cero</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Venta y IVA */}
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Venta Neta Total (Sin IVA)</span>
                                    <span className="text-white text-xl font-mono font-medium">${todayTotals.ventaNeta.toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">IVA Acumulado</span>
                                    <span className="text-gray-300 text-xl font-mono">${todayTotals.ivaAcumulado.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Propinas */}
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Efectivo)</span>
                                    <span className="text-green-400 text-xl font-mono">${todayTotals.propinasEfectivo.toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Tarjeta)</span>
                                    <span className="text-blue-400 text-xl font-mono">${todayTotals.propinasTarjeta.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Caja Final */}
                            <div className="flex flex-col space-y-3">
                                <div className="bg-[#181818] p-3 rounded-lg border border-green-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Efectivo)</span>
                                    <span className="text-green-400 text-xl font-mono font-bold">${todayTotals.cajaEfectivo.toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-blue-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Tarjeta)</span>
                                    <span className="text-blue-400 text-xl font-mono font-bold">${todayTotals.cajaTarjeta.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Gastos del día */}
                            <div className="bg-[#181818] p-3 rounded-lg border border-red-900/50 flex flex-col justify-center">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Gastos del Día</span>
                                <span className="text-red-400 text-2xl font-mono font-bold">-${todayExpenses.toFixed(2)}</span>
                                <span className="text-gray-500 text-[10px] mt-1 uppercase">Insumos, sueldos, etc.</span>
                            </div>

                            {/* Utilidad Final */}
                            <div className="bg-linear-to-br from-[#1c2e4a] to-[#0f172a] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg border border-blue-500/30">
                                <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Utilidad Real</span>
                                <span className="text-white text-2xl font-black font-mono">
                                    ${todayTotals.utilidadReal.toFixed(2)}
                                </span>
                                <div className="mt-2 pt-2 border-t border-blue-500/20 w-full text-center">
                                    <span className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1">Utilidad Final</span>
                                    <span className={`text-xl font-black font-mono ${todayTotals.utilidadFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${todayTotals.utilidadFinal.toFixed(2)}
                                    </span>
                                    <span className="text-blue-300/60 text-[10px] mt-1 block uppercase">Utilidad - Gastos</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEW: Resumen Operativo Card */}
                    {!finalizeSuccess && todayOrders.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                📊 Resumen Operativo del Día
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-[#181818] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-xl">📜</div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Folios Generados</p>
                                        <p className="text-xl font-black text-white">{todayOrders.length} <span className="text-xs text-blue-500 font-normal">órdenes hoy</span></p>
                                    </div>
                                </div>
                                
                                <div className="bg-[#181818] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-xl">🏠</div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Servicio Mesa vs Domicilio</p>
                                        <p className="text-lg font-black text-white">
                                            {todayTotals.ordersAtTable} <span className="text-[10px] text-gray-500 font-normal">Mesa</span>
                                            <span className="mx-2 text-gray-700">|</span>
                                            {todayTotals.ordersDelivery} <span className="text-[10px] text-gray-500 font-normal">Domicilio</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#181818] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-xl">📈</div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Consumo Promedio</p>
                                        <p className="text-xl font-black text-green-400">${todayTotals.averageTicket.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">por orden</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ARCHIVO DE CORTES */}
                {showCutsArchive && (
                    <div className="bg-[#242424] p-6 rounded-lg shadow-md border border-gray-700">
                        <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-gray-700 flex items-center gap-2">
                            📁 Archivo de Cortes Diarios
                        </h2>
                        {isLoadingCuts ? (
                            <p className="text-gray-400 text-sm">Cargando archivo...</p>
                        ) : dailyCuts.length === 0 ? (
                            <p className="text-gray-400 text-sm">No hay cortes registrados aún.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-400 uppercase text-xs font-bold border-b border-gray-700">
                                        <tr>
                                            <th className="py-3 pr-4">Fecha</th>
                                            <th className="py-3 pr-4 text-right">Órdenes</th>
                                            <th className="py-3 pr-4 text-right">Venta Bruta</th>
                                            <th className="py-3 pr-4 text-right">Venta Neta</th>
                                            <th className="py-3 pr-4 text-right">IVA</th>
                                            <th className="py-3 pr-4 text-right">Gastos</th>
                                            <th className="py-3 pr-4 text-right">Utilidad Final</th>
                                            <th className="py-3 text-center">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {dailyCuts.map((cut) => {
                                            const ventaBruta = Number(cut.venta_neta) + Number(cut.iva_acumulado);
                                            return (
                                                <tr key={cut.id} className="hover:bg-[#2a2a2a] transition-colors">
                                                    <td className="py-3 pr-4 font-medium text-white">
                                                        {new Date(`${cut.cut_date}T12:00:00`).toLocaleDateString('es-MX', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="py-3 pr-4 text-right text-gray-300">{cut.total_orders}</td>
                                                    <td className="py-3 pr-4 text-right text-green-400 font-mono">
                                                        ${ventaBruta.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-right text-gray-300 font-mono">
                                                        ${Number(cut.venta_neta).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-right text-yellow-400 font-mono">
                                                        ${Number(cut.iva_acumulado).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-right text-red-400 font-mono">
                                                        -${Number(cut.total_gastos).toFixed(2)}
                                                    </td>
                                                    <td className={`py-3 pr-4 text-right font-mono font-bold ${Number(cut.utilidad_final) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                                        ${Number(cut.utilidad_final).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <button
                                                            onClick={() => setSelectedCutDetail(cut)}
                                                            className="rounded-lg bg-[#181818] border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-300 hover:border-blue-500 hover:text-white transition-all"
                                                        >
                                                            Ver Detalle
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL DETALLE DE CORTE */}
                {selectedCutDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <div className="w-full max-w-lg rounded-2xl bg-[#242424] p-6 shadow-2xl border border-blue-500/30 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-white">📋 Detalle del Corte</h3>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        {new Date(`${selectedCutDetail.cut_date}T12:00:00`).toLocaleDateString('es-MX', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCutDetail(null)}
                                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:border-gray-400 transition-all"
                                >
                                    ✕ Cerrar
                                </button>
                            </div>

                            {/* Financial Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Venta Neta Total (Sin IVA)</span>
                                    <span className="text-white text-lg font-mono font-medium">${Number(selectedCutDetail.venta_neta).toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-yellow-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">IVA Acumulado</span>
                                    <span className="text-yellow-400 text-lg font-mono">${Number(selectedCutDetail.iva_acumulado).toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Efectivo)</span>
                                    <span className="text-green-400 text-lg font-mono">${Number(selectedCutDetail.propinas_efectivo).toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Tarjeta)</span>
                                    <span className="text-blue-400 text-lg font-mono">${Number(selectedCutDetail.propinas_tarjeta).toFixed(2)}</span>
                                    <span className="text-gray-500 text-[10px] block mt-0.5">No suma a utilidad</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-green-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Efectivo)</span>
                                    <span className="text-green-400 text-lg font-mono font-bold">${Number(selectedCutDetail.caja_efectivo).toFixed(2)}</span>
                                </div>
                                <div className="bg-[#181818] p-3 rounded-lg border border-blue-900/50">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Tarjeta/Banco)</span>
                                    <span className="text-blue-400 text-lg font-mono font-bold">${Number(selectedCutDetail.caja_tarjeta).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Expenses Detail */}
                            <div className="bg-[#181818] rounded-lg border border-red-900/50 p-4 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Gastos del Día</span>
                                    <span className="text-red-400 font-mono font-bold">-${Number(selectedCutDetail.total_gastos).toFixed(2)}</span>
                                </div>
                                {selectedCutDetail.expenses_detail && selectedCutDetail.expenses_detail.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {selectedCutDetail.expenses_detail.map((expense, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {expense.has_invoice && (
                                                        <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded font-semibold shrink-0">FAC</span>
                                                    )}
                                                    {expense.category && (
                                                        <span className="text-[10px] text-gray-500 shrink-0">[{expense.category}]</span>
                                                    )}
                                                    <span className="text-gray-300 truncate">{expense.description}</span>
                                                </div>
                                                <span className="text-red-400 font-mono shrink-0 ml-3">-${Number(expense.amount).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-xs italic">Sin desglose de gastos disponible para este corte.</p>
                                )}
                            </div>

                            {/* Utilidad Summary */}
                            <div className="bg-linear-to-br from-[#1c2e4a] to-[#0f172a] p-4 rounded-lg border border-blue-500/30">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Utilidad Real</span>
                                    <span className="text-white font-black font-mono">${Number(selectedCutDetail.utilidad_real).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
                                    <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Utilidad Final (- Gastos)</span>
                                    <span className={`text-xl font-black font-mono ${Number(selectedCutDetail.utilidad_final) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${Number(selectedCutDetail.utilidad_final).toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-blue-300/40 text-[10px] mt-2 uppercase">
                                    {selectedCutDetail.total_orders} orden{selectedCutDetail.total_orders !== 1 ? 'es' : ''} completada{selectedCutDetail.total_orders !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {selectedCutDetail.notes && (
                                <div className="mt-3 bg-[#181818] rounded-lg border border-gray-700 p-3">
                                    <span className="text-gray-400 text-xs font-semibold uppercase block mb-1">Notas</span>
                                    <p className="text-gray-300 text-sm">{selectedCutDetail.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL FINALIZAR DÍA */}
                {showFinalizeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-[#242424] p-6 shadow-2xl border border-green-500/30">
                            <h3 className="text-xl font-black text-white mb-1">✅ Finalizar Día</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Se guardará el siguiente resumen en el archivo de cortes:
                            </p>

                             <div className="space-y-3 bg-[#181818] rounded-lg p-4 mb-6 text-sm">
                                <div className="flex justify-between items-center bg-[#242424] p-2 rounded-md">
                                    <span className="text-gray-400">Venta Neta (sin IVA)</span>
                                    <span className="text-white font-mono font-bold">${todayTotals.ventaNeta.toFixed(2)}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Efectivo Caja</label>
                                        <input 
                                            type="number" 
                                            value={manualCash}
                                            onChange={(e) => setManualCash(e.target.value)}
                                            className="w-full bg-dark border border-gray-700 rounded-lg px-2 py-1.5 text-green-400 font-mono focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Tarjeta Caja</label>
                                        <input 
                                            type="number" 
                                            value={manualCard}
                                            onChange={(e) => setManualCard(e.target.value)}
                                            className="w-full bg-dark border border-gray-700 rounded-lg px-2 py-1.5 text-blue-400 font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Propinas Efec.</label>
                                        <input 
                                            type="number" 
                                            value={manualTipsEfectivo}
                                            onChange={(e) => setManualTipsEfectivo(e.target.value)}
                                            className="w-full bg-dark border border-gray-700 rounded-lg px-2 py-1.5 text-green-500/70 font-mono focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Propinas Tarj.</label>
                                        <input 
                                            type="number" 
                                            value={manualTipsTarjeta}
                                            onChange={(e) => setManualTipsTarjeta(e.target.value)}
                                            className="w-full bg-dark border border-gray-700 rounded-lg px-2 py-1.5 text-blue-500/70 font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between border-t border-gray-700 pt-3">
                                    <span className="text-gray-400">Órdenes completadas</span>
                                    <span className="text-white font-bold">{todayOrders.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Gastos del Día</span>
                                    <span className="text-red-400 font-mono">-${todayExpenses.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold">
                                    <span className="text-blue-200 uppercase text-xs">Utilidad Final Estimada</span>
                                    <span className={`font-mono ${(todayTotals.ventaNeta + Number(manualTipsEfectivo || 0) + Number(manualTipsTarjeta || 0) - todayExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${(todayTotals.ventaNeta + Number(manualTipsEfectivo || 0) + Number(manualTipsTarjeta || 0) - todayExpenses).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 mb-6">
                                Los datos serán guardados en el historial. Los contadores del Corte Diario se reiniciarán a $0.00.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowFinalizeModal(false)}
                                    disabled={isFinalizing}
                                    className="flex-1 rounded-xl border border-gray-600 py-3 text-sm font-bold text-gray-300 hover:bg-[#181818] transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleFinalizarDia}
                                    disabled={isFinalizing}
                                    className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-all disabled:opacity-70"
                                >
                                    {isFinalizing ? 'Guardando...' : 'Confirmar y Finalizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* GRÁFICAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Venta Diaria */}
                    <div className="bg-[#242424] p-6 rounded-lg shadow-md lg:col-span-2 border border-gray-700">
                        <h2 className="text-lg font-bold text-white mb-4 uppercase">Venta Diaria ({format(new Date(), 'MMMM', { locale: es })})</h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartsData.dailySales} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Venta Neta']}
                                    />
                                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Mix de Ventas */}
                    <div className="bg-[#242424] p-6 rounded-lg shadow-md border border-gray-700">
                        <h2 className="text-lg font-bold text-white mb-4 uppercase">Mix de Ventas</h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartsData.salesMix}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartsData.salesMix.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Importe']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Trend de Crecimiento */}
                    <div className="bg-[#242424] p-6 rounded-lg shadow-md lg:col-span-3 border border-gray-700">
                        <h2 className="text-lg font-bold text-white mb-4 uppercase">Crecimiento Mensual</h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartsData.growth} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Total Venta Neta']}
                                        cursor={{ fill: '#2a2a2a' }}
                                    />
                                    <Bar dataKey="total" fill="#10b981" barSize={40} radius={[0, 4, 4, 0]}>
                                        {chartsData.growth.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#4B5563' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-[#242424] rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#181818] text-gray-400 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-4">Folio</th>
                                    <th className="px-4 py-4">Fecha</th>
                                    <th className="px-4 py-4">Mesa</th>
                                    <th className="px-4 py-4">Método</th>
                                    <th className="px-4 py-4 text-right">Subtotal</th>
                                    <th className="px-4 py-4 text-right">IVA (16%)</th>
                                    <th className="px-4 py-4 text-right">Propina</th>
                                    <th className="px-4 py-4 text-right text-blue-400">TOTAL PAGO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredOrders.map((order) => {
                                    const tipAmount = order.payments?.[0]?.tipAmount || 0;
                                    const paymentMethod = order.payments?.[0]?.method || "N/A";

                                    // Desglose
                                    const subtotalFiscal = order.total / 1.16;
                                    const ivaFiscal = order.total - subtotalFiscal;
                                    const totalPago = order.total + tipAmount;

                                    let methodLabel = paymentMethod;
                                    let methodColorClass = paymentMethod === 'CASH' ? 'bg-green-900/50 text-green-300' :
                                        paymentMethod === 'CARD' ? 'bg-blue-900/50 text-blue-300' :
                                            'bg-gray-800 text-gray-300';

                                    if (order.status === 'UNCOLLECTED') {
                                        methodLabel = "NO COBRADA";
                                        methodColorClass = "bg-red-900/50 text-red-300";
                                    } else {
                                        switch (paymentMethod) {
                                            case PaymentMethod.CASH: methodLabel = "Efectivo"; break;
                                            case PaymentMethod.CARD: methodLabel = "Tarjeta"; break;
                                            case PaymentMethod.TRANSFER: methodLabel = "Transferencia"; break;
                                            case PaymentMethod.OTHER: methodLabel = "Otro"; break;
                                        }
                                    }

                                    const isExpanded = expandedRow === order.id;

                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                className="hover:bg-[#2a2a2a] cursor-pointer transition-colors"
                                                onClick={() => toggleRow(order.id)}
                                            >
                                                <td className="px-4 py-4 font-bold text-text-light">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500 text-xs w-4">
                                                            {isExpanded ? "▼" : "▶"}
                                                        </span>
                                                        #{order.orderNumber}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-gray-300">
                                                    {new Date(order.createdAt).toLocaleDateString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'America/Mexico_City'
                                                    })}
                                                </td>
                                                <td className="px-4 py-4 text-gray-300">{order.table || "Llevar"}</td>
                                                <td className="px-4 py-4 text-gray-300">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${methodColorClass}`}>
                                                        {methodLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-300 font-mono">
                                                    ${subtotalFiscal.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-300 font-mono">
                                                    ${ivaFiscal.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-300 font-mono">
                                                    ${tipAmount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-right font-black text-blue-400 font-mono text-base">
                                                    ${totalPago.toFixed(2)}
                                                </td>
                                            </tr>
                                            {/* FILA EXPANDIDA PARA DETALLES DE PRODUCTOS */}
                                            {isExpanded && (
                                                <tr className="bg-[#1e1e1e]">
                                                    <td colSpan={8} className="px-10 py-4">
                                                        <div className="bg-[#181818] rounded border border-gray-700 p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="text-sm font-bold text-gray-400 uppercase">Detalle de la Orden</h4>
                                                                {/* Facturar button */}
                                                                {invoicedOrders[order.id] ? (
                                                                    <span className="flex items-center gap-1.5 rounded-lg bg-green-900/30 border border-green-700/40 px-3 py-1.5 text-xs font-bold text-green-400">
                                                                        ✅ Facturada
                                                                    </span>
                                                                ) : (
                                                                    (order.status === "PAID" || order.status === "DELIVERED" || order.status === "UNCOLLECTED") && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setFacturarOrder(order);
                                                                            }}
                                                                            className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-600/30 hover:border-blue-400 transition-all"
                                                                        >
                                                                            🧾 Facturar
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="text-gray-500 border-b border-gray-700">
                                                                        <th className="text-left pb-2 font-semibold font-mono">Cant</th>
                                                                        <th className="text-left pb-2 font-semibold">Producto</th>
                                                                        <th className="text-right pb-2 font-semibold">Precio Unit.</th>
                                                                        <th className="text-right pb-2 font-semibold">Importe</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {order.orderItems?.map((item) => {
                                                                        const importe = item.quantity * item.unitPrice;
                                                                        return (
                                                                            <tr key={item.id} className="border-b border-gray-800/50 last:border-0 hover:bg-black/20">
                                                                                <td className="py-2 text-gray-300 font-mono">{item.quantity}</td>
                                                                                <td className="py-2 text-gray-300 font-medium">
                                                                                    {item.menuItem?.name || "Producto desconocido"}
                                                                                </td>
                                                                                <td className="py-2 text-right text-gray-400 opacity-80 font-mono">
                                                                                    ${item.unitPrice.toFixed(2)}
                                                                                </td>
                                                                                <td className="py-2 text-right text-gray-300 font-mono">
                                                                                    ${importe.toFixed(2)}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                            No se encontraron órdenes que coincidan con los filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL FACTURAR */}
            {facturarOrder && (
                <FacturarModal
                    orderId={facturarOrder.id}
                    orderNumber={facturarOrder.orderNumber}
                    orderTotal={facturarOrder.total}
                    onClose={() => setFacturarOrder(null)}
                    onSuccess={(cfdiUid) => {
                        setInvoicedOrders((prev) => ({
                            ...prev,
                            [facturarOrder.id]: cfdiUid,
                        }));
                        setFacturarOrder(null);
                    }}
                />
            )}
        </div>
    );
}
