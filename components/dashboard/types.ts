import React from "react";

export interface StatCardProps {
  title: string;
  icon: React.ElementType;
  value: React.ReactNode;
  themeClass: string;
}

export interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  themeClass: string;
  hoverColor: string;
  badge?: string;
  target?: string;
}

export interface LowStockIngredient {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export interface DashboardStats {
  activeOrdersCount: number;
  salesToday: number;
  customersCount: number;
  tipsToday: number;
}
