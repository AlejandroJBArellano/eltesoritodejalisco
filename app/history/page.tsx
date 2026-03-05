"use client";

import { OrderWithDetails, PaymentMethod } from "@/types";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

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
