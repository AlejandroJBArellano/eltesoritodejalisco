"use client";

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type Order = OrderWithDetails;

export default function HistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
    const [tableFilter, setTableFilter] = useState("");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

    const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
                createdAt: dbOrder.created_at,
                updatedAt: dbOrder.updated_at,
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
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // 1. Search Query (Folio)
            if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // 2. Date Filter
            if (dateFilter) {
                const orderDate = new Date(order.createdAt).toISOString().substring(0, 10);
                if (orderDate !== dateFilter) {
                    return false;
                }
            }

            // 3. Table Filter
            if (tableFilter && order.table !== tableFilter) {
                return false;
            }

            // 4. Payment Method Filter
            if (paymentMethodFilter) {
                const primaryPayment = order.payments && order.payments[0] ? order.payments[0].method : null;
                if (primaryPayment !== paymentMethodFilter) {
                    return false;
                }
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

    const resumeTotals = useMemo(() => {
        let ventaNeta = 0;
        let ivaAcumulado = 0;
        let propinasEfectivo = 0;
        let propinasTarjeta = 0;
        let cajaEfectivo = 0;
        let cajaTarjeta = 0;

        filteredOrders.forEach((order) => {
            const tipAmount = order.payments?.[0]?.tipAmount || 0;
            const paymentMethod = order.payments?.[0]?.method || "N/A";

            const subtotalFiscal = order.total / 1.16;
            const ivaFiscal = order.total - subtotalFiscal;
            const totalPago = order.total + tipAmount;

            ventaNeta += subtotalFiscal;
            ivaAcumulado += ivaFiscal;

            if (paymentMethod === PaymentMethod.CASH) {
                propinasEfectivo += tipAmount;
                cajaEfectivo += totalPago;
            } else if (paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.TRANSFER) {
                propinasTarjeta += tipAmount;
                cajaTarjeta += totalPago;
            } else {
                cajaEfectivo += totalPago; // Fallback
            }
        });

        const utilidadReal = ventaNeta + propinasEfectivo + propinasTarjeta;

        return {
            ventaNeta,
            ivaAcumulado,
            propinasEfectivo,
            propinasTarjeta,
            cajaEfectivo,
            cajaTarjeta,
            utilidadReal,
        };
    }, [filteredOrders]);

    const chartsData = useMemo(() => {
        const now = new Date();

        const dailyMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();
        let currentMonthTotal = 0;
        let previousMonthTotal = 0;

        orders.forEach(order => {
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
                <div className="bg-[#242424] p-6 rounded-lg shadow-md space-y-6 flex flex-col mb-2 border-l-4 border-l-blue-500">
                    <h2 className="text-lg font-bold text-white mb-2 pb-2 border-b border-gray-700">Corte Diario</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Venta y IVA */}
                        <div className="flex flex-col space-y-3">
                            <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Venta Neta Total (Sin IVA)</span>
                                <span className="text-white text-xl font-mono font-medium">${resumeTotals.ventaNeta.toFixed(2)}</span>
                            </div>
                            <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">IVA Acumulado</span>
                                <span className="text-gray-300 text-xl font-mono">${resumeTotals.ivaAcumulado.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Propinas */}
                        <div className="flex flex-col space-y-3">
                            <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Efectivo)</span>
                                <span className="text-green-400 text-xl font-mono">${resumeTotals.propinasEfectivo.toFixed(2)}</span>
                            </div>
                            <div className="bg-[#181818] p-3 rounded-lg border border-gray-700">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Propinas (Tarjeta)</span>
                                <span className="text-blue-400 text-xl font-mono">${resumeTotals.propinasTarjeta.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Caja Final */}
                        <div className="flex flex-col space-y-3">
                            <div className="bg-[#181818] p-3 rounded-lg border border-green-900/50">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Efectivo)</span>
                                <span className="text-green-400 text-xl font-mono font-bold">${resumeTotals.cajaEfectivo.toFixed(2)}</span>
                            </div>
                            <div className="bg-[#181818] p-3 rounded-lg border border-blue-900/50">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Caja Final (Tarjeta)</span>
                                <span className="text-blue-400 text-xl font-mono font-bold">${resumeTotals.cajaTarjeta.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Utilidad Real */}
                        <div className="bg-gradient-to-br from-[#1c2e4a] to-[#0f172a] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg border border-blue-500/30 lg:col-span-1 md:col-span-2">
                            <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Utilidad Real del Día</span>
                            <span className="text-white text-3xl font-black font-mono">
                                ${resumeTotals.utilidadReal.toFixed(2)}
                            </span>
                            <span className="text-blue-300/60 text-[10px] mt-2 text-center uppercase">Venta Neta + Tot. Propinas</span>
                        </div>
                    </div>
                </div>

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
                                    switch (paymentMethod) {
                                        case PaymentMethod.CASH: methodLabel = "Efectivo"; break;
                                        case PaymentMethod.CARD: methodLabel = "Tarjeta"; break;
                                        case PaymentMethod.TRANSFER: methodLabel = "Transferencia"; break;
                                        case PaymentMethod.OTHER: methodLabel = "Otro"; break;
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
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-4 text-gray-300">{order.table || "Llevar"}</td>
                                                <td className="px-4 py-4 text-gray-300">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${paymentMethod === 'CASH' ? 'bg-green-900/50 text-green-300' :
                                                        paymentMethod === 'CARD' ? 'bg-blue-900/50 text-blue-300' :
                                                            'bg-gray-800 text-gray-300'
                                                        }`}>
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
                                                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Detalle de la Orden</h4>
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
        </div>
    );
}
