import { describe, it, expect } from "vitest";
import {
  ANNOUNCEMENTS,
  ANNOUNCEMENT_KEY_PATTERN,
  findAnnouncement,
  getPendingAnnouncements,
  parseSeenAnnouncements,
  type Announcement,
} from "../announcements";

describe("announcements", () => {
  it("every catalog key is unique and valid for the DB function", () => {
    const keys = ANNOUNCEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((k) => expect(ANNOUNCEMENT_KEY_PATTERN.test(k)).toBe(true));
    expect(findAnnouncement("customization-v1")?.title).toContain("platillos personalizados");
  });

  it("parseSeenAnnouncements tolerates null and junk", () => {
    expect(parseSeenAnnouncements(null)).toEqual({});
    expect(parseSeenAnnouncements([])).toEqual({});
    expect(parseSeenAnnouncements({ a: "2026-11-14", b: 3 })).toEqual({ a: "2026-11-14" });
  });

  it("shows the customization announcement to admins and POS users until seen", () => {
    expect(
      getPendingAnnouncements({ role: "ADMIN", seen_announcements: {} }).map((a) => a.key),
    ).toEqual(["customization-v1"]);
    expect(
      getPendingAnnouncements({ role: "WAITER", seen_announcements: {} }).map((a) => a.key),
    ).toEqual(["customization-v1"]);
    expect(
      getPendingAnnouncements({
        role: "ADMIN",
        seen_announcements: { "customization-v1": "2026-11-14T00:00:00Z" },
      }),
    ).toEqual([]);
  });

  it("respects the audience (chef without POS nor menu permissions)", () => {
    expect(getPendingAnnouncements({ role: "CHEF", seen_announcements: {} })).toEqual([]);
  });

  it("does not show anything when the column is missing (migration pending)", () => {
    expect(getPendingAnnouncements({ role: "ADMIN" })).toEqual([]);
    expect(getPendingAnnouncements(null)).toEqual([]);
  });

  it("keeps catalog order and audience-less announcements reach everyone", () => {
    const catalog: Announcement[] = [
      { key: "a", title: "A", body: [] },
      { key: "b", title: "B", body: [], audience: ["team.manage_roles"] },
      { key: "c", title: "C", body: [] },
    ];
    expect(
      getPendingAnnouncements({ role: "CHEF", seen_announcements: { a: "x" } }, catalog).map(
        (a) => a.key,
      ),
    ).toEqual(["c"]);
  });
});
