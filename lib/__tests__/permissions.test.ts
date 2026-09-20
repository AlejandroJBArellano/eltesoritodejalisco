import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  assertPermission,
  extractPermissions,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "../permissions";

describe("RBAC Permissions Core", () => {
  it("debe contener módulos de permisos bien estructurados", () => {
    expect(PERMISSION_MODULES.length).toBeGreaterThan(0);
    expect(ALL_PERMISSION_KEYS.length).toBeGreaterThanOrEqual(25);
    const posModule = PERMISSION_MODULES.find((m) => m.id === "pos");
    expect(posModule).toBeDefined();
    expect(posModule?.permissions.some((p) => p.key === "pos.view")).toBe(true);
  });

  describe("extractPermissions", () => {
    it("debe retornar array vacío para inputs nulos o indefinidos", () => {
      expect(extractPermissions(null)).toEqual([]);
      expect(extractPermissions(undefined)).toEqual([]);
    });

    it("debe retornar el array directo si se pasa un array", () => {
      const perms = ["pos.view", "menu.view"];
      expect(extractPermissions(perms)).toEqual(perms);
    });

    it("debe extraer permisos de un objeto con propiedad permissions", () => {
      expect(
        extractPermissions({ permissions: ["inventory.view", "finance.cash_cut"] }),
      ).toEqual(["inventory.view", "finance.cash_cut"]);
    });

    it("debe extraer permisos de role_data si está presente", () => {
      expect(
        extractPermissions({
          role_data: { permissions: ["kitchen.view", "kitchen.update_status"] },
        }),
      ).toEqual(["kitchen.view", "kitchen.update_status"]);
    });

    it("debe aplicar fallback para roles heredados del sistema cuando no hay permissions explícitos", () => {
      expect(extractPermissions({ role: "ADMIN" })).toEqual(["*"]);
      expect(extractPermissions({ role: "WAITER" })).toEqual(
        DEFAULT_ROLE_PERMISSIONS.WAITER,
      );
      expect(extractPermissions({ role: "CHEF" })).toEqual(
        DEFAULT_ROLE_PERMISSIONS.CHEF,
      );
      expect(extractPermissions({ role: "INVENTORY" })).toEqual(
        DEFAULT_ROLE_PERMISSIONS.INVENTORY,
      );
      expect(extractPermissions({ role: "UNKNOWN" })).toEqual([]);
    });
  });

  describe("hasPermission", () => {
    it("debe retornar true para admin con comodín *", () => {
      expect(hasPermission(["*"], "pos.cancel_order")).toBe(true);
      expect(hasPermission({ role: "ADMIN" }, "settings.manage_restaurant")).toBe(
        true,
      );
    });

    it("debe retornar true si el permiso exacto está presente", () => {
      const user = { permissions: ["pos.view", "pos.create_order"] };
      expect(hasPermission(user, "pos.view")).toBe(true);
      expect(hasPermission(user, "pos.create_order")).toBe(true);
    });

    it("debe retornar false si el permiso no está presente", () => {
      const user = { permissions: ["pos.view"] };
      expect(hasPermission(user, "pos.apply_discount")).toBe(false);
      expect(hasPermission(null, "pos.view")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("debe retornar true si cuenta con comodín *", () => {
      expect(
        hasAnyPermission(["*"], ["inventory.adjust_stock", "finance.manage_expenses"]),
      ).toBe(true);
    });

    it("debe retornar true si al menos un permiso coincide", () => {
      const user = { permissions: ["pos.view"] };
      expect(
        hasAnyPermission(user, ["kitchen.view", "pos.view", "menu.manage"]),
      ).toBe(true);
    });

    it("debe retornar false si ninguno coincide", () => {
      const user = { permissions: ["kitchen.view"] };
      expect(hasAnyPermission(user, ["pos.view", "finance.cash_cut"])).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("debe retornar true si cuenta con comodín *", () => {
      expect(
        hasAllPermissions(["*"], ["pos.view", "pos.create_order", "team.manage_roles"]),
      ).toBe(true);
    });

    it("debe retornar true si contiene todos los permisos requeridos", () => {
      const user = { permissions: ["pos.view", "pos.create_order", "pos.split_bill"] };
      expect(hasAllPermissions(user, ["pos.view", "pos.split_bill"])).toBe(true);
    });

    it("debe retornar false si falta al menos uno", () => {
      const user = { permissions: ["pos.view", "pos.create_order"] };
      expect(
        hasAllPermissions(user, ["pos.view", "pos.create_order", "pos.cancel_order"]),
      ).toBe(false);
    });
  });

  describe("assertPermission", () => {
    it("no debe lanzar error si el usuario cuenta con el permiso", () => {
      expect(() => {
        assertPermission(["pos.view"], "pos.view");
      }).not.toThrow();
    });

    it("debe lanzar error con mensaje descriptivo si el usuario no tiene el permiso", () => {
      expect(() => {
        assertPermission(["pos.view"], "team.manage_roles" as PermissionKey);
      }).toThrowError(/Permiso denegado/);
    });
  });
});
