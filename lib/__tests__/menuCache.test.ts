import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCachedMenu,
  setCachedMenu,
  invalidateMenuCache,
} from "../menuCache";

describe("menuCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateMenuCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    invalidateMenuCache();
  });

  it("returns null on cache miss and stores items per tenant", () => {
    expect(getCachedMenu("t1")).toBeNull();

    const items = [{ id: "1", name: "Taco" }];
    setCachedMenu("t1", items);

    expect(getCachedMenu("t1")).toEqual(items);
    expect(getCachedMenu("t2")).toBeNull();
  });

  it("expires entries after 30s TTL and cleans them up", () => {
    setCachedMenu("t1", [{ id: "1" }]);

    vi.advanceTimersByTime(29_999);
    expect(getCachedMenu("t1")).toEqual([{ id: "1" }]);

    vi.advanceTimersByTime(2);
    expect(getCachedMenu("t1")).toBeNull();
  });

  it("invalidates single tenant or all tenants", () => {
    setCachedMenu("t1", [{ id: "1" }]);
    setCachedMenu("t2", [{ id: "2" }]);

    invalidateMenuCache("t1");
    expect(getCachedMenu("t1")).toBeNull();
    expect(getCachedMenu("t2")).toEqual([{ id: "2" }]);

    invalidateMenuCache();
    expect(getCachedMenu("t2")).toBeNull();
  });
});
