import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function LastOrders() {
    return <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Últimas Órdenes
        </h2>
        <Link
            href="/history"
            className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
        >
            Ver Historial Completo
            <ChevronRight className="h-3.5 w-3.5" />
        </Link>
    </div>
}