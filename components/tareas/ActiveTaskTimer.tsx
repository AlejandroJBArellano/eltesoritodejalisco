"use client";

import React, { useState, useEffect } from "react";
import type { TaskExecution } from "@/types";

export function formatLiveTimer(
  exec: TaskExecution,
  currentTime: Date = new Date(),
): string {
  if (!exec.start_time) return "00:00";

  const startTime = new Date(exec.start_time);
  let elapsedSeconds = 0;

  if (exec.status === "IN_PROGRESS") {
    elapsedSeconds = Math.floor(
      (currentTime.getTime() - startTime.getTime()) / 1000,
    );
  } else if (exec.status === "PAUSED" && exec.end_time) {
    const endTime = new Date(exec.end_time);
    elapsedSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );
  } else {
    return "Pausado";
  }

  const netSeconds = elapsedSeconds - (exec.paused_seconds || 0);
  const displaySeconds = netSeconds > 0 ? netSeconds : 0;

  const h = Math.floor(displaySeconds / 3600);
  const m = Math.floor((displaySeconds % 3600) / 60);
  const s = displaySeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export interface ActiveTaskTimerProps {
  execution: TaskExecution;
  className?: string;
}

export function ActiveTaskTimer({
  execution,
  className = "text-lg font-black text-text-light font-mono tracking-wider",
}: ActiveTaskTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (execution.status !== "IN_PROGRESS") return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [execution.status]);

  return <span className={className}>{formatLiveTimer(execution, now)}</span>;
}
