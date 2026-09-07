import { describe, it, expect } from "vitest";
import { calculatePunctuality } from "../shiftUtils";

describe("shiftUtils - calculatePunctuality", () => {
  it("returns NO_SHIFT when checkInIso is missing", () => {
    const result = calculatePunctuality(null, "08:00:00", 10);
    expect(result.status).toBe("NO_SHIFT");
    expect(result.label).toBe("Sin turno asignado");
  });

  it("returns NO_SHIFT when shiftStartTime is missing", () => {
    const result = calculatePunctuality("2026-09-07T14:00:00Z", null, 10);
    expect(result.status).toBe("NO_SHIFT");
    expect(result.label).toBe("Sin turno asignado");
  });

  it("calculates ON_TIME when check-in is earlier than scheduled start", () => {
    // 07:55 in Mexico City is 13:55 UTC
    const checkInIso = "2026-09-07T13:55:00Z";
    const result = calculatePunctuality(checkInIso, "08:00", 10);
    expect(result.status).toBe("ON_TIME");
    expect(result.label).toBe("A tiempo");
  });

  it("calculates ON_TIME when check-in is within tolerance (e.g. 8 mins late with 10 min tolerance)", () => {
    // 08:08 in Mexico City is 14:08 UTC
    const checkInIso = "2026-09-07T14:08:00Z";
    const result = calculatePunctuality(checkInIso, "08:00:00", 10);
    expect(result.status).toBe("ON_TIME");
    expect(result.label).toBe("A tiempo");
    expect(result.diffMinutes).toBe(8);
  });

  it("calculates LATE when check-in exceeds tolerance (e.g. 15 mins late with 10 min tolerance)", () => {
    // 08:15 in Mexico City is 14:15 UTC
    const checkInIso = "2026-09-07T14:15:00Z";
    const result = calculatePunctuality(checkInIso, "08:00:00", 10);
    expect(result.status).toBe("LATE");
    expect(result.label).toBe("Retardo (+15 min)");
    expect(result.diffMinutes).toBe(15);
  });

  it("handles malformed timestamp gracefully", () => {
    const result = calculatePunctuality("invalid-date", "08:00", 10);
    expect(result.status).toBe("NO_SHIFT");
  });
});
