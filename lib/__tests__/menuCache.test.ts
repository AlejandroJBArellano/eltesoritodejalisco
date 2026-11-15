import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMenuCacheTag,
  getOrLoadMenuCache,
  invalidateMenuCache,
} from "../menuCache";

const unstableCacheMock = vi.fn();
const revalidateTagMock = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (...args: unknown[]) => unstableCacheMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

describe("menuCache (Next.js Data Cache)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps loader with unstable_cache tagged per tenant with 300s revalidate", async () => {
    unstableCacheMock.mockImplementation((fn: () => Promise<unknown>) => fn);
    const loader = vi.fn().mockResolvedValue([{ id: "1", name: "Taco" }]);

    const items = await getOrLoadMenuCache("t1", loader);

    expect(items).toEqual([{ id: "1", name: "Taco" }]);
    expect(unstableCacheMock).toHaveBeenCalledWith(loader, ["api-menu", "t1"], {
      tags: ["menu:t1"],
      revalidate: 300,
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("falls back cleanly when incrementalCache is missing and rethrows other errors", async () => {
    unstableCacheMock.mockImplementation(() => async () => {
      throw new Error("Invariant: incrementalCache missing in unstable_cache");
    });
    const loader = vi.fn().mockResolvedValue([{ id: "2" }]);

    expect(await getOrLoadMenuCache("t1", loader)).toEqual([{ id: "2" }]);
    expect(loader).toHaveBeenCalledTimes(1);

    unstableCacheMock.mockImplementation(() => async () => {
      throw new Error("Database connection failed");
    });
    await expect(getOrLoadMenuCache("t1", loader)).rejects.toThrow(
      "Database connection failed",
    );
  });

  it("invalidates shared Data Cache tag immediately with expire: 0 and ignores missing store outside Next", () => {
    expect(getMenuCacheTag("t1")).toBe("menu:t1");

    invalidateMenuCache(undefined);
    expect(revalidateTagMock).not.toHaveBeenCalled();

    invalidateMenuCache("t1");
    expect(revalidateTagMock).toHaveBeenCalledWith("menu:t1", { expire: 0 });

    revalidateTagMock.mockImplementationOnce(() => {
      throw new Error("Invariant: static generation store missing");
    });
    expect(() => invalidateMenuCache("t1")).not.toThrow();

    revalidateTagMock.mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });
    expect(() => invalidateMenuCache("t1")).toThrow("Unexpected error");
  });
});
