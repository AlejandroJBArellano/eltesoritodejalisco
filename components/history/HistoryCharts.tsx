"use client";

import { format, isSameMonth, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useHistoryContextNullable } from "./HistoryContext";
import type { Order } from "./types";

const COLORS = [
  "#FFB7CE",
  "#34D399",
  "#60A5FA",
  "#FBBF24",
  "#C084FC",
  "#F472B6",
  "#38BDF8",
];

export interface HistoryChartsProps {
  orders?: Order[];
}

export function HistoryCharts(props: HistoryChartsProps = {}) {
  const context = useHistoryContextNullable();
  const orders = props.orders ?? context?.orders ?? [];

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(
    null,
  );

  const chartsData = useMemo(() => {
    const now = new Date();
    const dailyMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    let currentMonthTotal = 0;
    let previousMonthTotal = 0;

    orders.forEach((order) => {
      if (order.status !== "PAID" && order.status !== "DELIVERED") return;

      const date = new Date(order.createdAt);
      const subtotalFiscal = (order.total || 0) / 1.16;

      if (isSameMonth(date, now)) {
        currentMonthTotal += subtotalFiscal;
        const dayKey = format(date, "yyyy-MM-dd");
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + subtotalFiscal);

        order.orderItems?.forEach((item) => {
          const cat = item.menuItem?.category || "Otros";
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
        date: format(parseISO(date), "dd MMM", { locale: es }),
        total,
      }));

    const salesMix = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const growth = [
      {
        name: format(subMonths(now, 1), "MMMM", { locale: es }).toUpperCase(),
        total: previousMonthTotal,
      },
      {
        name: format(now, "MMMM", { locale: es }).toUpperCase(),
        total: currentMonthTotal,
      },
    ];

    return { dailySales, salesMix, growth };
  }, [orders]);

  // Line Chart Calculations
  const lineSvgWidth = 650;
  const lineSvgHeight = 220;
  const linePadLeft = 50;
  const linePadRight = 20;
  const linePadTop = 15;
  const linePadBottom = 30;
  const lineInnerW = lineSvgWidth - linePadLeft - linePadRight;
  const lineInnerH = lineSvgHeight - linePadTop - linePadBottom;

  const maxDaily = Math.max(
    ...chartsData.dailySales.map((d) => d.total),
    0,
  );
  const maxDailyVal = maxDaily > 0 ? Math.ceil(maxDaily * 1.15) : 100;
  const yTicks = [0, maxDailyVal * 0.33, maxDailyVal * 0.66, maxDailyVal];

  const getLineX = (i: number) => {
    if (chartsData.dailySales.length <= 1)
      return linePadLeft + lineInnerW / 2;
    return (
      linePadLeft +
      (i / (chartsData.dailySales.length - 1)) * lineInnerW
    );
  };

  const getLineY = (val: number) => {
    return linePadTop + lineInnerH - (val / maxDailyVal) * lineInnerH;
  };

  const linePoints = chartsData.dailySales.map((d, i) => ({
    x: getLineX(i),
    y: getLineY(d.total),
  }));

  const linePathD = linePoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
    "",
  );

  // Donut Chart Calculations
  const donutTotal = chartsData.salesMix.reduce(
    (acc, item) => acc + item.value,
    0,
  );
  const donutSize = 160;
  const center = donutSize / 2;
  const outerR = 68;
  const innerR = 44;

  let accumulatedAngle = -Math.PI / 2; // Start from top
  const donutSlices = chartsData.salesMix.map((slice, i) => {
    const angle =
      donutTotal > 0 ? (slice.value / donutTotal) * (2 * Math.PI) : 0;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle = endAngle;

    const x1Outer = center + outerR * Math.cos(startAngle);
    const y1Outer = center + outerR * Math.sin(startAngle);
    const x2Outer = center + outerR * Math.cos(endAngle);
    const y2Outer = center + outerR * Math.sin(endAngle);

    const x1Inner = center + innerR * Math.cos(endAngle);
    const y1Inner = center + innerR * Math.sin(endAngle);
    const x2Inner = center + innerR * Math.cos(startAngle);
    const y2Inner = center + innerR * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathD =
      chartsData.salesMix.length === 1
        ? `M ${center} ${center - outerR} A ${outerR} ${outerR} 0 1 1 ${center} ${center + outerR
        } A ${outerR} ${outerR} 0 1 1 ${center} ${center - outerR
        } M ${center} ${center - innerR} A ${innerR} ${innerR} 0 1 0 ${center} ${center + innerR
        } A ${innerR} ${innerR} 0 1 0 ${center} ${center - innerR} Z`
        : `M ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner} Z`;

    return {
      ...slice,
      color: COLORS[i % COLORS.length],
      pathD,
      percentage:
        donutTotal > 0 ? Math.round((slice.value / donutTotal) * 100) : 0,
    };
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-purple-500"></span>
        Análisis y Tendencias
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venta Diaria */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Venta Diaria ({format(new Date(), "MMMM", { locale: es })})
          </h3>
          <div className="h-64 w-full">
            {chartsData.dailySales.length > 0 ? (
              <div className="relative h-full w-full select-none">
                <svg
                  viewBox={`0 0 ${lineSvgWidth} ${lineSvgHeight}`}
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Y-Axis Gridlines & Labels */}
                  {yTicks.map((tick, i) => {
                    const y =
                      linePadTop +
                      lineInnerH -
                      (tick / maxDailyVal) * lineInnerH;
                    return (
                      <g key={`history-ytick-${i}`}>
                        <line
                          x1={linePadLeft}
                          y1={y}
                          x2={lineSvgWidth - linePadRight}
                          y2={y}
                          stroke="#2A2A2A"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={linePadLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          fill="#888888"
                          fontSize="11"
                          fontWeight="700"
                        >
                          ${Math.round(tick)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Line */}
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points and Dates */}
                  {chartsData.dailySales.map((d, i) => {
                    const x = getLineX(i);
                    const y = linePoints[i]?.y;
                    const isHovered = hoveredDayIndex === i;

                    return (
                      <g
                        key={`daily-pt-${i}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIndex(i)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                      >
                        {isHovered && (
                          <line
                            x1={x}
                            y1={linePadTop}
                            x2={x}
                            y2={linePadTop + lineInnerH}
                            stroke="rgba(255,255,255,0.15)"
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 4}
                          fill="var(--color-primary)"
                          className="transition-all"
                        />
                        <text
                          x={x}
                          y={lineSvgHeight - 8}
                          textAnchor="middle"
                          fill="#888888"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {d.date}
                        </text>
                        <rect
                          x={x - 15}
                          y={linePadTop}
                          width={30}
                          height={lineInnerH}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip */}
                {hoveredDayIndex !== null &&
                  chartsData.dailySales[hoveredDayIndex] && (
                    <div
                      style={{
                        left: `${(getLineX(hoveredDayIndex) / lineSvgWidth) * 100
                          }%`,
                        top: "8%",
                      }}
                      className="absolute pointer-events-none -translate-x-1/2 z-20 rounded-xl border border-border bg-card p-2.5 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap"
                    >
                      <p className="font-black text-text-light">
                        {chartsData.dailySales[hoveredDayIndex].date}
                      </p>
                      <p className="text-primary font-bold">
                        Venta Neta: $
                        {chartsData.dailySales[
                          hoveredDayIndex
                        ].total.toFixed(2)}
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-light/40 italic">
                Sin ventas registradas este mes
              </div>
            )}
          </div>
        </div>

        {/* Mix de Categorías */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-emerald-400" />
            Mix de Categorías
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            {chartsData.salesMix.length > 0 ? (
              <div className="relative flex flex-col items-center justify-center w-full">
                <svg
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="w-36 h-36 overflow-visible"
                >
                  {donutSlices.map((slice, i) => {
                    const isHovered = hoveredSliceIndex === i;
                    return (
                      <path
                        key={`slice-${i}`}
                        d={slice.pathD}
                        fill={slice.color}
                        className="transition-all duration-200 cursor-pointer hover:opacity-90"
                        style={{
                          transformOrigin: `${center}px ${center}px`,
                          transform: isHovered ? "scale(1.05)" : "scale(1)",
                        }}
                        onMouseEnter={() => setHoveredSliceIndex(i)}
                        onMouseLeave={() => setHoveredSliceIndex(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Tooltip overlay */}
                {hoveredSliceIndex !== null &&
                  donutSlices[hoveredSliceIndex] && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center bg-dark/95 border border-border px-2 py-1 rounded-lg z-20 shadow-xl">
                      <p className="text-[11px] font-black text-white truncate max-w-22.5">
                        {donutSlices[hoveredSliceIndex].name}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-400">
                        ${donutSlices[hoveredSliceIndex].value.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-text-light/50 font-bold">
                        {donutSlices[hoveredSliceIndex].percentage}%
                      </p>
                    </div>
                  )}

                {/* Categories Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] max-h-16 overflow-y-auto">
                  {donutSlices.map((slice, i) => (
                    <div
                      key={`legend-${i}`}
                      className="flex items-center gap-1.5 bg-dark/40 px-2 py-0.5 rounded-md border border-border"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-bold text-text-light truncate max-w-20">
                        {slice.name}
                      </span>
                      <span className="font-mono text-text-light/50">
                        {slice.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-light/40 italic">
                Sin ventas suficientes este mes
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
