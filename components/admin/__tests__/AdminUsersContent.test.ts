import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS } from "../AdminUsersContent";

describe("ROLE_PERMISSIONS Configuration", () => {
  it("defines restrictions for WAITER role including no access to order history", () => {
    const waiterConfig = ROLE_PERMISSIONS.WAITER;
    expect(waiterConfig).toBeDefined();
    expect(waiterConfig.restrictions).toContain("Sin acceso a historial general de órdenes");
    expect(waiterConfig.restrictions).toContain("Sin acceso a reportes financieros");
  });

  it("defines full access for ADMIN role without restrictions", () => {
    const adminConfig = ROLE_PERMISSIONS.ADMIN;
    expect(adminConfig).toBeDefined();
    expect(adminConfig.restrictions).toHaveLength(0);
  });
});
