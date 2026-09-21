export type PermissionKey =
  // Ventas & POS
  | "pos.view"
  | "pos.create_order"
  | "pos.edit_order"
  | "pos.cancel_order"
  | "pos.apply_discount"
  | "pos.split_bill"
  | "pos.process_payment"
  | "pos.reopen_closed_order"
  // Cocina & KDS
  | "kitchen.view"
  | "kitchen.update_status"
  | "kitchen.manage_queue"
  // Menú & Catálogo
  | "menu.view"
  | "menu.manage"
  | "menu.toggle_availability"
  // Inventario & Compras
  | "inventory.view"
  | "inventory.adjust_stock"
  | "inventory.manage_items"
  | "inventory.view_costs"
  // Clientes & Fidelización
  | "customers.view"
  | "customers.manage"
  | "customers.campaigns"
  // Finanzas & Reportes
  | "finance.view_dashboard"
  | "finance.view_reports"
  | "finance.manage_expenses"
  | "finance.cash_cut"
  // Personal & Configuración
  | "team.view"
  | "team.manage_members"
  | "team.manage_roles"
  | "team.manage_shifts"
  | "team.manage_attendance"
  | "settings.manage_restaurant";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_MODULES: PermissionGroup[] = [
  {
    id: "pos",
    name: "Punto de Venta (POS)",
    description: "Operación de mesas, comandas, pagos y cuentas",
    permissions: [
      {
        key: "pos.view",
        label: "Ver POS",
        description: "Acceso al Punto de Venta y panel de órdenes activas.",
      },
      {
        key: "pos.create_order",
        label: "Crear Comandas",
        description: "Abrir nuevas órdenes de mesa o para llevar.",
      },
      {
        key: "pos.edit_order",
        label: "Modificar Comandas",
        description: "Agregar o remover productos de órdenes en curso.",
      },
      {
        key: "pos.cancel_order",
        label: "Cancelar Comandas",
        description: "Cancelar o anular pedidos enviados a cocina.",
      },
      {
        key: "pos.apply_discount",
        label: "Aplicar Descuentos",
        description: "Aplicar cortesías y descuentos a las cuentas.",
      },
      {
        key: "pos.split_bill",
        label: "Dividir Cuentas",
        description: "Separar cobros o transferir mesas.",
      },
      {
        key: "pos.process_payment",
        label: "Cobrar Cuentas",
        description: "Registrar pagos en efectivo, tarjeta o transferencias.",
      },
      {
        key: "pos.reopen_closed_order",
        label: "Reabrir Órdenes",
        description: "Revertir pagos o reactivar órdenes finalizadas.",
      },
    ],
  },
  {
    id: "kitchen",
    name: "Cocina y KDS",
    description: "Despacho y control de tiempos en cocina",
    permissions: [
      {
        key: "kitchen.view",
        label: "Ver KDS",
        description: "Acceso a la pantalla interactiva de cocina.",
      },
      {
        key: "kitchen.update_status",
        label: "Avanzar Platillos",
        description: "Marcar platillos en preparación y listos.",
      },
      {
        key: "kitchen.manage_queue",
        label: "Gestionar Cola",
        description: "Reordenar prioridad de comandas en cocina.",
      },
    ],
  },
  {
    id: "menu",
    name: "Menú y Catálogo",
    description: "Gestión de platillos, precios y disponibilidad",
    permissions: [
      {
        key: "menu.view",
        label: "Ver Menú",
        description: "Explorar catálogo y precios de venta.",
      },
      {
        key: "menu.manage",
        label: "Administrar Menú",
        description: "Crear, editar recetas, precios y categorías.",
      },
      {
        key: "menu.toggle_availability",
        label: "Disponibilidad Rápida",
        description: "Pausar o habilitar platillos agotados en segundos.",
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventario y Almacén",
    description: "Control de materias primas, mermas y existencias",
    permissions: [
      {
        key: "inventory.view",
        label: "Ver Stock",
        description: "Consultar insumos y niveles de inventario.",
      },
      {
        key: "inventory.adjust_stock",
        label: "Ajustar Existencias",
        description: "Registrar mermas, entradas directas o correcciones.",
      },
      {
        key: "inventory.manage_items",
        label: "Administrar Insumos",
        description: "Crear y modificar insumos, unidades y recetas.",
      },
      {
        key: "inventory.view_costs",
        label: "Ver Costos Unitarios",
        description: "Consultar costos de compra y valuación de stock.",
      },
    ],
  },
  {
    id: "customers",
    name: "Clientes y Fidelización",
    description: "Base de datos de clientes, puntos y promociones",
    permissions: [
      {
        key: "customers.view",
        label: "Ver Directorio",
        description: "Consultar historial y perfiles de clientes.",
      },
      {
        key: "customers.manage",
        label: "Editar Clientes",
        description: "Registrar nuevos clientes y actualizar sus datos.",
      },
      {
        key: "customers.campaigns",
        label: "Campañas de Lealtad",
        description: "Crear promociones, bonos de puntos y mensajes masivos.",
      },
    ],
  },
  {
    id: "finance",
    name: "Finanzas y Reportes",
    description: "Métricas de venta, gastos y cierres de turno",
    permissions: [
      {
        key: "finance.view_dashboard",
        label: "Panel de Métricas",
        description: "Ver ventas del día y KPIs en pantalla de inicio.",
      },
      {
        key: "finance.view_reports",
        label: "Reportes Detallados",
        description: "Consultar análisis de ventas, propinas y tendencias.",
      },
      {
        key: "finance.manage_expenses",
        label: "Registrar Gastos",
        description: "Capturar egresos, compras directas y salidas de dinero.",
      },
      {
        key: "finance.cash_cut",
        label: "Cortes de Caja",
        description: "Realizar cierres de turno y balances de caja.",
      },
    ],
  },
  {
    id: "team",
    name: "Equipo y Configuración",
    description: "Colaboradores, roles, turnos y parámetros del negocio",
    permissions: [
      {
        key: "team.view",
        label: "Ver Equipo",
        description: "Consultar lista de colaboradores y asistencias.",
      },
      {
        key: "team.manage_members",
        label: "Administrar Usuarios",
        description: "Crear, editar o remover colaboradores de la sucursal.",
      },
      {
        key: "team.manage_roles",
        label: "Administrar Roles",
        description: "Crear, duplicar y personalizar permisos de roles.",
      },
      {
        key: "team.manage_shifts",
        label: "Gestionar Horarios",
        description: "Planificar turnos de trabajo semanales.",
      },
      {
        key: "team.manage_attendance",
        label: "Gestionar Asistencias",
        description: "Aprobar o corregir registros de entrada y salida.",
      },
      {
        key: "settings.manage_restaurant",
        label: "Ajustes del Restaurante",
        description: "Editar datos fiscales, impresoras, PINs y parámetros.",
      },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_MODULES.flatMap(
  (group) => group.permissions.map((p) => p.key),
);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  ADMIN: ALL_PERMISSION_KEYS,
  MANAGER: [
    "pos.view",
    "pos.create_order",
    "pos.edit_order",
    "pos.cancel_order",
    "pos.apply_discount",
    "pos.split_bill",
    "pos.process_payment",
    "pos.reopen_closed_order",
    "kitchen.view",
    "kitchen.update_status",
    "kitchen.manage_queue",
    "menu.view",
    "menu.manage",
    "menu.toggle_availability",
    "inventory.view",
    "inventory.adjust_stock",
    "inventory.manage_items",
    "inventory.view_costs",
    "customers.view",
    "customers.manage",
    "customers.campaigns",
    "finance.view_dashboard",
    "finance.view_reports",
    "finance.manage_expenses",
    "finance.cash_cut",
    "team.view",
    "team.manage_shifts",
    "team.manage_attendance",
  ],
  WAITER: [
    "pos.view",
    "pos.create_order",
    "pos.edit_order",
    "pos.split_bill",
    "pos.process_payment",
    "menu.view",
    "menu.toggle_availability",
    "customers.view",
    "customers.manage",
  ],
  CHEF: [
    "kitchen.view",
    "kitchen.update_status",
    "kitchen.manage_queue",
    "menu.view",
    "menu.toggle_availability",
    "inventory.view",
  ],
  INVENTORY: [
    "inventory.view",
    "inventory.adjust_stock",
    "inventory.manage_items",
    "inventory.view_costs",
    "menu.view",
    "finance.manage_expenses",
  ],
};

export interface RoleData {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  system_slug?: string | null;
  permissions: PermissionKey[] | string[];
  created_at?: string;
  updated_at?: string;
  user_count?: number;
}

type PermissionCarrier =
  | {
      role?: string | null;
      permissions?: string[] | null;
      role_data?: {
        permissions?: string[] | null;
        is_system?: boolean;
        system_slug?: string | null;
      } | null;
    }
  | string[]
  | null
  | undefined;

/**
 * Extrae la lista de permisos de cualquier entidad (usuario, perfil, rol o array directo)
 */
export function extractPermissions(carrier: PermissionCarrier): string[] {
  if (!carrier) return [];
  if (Array.isArray(carrier)) return carrier;

  // Si tiene permissions explícito
  if (carrier.permissions && Array.isArray(carrier.permissions)) {
    return carrier.permissions;
  }

  // Si tiene role_data con permissions
  if (
    carrier.role_data?.permissions &&
    Array.isArray(carrier.role_data.permissions)
  ) {
    return carrier.role_data.permissions;
  }

  // Fallback para roles heredados por string si no tiene objeto role_data
  const roleSlug = (
    carrier.role_data?.system_slug ||
    carrier.role ||
    ""
  ).toUpperCase();
  if (roleSlug === "ADMIN") return ["*"];
  if (DEFAULT_ROLE_PERMISSIONS[roleSlug]) {
    return DEFAULT_ROLE_PERMISSIONS[roleSlug];
  }

  return [];
}

/**
 * Valida si la entidad cuenta con un permiso específico
 */
export function hasPermission(
  carrier: PermissionCarrier,
  permission: PermissionKey,
): boolean {
  const perms = extractPermissions(carrier);
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

/**
 * Valida si la entidad cuenta con al menos uno de los permisos indicados
 */
export function hasAnyPermission(
  carrier: PermissionCarrier,
  permissions: PermissionKey[],
): boolean {
  const perms = extractPermissions(carrier);
  if (perms.includes("*")) return true;
  return permissions.some((p) => perms.includes(p));
}

/**
 * Valida si la entidad cuenta con todos los permisos indicados
 */
export function hasAllPermissions(
  carrier: PermissionCarrier,
  permissions: PermissionKey[],
): boolean {
  const perms = extractPermissions(carrier);
  if (perms.includes("*")) return true;
  return permissions.every((p) => perms.includes(p));
}

/**
 * Lanza una excepción si el usuario no cuenta con el permiso requerido
 */
export function assertPermission(
  carrier: PermissionCarrier,
  permission: PermissionKey,
): void {
  if (!hasPermission(carrier, permission)) {
    throw new Error(`Permiso denegado: falta '${permission}'`);
  }
}
