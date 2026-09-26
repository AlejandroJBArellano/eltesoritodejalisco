"use client";

import { useState, useEffect } from "react";
import {
  startTask,
  pauseTask,
  resumeTask,
  completeTask,
  uploadTaskPhoto,
} from "@/lib/actions/tasks";
import {
  TASK_FREQUENCY_LABELS,
  type PrimordialTask,
  type TaskExecution,
} from "@/types";
import { ExportButton } from "@/components/ui/DataTableControls";
import { ActiveTaskTimer } from "./ActiveTaskTimer";
import {
  Folder,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

const FREQUENCY_LABELS = TASK_FREQUENCY_LABELS;

export function TareasClient({
  initialTasks,
  initialExecutions,
}: {
  initialTasks: PrimordialTask[];
  initialExecutions: TaskExecution[];
  userId: string;
}) {
  const [executions, setExecutions] =
    useState<TaskExecution[]>(initialExecutions);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Guardar las fotos seleccionadas por ejecución
  const [selectedPhotos, setSelectedPhotos] = useState<{
    [execId: string]: File;
  }>({});

  // Error states (replacing alert)
  const [photoErrors, setPhotoErrors] = useState<{ [execId: string]: string }>(
    {},
  );

  // Controlar alertas de Timeout
  const [timeoutAlert, setTimeoutAlert] = useState<{
    exec: TaskExecution;
    task: PrimordialTask;
  } | null>(null);

  // Comprobar periódicamente si hay tareas con Timeout
  useEffect(() => {
    const checkTimeout = () => {
      executions.forEach((exec) => {
        if (exec.status !== "IN_PROGRESS" || !exec.start_time) return;

        const task = initialTasks.find((t) => t.id === exec.task_id);
        if (!task) return;

        const startTime = new Date(exec.start_time);
        const elapsedSeconds = Math.floor(
          (new Date().getTime() - startTime.getTime()) / 1000,
        );
        const netMinutes = Math.floor(
          (elapsedSeconds - (exec.paused_seconds || 0)) / 60,
        );

        if (netMinutes >= task.timeout_minutes && !timeoutAlert) {
          setTimeoutAlert({ exec, task });
        }
      });
    };

    const alertTimer = setInterval(checkTimeout, 10000);
    return () => clearInterval(alertTimer);
  }, [executions, initialTasks, timeoutAlert]);

  const handleStart = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const newExec = await startTask(taskId);
      setExecutions((prev) => [newExec, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handlePause = async (executionId: string) => {
    setLoadingTaskId(executionId);
    try {
      const updatedExec = await pauseTask(executionId);
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === executionId ? { ...updatedExec, task: e.task } : e,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleResume = async (executionId: string) => {
    setLoadingTaskId(executionId);
    try {
      const updatedExec = await resumeTask(executionId);
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === executionId ? { ...updatedExec, task: e.task } : e,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleFileChange = (execId: string, file: File | null) => {
    if (file) {
      setSelectedPhotos((prev) => ({ ...prev, [execId]: file }));
    }
  };

  const handleComplete = async (exec: TaskExecution, task: PrimordialTask) => {
    const file = selectedPhotos[exec.id];

    if (task.requires_photo && !file) {
      setPhotoErrors((prev) => ({
        ...prev,
        [exec.id]: `Esta tarea requiere una foto de evidencia para completarse.`,
      }));
      return;
    }
    setPhotoErrors((prev) => {
      const c = { ...prev };
      delete c[exec.id];
      return c;
    });

    setLoadingTaskId(exec.id);
    try {
      let photoUrl = "";

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("executionId", exec.id);
        photoUrl = await uploadTaskPhoto(formData);
      }

      const updatedExec = await completeTask(exec.id, photoUrl);

      setSelectedPhotos((prev) => {
        const copy = { ...prev };
        delete copy[exec.id];
        return copy;
      });

      setExecutions((prev) =>
        prev.map((e) =>
          e.id === exec.id ? { ...updatedExec, task: e.task } : e,
        ),
      );
    } catch (e) {
      setPhotoErrors((prev) => ({
        ...prev,
        [exec.id]:
          e instanceof Error ? e.message : "Error al completar la tarea",
      }));
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Modal de Alerta de Timeout */}
      {timeoutAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rose-500/30 p-5 sm:p-6 rounded-xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="rounded-lg bg-rose-500/10 p-3 text-rose-400 w-12 h-12 mx-auto flex items-center justify-center mb-2.5 border border-rose-500/20">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-text-light uppercase tracking-tight">
                ¿Sigues trabajando en esto?
              </h3>
              <p className="text-text-light/60 text-xs mt-1.5 font-normal">
                La tarea{" "}
                <strong className="text-rose-400 font-semibold">
                  &ldquo;{timeoutAlert.task.name}&rdquo;
                </strong>{" "}
                lleva activa más de {timeoutAlert.task.timeout_minutes} minutos.
              </p>
            </div>
            <div className="flex flex-col space-y-2 pt-1">
              <button
                onClick={() => setTimeoutAlert(null)}
                className="bg-primary hover:brightness-110 text-background font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-xs"
              >
                Sí, sigo trabajando
              </button>
              <button
                onClick={() => {
                  handleComplete(timeoutAlert.exec, timeoutAlert.task);
                  setTimeoutAlert(null);
                }}
                className="bg-background/80 border border-border hover:bg-white/10 text-text-light font-semibold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Olvidé cerrarla, Completar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar with Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-text-light uppercase tracking-wider">
            Checklist de Turno
          </span>
          <span className="text-[11px] font-mono font-medium text-text-light/60 px-2 py-0.5 rounded-md bg-white/[0.04] border border-border/60">
            {initialTasks.length} {initialTasks.length === 1 ? "tarea" : "tareas"}
          </span>
        </div>
        <ExportButton
          data={initialTasks}
          columns={[
            { header: "Tarea", key: "name" },
            {
              header: "Categoría",
              accessor: (t) => t.category?.name || "Sin Categoría",
            },
            {
              header: "Frecuencia",
              accessor: (t) =>
                FREQUENCY_LABELS[t.frequency_type] || t.frequency_type,
            },
            {
              header: "Tiempo Estimado",
              accessor: (t) => `${t.timeout_minutes} min`,
            },
            {
              header: "Estado Actual",
              accessor: (t) => {
                const exec = executions.find((e) => e.task_id === t.id);
                if (!exec) return "PENDIENTE";
                if (exec.status === "COMPLETED") return "COMPLETADA";
                if (exec.status === "IN_PROGRESS") return "EN PROGRESO";
                if (exec.status === "PAUSED") return "PAUSADA";
                return exec.status;
              },
            },
          ]}
          filename={() =>
            `checklist_tareas_${new Date().toISOString().split("T")[0]}`
          }
          sheetName="Checklist"
        />
      </div>

      {/* Task List Grouped by Category */}
      <div className="space-y-8">
        {Object.entries(
          initialTasks.reduce(
            (acc, task) => {
              const catName = task.category?.name || "Sin Categoría";
              if (!acc[catName]) {
                acc[catName] = [];
              }
              acc[catName].push(task);
              return acc;
            },
            {} as { [categoryName: string]: PrimordialTask[] },
          ),
        ).map(([categoryName, tasks]) => (
          <div key={categoryName} className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Folder className="h-4 w-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-text-light uppercase tracking-wide">
                  {categoryName}
                </h2>
              </div>
              <span className="text-xs font-mono font-medium text-text-light/50">
                {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {tasks.map((task) => {
                const activeExecution = executions.find(
                  (e) =>
                    e.task_id === task.id &&
                    (e.status === "IN_PROGRESS" || e.status === "PAUSED"),
                );

                const frequencyLabel =
                  FREQUENCY_LABELS[task.frequency_type] || task.frequency_type;

                return (
                  <div
                    key={task.id}
                    className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-xl border transition-all duration-150 shadow-xs ${
                      activeExecution
                        ? "bg-card border-primary/50 ring-1 ring-primary/20"
                        : "bg-card border-border/70 hover:border-border hover:bg-card/90"
                    }`}
                  >
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-text-light tracking-tight group-hover:text-white transition-colors leading-snug">
                        {task.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-border/60 px-2 py-0.5 text-[11px] font-medium text-text-light/70 uppercase tracking-wider">
                          <span className="h-1 w-1 rounded-full bg-text-light/40" />
                          {frequencyLabel}
                        </span>
                        {task.requires_photo && (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                            <Camera className="h-3 w-3 text-amber-400" />
                            Evidencia Foto
                          </span>
                        )}
                      </div>
                    </div>

                    {activeExecution ? (
                      <div className="mt-4 border-t border-border/70 pt-3.5 space-y-3.5">
                        <div className="flex justify-between items-center bg-background/60 px-3.5 py-2.5 rounded-lg border border-border/70">
                          <span className="text-xs font-semibold text-text-light/70 uppercase tracking-wider flex items-center gap-2">
                            {activeExecution.status === "PAUSED" ? (
                              <>
                                <Pause className="h-3.5 w-3.5 text-amber-400" />
                                <span>Pausado</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                                <span className="text-emerald-400">En progreso</span>
                              </>
                            )}
                          </span>
                          <ActiveTaskTimer
                            execution={activeExecution}
                            className="text-base font-mono font-bold text-text-light tabular-nums"
                          />
                        </div>

                        {/* Input Camera / Photo upload if required */}
                        {task.requires_photo && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-light/70 uppercase tracking-wider block">
                              Subir Foto de Evidencia
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) =>
                                handleFileChange(
                                  activeExecution.id,
                                  e.target.files?.[0] || null,
                                )
                              }
                              className="block w-full text-xs text-text-light/60 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text-light hover:file:bg-white/15 file:transition-all cursor-pointer rounded-lg border border-border/60 bg-background/40 p-1"
                            />
                            {photoErrors[activeExecution.id] && (
                              <p className="text-xs font-medium text-rose-400 mt-1">
                                ⚠️ {photoErrors[activeExecution.id]}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2.5">
                          {activeExecution.status === "IN_PROGRESS" ? (
                            <button
                              onClick={() => handlePause(activeExecution.id)}
                              disabled={loadingTaskId === activeExecution.id}
                              className="inline-flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-lg flex-1 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              <Pause className="h-3.5 w-3.5" /> Pausar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResume(activeExecution.id)}
                              disabled={loadingTaskId === activeExecution.id}
                              className="inline-flex items-center justify-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-lg flex-1 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Reanudar
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleComplete(activeExecution, task)
                            }
                            disabled={loadingTaskId === activeExecution.id}
                            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-lg flex-1 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Completar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStart(task.id)}
                        disabled={loadingTaskId === task.id}
                        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-dark border border-primary/25 hover:border-primary py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer group-hover:border-primary/50"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        {loadingTaskId === task.id
                          ? "Iniciando..."
                          : "Iniciar Tarea"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
