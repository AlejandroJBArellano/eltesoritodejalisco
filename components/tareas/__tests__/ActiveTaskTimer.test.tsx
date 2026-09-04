import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ActiveTaskTimer, formatLiveTimer } from "../ActiveTaskTimer";
import type { TaskExecution } from "@/types";

describe("ActiveTaskTimer Component and Helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatLiveTimer", () => {
    it("returns '00:00' when start_time is missing", () => {
      const exec = { status: "IN_PROGRESS" } as TaskExecution;
      expect(formatLiveTimer(exec)).toBe("00:00");
    });

    it("formats in-progress elapsed seconds correctly (mm:ss and hh:mm:ss)", () => {
      const now = new Date("2026-09-03T12:05:30Z");
      const execMmSs: TaskExecution = {
        id: "1",
        status: "IN_PROGRESS",
        start_time: "2026-09-03T12:00:00Z",
        paused_seconds: 0,
      } as TaskExecution;

      expect(formatLiveTimer(execMmSs, now)).toBe("05:30");

      const execHhMmSs: TaskExecution = {
        id: "2",
        status: "IN_PROGRESS",
        start_time: "2026-09-03T10:00:00Z",
        paused_seconds: 120, // 2 minutes paused
      } as TaskExecution;

      // 2h 5m 30s - 2m = 2h 3m 30s
      expect(formatLiveTimer(execHhMmSs, now)).toBe("02:03:30");
    });

    it("formats paused elapsed time using end_time correctly", () => {
      const exec: TaskExecution = {
        id: "3",
        status: "PAUSED",
        start_time: "2026-09-03T12:00:00Z",
        end_time: "2026-09-03T12:15:00Z",
        paused_seconds: 0,
      } as TaskExecution;

      expect(formatLiveTimer(exec)).toBe("15:00");
    });

    it("returns 'Pausado' if status is not IN_PROGRESS and end_time is not set", () => {
      const exec: TaskExecution = {
        id: "4",
        status: "PAUSED",
        start_time: "2026-09-03T12:00:00Z",
      } as TaskExecution;

      expect(formatLiveTimer(exec)).toBe("Pausado");
    });
  });

  describe("ActiveTaskTimer Component", () => {
    it("renders in-progress timer and updates every second", () => {
      const startTime = new Date();
      const exec: TaskExecution = {
        id: "5",
        status: "IN_PROGRESS",
        start_time: startTime.toISOString(),
        paused_seconds: 0,
      } as TaskExecution;

      render(<ActiveTaskTimer execution={exec} />);

      expect(screen.getByText("00:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText("00:03")).toBeInTheDocument();
    });

    it("renders static paused duration without running timer ticks", () => {
      const startTime = new Date("2026-09-03T10:00:00Z");
      const endTime = new Date("2026-09-03T10:05:00Z");
      const exec: TaskExecution = {
        id: "6",
        status: "PAUSED",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        paused_seconds: 0,
      } as TaskExecution;

      render(<ActiveTaskTimer execution={exec} />);

      expect(screen.getByText("05:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Still 05:00 because paused tasks don't increment
      expect(screen.getByText("05:00")).toBeInTheDocument();
    });
  });
});
