"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  approveTask,
  getExecutionsForDate,
  getStaffPerformanceMetrics,
  createTaskCategory,
  createPrimordialTask,
  updatePrimordialTask,
  deletePrimordialTask,
} from "@/lib/actions/tasks";
import type {
  TaskExecution,
  TaskCategory,
  PrimordialTask,
  TaskFrequency,
} from "@/types";
import type {
  AdminTareasTab,
  StaffPerformanceMetric,
  ExecSortField,
  ExecComplianceFilter,
  CollaboratorOption,
  TaskSortField,
  SortDir,
  TaskFormData,
} from "./types";

export interface AdminTareasContextValue {
  // Navigation
  activeTab: AdminTareasTab;
  setActiveTab: (tab: AdminTareasTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Data
  executions: TaskExecution[];
  metrics: StaffPerformanceMetric[];
  categories: TaskCategory[];
  tasks: PrimordialTask[];
  loading: string | null;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  armedTaskId: string | null;
  setArmedTaskId: (id: string | null) => void;

  // Actions
  handleApprove: (executionId: string) => Promise<void>;
  handleDeleteTask: (id: string) => Promise<void>;

  // Executions Table State
  execSearch: string;
  setExecSearch: (v: string) => void;
  execStatusFilter: string;
  setExecStatusFilter: (v: string) => void;
  execUserFilter: string;
  setExecUserFilter: (v: string) => void;
  execComplianceFilter: ExecComplianceFilter;
  setExecComplianceFilter: (v: ExecComplianceFilter) => void;
  collaborators: CollaboratorOption[];
  execSortField: ExecSortField;
  setExecSortField: (f: ExecSortField) => void;
  execSortDir: SortDir;
  setExecSortDir: React.Dispatch<React.SetStateAction<SortDir>>;
  execPage: number;
  setExecPage: (p: number) => void;
  execPageSize: number;
  setExecPageSize: (s: number) => void;
  unifiedExecutions: TaskExecution[];
  sortedExecutions: TaskExecution[];
  paginatedExecutions: TaskExecution[];
  execTotalPages: number;

  // Tasks Table State
  taskSearch: string;
  setTaskSearch: (v: string) => void;
  taskCatFilter: string;
  setTaskCatFilter: (v: string) => void;
  taskFreqFilter: string;
  setTaskFreqFilter: (v: string) => void;
  taskSortField: TaskSortField;
  setTaskSortField: (f: TaskSortField) => void;
  taskSortDir: SortDir;
  setTaskSortDir: React.Dispatch<React.SetStateAction<SortDir>>;
  taskPage: number;
  setTaskPage: (p: number) => void;
  taskPageSize: number;
  setTaskPageSize: (s: number) => void;
  filteredTasks: PrimordialTask[];
  sortedTasks: PrimordialTask[];
  paginatedTasks: PrimordialTask[];
  taskTotalPages: number;

  // Category Modal
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (v: boolean) => void;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  handleCreateCategory: (e: React.FormEvent) => Promise<void>;

  // Task Modal
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (v: boolean) => void;
  openNewTaskModal: () => void;
  openEditTaskModal: (task: PrimordialTask) => void;
  closeTaskModal: () => void;
  editingTaskId: string | null;
  taskFormData: TaskFormData;
  updateTaskFormData: (updates: Partial<TaskFormData>) => void;
  handleCreateTask: (e: React.FormEvent) => Promise<void>;
  handleUpdateTask: (e: React.FormEvent) => Promise<void>;
}

const AdminTareasContext = createContext<AdminTareasContextValue | null>(null);

export function useAdminTareasContext(): AdminTareasContextValue {
  const ctx = useContext(AdminTareasContext);
  if (!ctx) {
    throw new Error(
      "useAdminTareasContext must be used within an AdminTareasProvider",
    );
  }
  return ctx;
}

export function useOptionalAdminTareasContext(): AdminTareasContextValue | null {
  return useContext(AdminTareasContext);
}

export interface AdminTareasProviderProps {
  initialExecutions: TaskExecution[];
  initialCategories: TaskCategory[];
  initialTasks: PrimordialTask[];
  children: React.ReactNode;
}

const getTodayString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

export function AdminTareasProvider({
  initialExecutions,
  initialCategories,
  initialTasks,
  children,
}: AdminTareasProviderProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<AdminTareasTab>("history");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);

  // Data states
  const [executions, setExecutions] =
    useState<TaskExecution[]>(initialExecutions);
  const [metrics, setMetrics] = useState<StaffPerformanceMetric[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [armedTaskId, setArmedTaskId] = useState<string | null>(null);

  const [categories, setCategories] =
    useState<TaskCategory[]>(initialCategories);
  const [tasks, setTasks] = useState<PrimordialTask[]>(initialTasks);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Task form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    name: "",
    categoryId: initialCategories[0]?.id || "",
    frequencyType: "DAILY",
    requiresPhoto: false,
    timeoutMinutes: 60,
  });

  const updateTaskFormData = useCallback((updates: Partial<TaskFormData>) => {
    setTaskFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Table Controls - Executions
  const [execSearch, setExecSearch] = useState("");
  const [execStatusFilter, setExecStatusFilter] = useState("ALL");
  const [execUserFilter, setExecUserFilter] = useState("ALL");
  const [execComplianceFilter, setExecComplianceFilter] =
    useState<ExecComplianceFilter>("ALL");
  const [execSortField, setExecSortField] = useState<ExecSortField>("task");
  const [execSortDir, setExecSortDir] = useState<SortDir>("asc");
  const [execPage, setExecPage] = useState(1);
  const [execPageSize, setExecPageSize] = useState(10);

  // Table Controls - Tasks
  const [taskSearch, setTaskSearch] = useState("");
  const [taskCatFilter, setTaskCatFilter] = useState("ALL");
  const [taskFreqFilter, setTaskFreqFilter] = useState("ALL");
  const [taskSortField, setTaskSortField] = useState<TaskSortField>("name");
  const [taskSortDir, setTaskSortDir] = useState<SortDir>("asc");
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(10);

  useEffect(() => {
    if (categories.length > 0 && !taskFormData.categoryId) {
      setTaskFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, taskFormData.categoryId]);

  // Load executions & metrics on date change
  useEffect(() => {
    const loadData = async () => {
      setErrorMsg(null);
      try {
        setLoading("data");
        const [execData, metricsData] = await Promise.all([
          getExecutionsForDate(selectedDate),
          getStaffPerformanceMetrics(selectedDate),
        ]);
        setExecutions(execData);
        setMetrics(metricsData);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Error al cargar registros.",
        );
      } finally {
        setLoading(null);
      }
    };
    loadData();
  }, [selectedDate]);

  const handleApprove = async (executionId: string) => {
    try {
      setLoading(executionId);
      await approveTask(executionId);
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === executionId ? { ...e, status: "APPROVED" } : e,
        ),
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al aprobar tarea",
      );
    } finally {
      setLoading(null);
    }
  };

  // Category Modal Handlers
  const openCategoryModal = () => {
    setNewCategoryName("");
    setIsCategoryModalOpen(true);
  };
  const closeCategoryModal = () => setIsCategoryModalOpen(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setLoading("cat");
      const created = await createTaskCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, created]);
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al crear categoría",
      );
    } finally {
      setLoading(null);
    }
  };

  // Task Modal Handlers
  const openNewTaskModal = () => {
    setEditingTaskId(null);
    setTaskFormData({
      name: "",
      categoryId: categories[0]?.id || "",
      frequencyType: "DAILY",
      requiresPhoto: false,
      timeoutMinutes: 60,
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (t: PrimordialTask) => {
    setEditingTaskId(t.id);
    setTaskFormData({
      name: t.name,
      categoryId: t.category_id || (categories[0]?.id ?? ""),
      frequencyType: t.frequency_type,
      requiresPhoto: t.requires_photo,
      timeoutMinutes: t.timeout_minutes,
    });
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => setIsTaskModalOpen(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.name.trim()) return;
    try {
      setLoading("task");
      const created = await createPrimordialTask(
        taskFormData.name.trim(),
        taskFormData.frequencyType,
        taskFormData.requiresPhoto,
        taskFormData.timeoutMinutes,
        taskFormData.categoryId,
      );
      const cat = categories.find((c) => c.id === taskFormData.categoryId);
      setTasks((prev) => [...prev, { ...created, category: cat }]);
      setIsTaskModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al crear tarea");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !taskFormData.name.trim()) return;
    try {
      setLoading("task");
      const updated = await updatePrimordialTask(
        editingTaskId,
        taskFormData.name.trim(),
        taskFormData.frequencyType,
        taskFormData.requiresPhoto,
        taskFormData.timeoutMinutes,
        taskFormData.categoryId,
      );
      const cat = categories.find((c) => c.id === taskFormData.categoryId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId ? { ...updated, category: cat } : t,
        ),
      );
      setEditingTaskId(null);
      setIsTaskModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al actualizar tarea",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (armedTaskId !== id) {
      setArmedTaskId(id);
      setTimeout(() => setArmedTaskId(null), 3000);
      return;
    }
    setArmedTaskId(null);
    try {
      setLoading("task");
      await deletePrimordialTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al desactivar la tarea",
      );
    } finally {
      setLoading(null);
    }
  };

  // Collaborators derived from metrics and executions
  const collaborators = useMemo<CollaboratorOption[]>(() => {
    const map = new Map<string, string>();
    metrics.forEach((m) => {
      if (m.userId && m.name) {
        map.set(m.userId, m.name);
      }
    });
    executions.forEach((e) => {
      const id = e.user_id || e.user?.id;
      const name = e.user?.full_name;
      if (id) {
        map.set(id, name || id);
      } else if (name) {
        map.set(name, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [metrics, executions]);

  // Unified Executions: Real task_executions + computed virtual NOT_DONE executions
  const unifiedExecutions = useMemo<TaskExecution[]>(() => {
    const activeTasks = tasks.filter((t) => t.is_active !== false);
    const executionsByTaskId = new Map<string, TaskExecution[]>();

    executions.forEach((e) => {
      const list = executionsByTaskId.get(e.task_id) || [];
      list.push(e);
      executionsByTaskId.set(e.task_id, list);
    });

    const notDoneVirtualExecutions: TaskExecution[] = [];

    activeTasks.forEach((task) => {
      const taskExecs = executionsByTaskId.get(task.id);
      if (!taskExecs || taskExecs.length === 0) {
        notDoneVirtualExecutions.push({
          id: `not-done-${task.id}`,
          task_id: task.id,
          status: "NOT_DONE",
          paused_seconds: 0,
          created_at: selectedDate
            ? `${selectedDate}T00:00:00.000Z`
            : new Date().toISOString(),
          updated_at: selectedDate
            ? `${selectedDate}T00:00:00.000Z`
            : new Date().toISOString(),
          task,
        });
      }
    });

    return [...executions, ...notDoneVirtualExecutions];
  }, [executions, tasks, selectedDate]);

  // Filtered & Sorted Executions
  const filteredExecutions = useMemo(() => {
    return unifiedExecutions.filter((exec) => {
      // 1. Search text
      if (execSearch.trim()) {
        const q = execSearch.toLowerCase();
        const tName = (exec.task?.name || "").toLowerCase();
        const uName = (exec.user?.full_name || "").toLowerCase();
        if (!tName.includes(q) && !uName.includes(q)) return false;
      }

      // 2. Compliance filter
      if (execComplianceFilter === "COMPLETED") {
        if (exec.status !== "COMPLETED" && exec.status !== "APPROVED") {
          return false;
        }
      } else if (execComplianceFilter === "NOT_DONE") {
        if (exec.status === "COMPLETED" || exec.status === "APPROVED") {
          return false;
        }
      }

      // 3. Status filter
      if (execStatusFilter !== "ALL" && exec.status !== execStatusFilter) {
        return false;
      }

      // 4. Collaborator filter
      if (execUserFilter !== "ALL") {
        const uId = exec.user_id || exec.user?.id;
        const uName = exec.user?.full_name;
        if (execUserFilter === "UNASSIGNED") {
          if (uId || uName) return false;
        } else {
          if (uId !== execUserFilter && uName !== execUserFilter) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    unifiedExecutions,
    execSearch,
    execComplianceFilter,
    execStatusFilter,
    execUserFilter,
  ]);

  const sortedExecutions = useMemo(() => {
    return [...filteredExecutions].sort((a, b) => {
      let comp = 0;
      if (execSortField === "task")
        comp = (a.task?.name || "").localeCompare(b.task?.name || "");
      else if (execSortField === "user")
        comp = (a.user?.full_name || "").localeCompare(b.user?.full_name || "");
      else if (execSortField === "status")
        comp = (a.status || "").localeCompare(b.status || "");
      else if (execSortField === "duration")
        comp = (a.net_duration_minutes || 0) - (b.net_duration_minutes || 0);
      return execSortDir === "asc" ? comp : -comp;
    });
  }, [filteredExecutions, execSortField, execSortDir]);

  useEffect(() => {
    setExecPage(1);
  }, [
    execSearch,
    execStatusFilter,
    execComplianceFilter,
    execUserFilter,
    execSortField,
    execSortDir,
  ]);

  const execTotalPages = Math.ceil(sortedExecutions.length / execPageSize) || 1;
  const paginatedExecutions = useMemo(() => {
    const start = (execPage - 1) * execPageSize;
    return sortedExecutions.slice(start, start + execPageSize);
  }, [sortedExecutions, execPage, execPageSize]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        if (!t.name.toLowerCase().includes(q)) return false;
      }
      if (taskCatFilter !== "ALL" && t.category_id !== taskCatFilter)
        return false;
      if (taskFreqFilter !== "ALL" && t.frequency_type !== taskFreqFilter)
        return false;
      return true;
    });
  }, [tasks, taskSearch, taskCatFilter, taskFreqFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comp = 0;
      if (taskSortField === "name") comp = a.name.localeCompare(b.name);
      else if (taskSortField === "category")
        comp = (a.category?.name || "").localeCompare(b.category?.name || "");
      else if (taskSortField === "frequency")
        comp = a.frequency_type.localeCompare(b.frequency_type);
      return taskSortDir === "asc" ? comp : -comp;
    });
  }, [filteredTasks, taskSortField, taskSortDir]);

  useEffect(() => {
    setTaskPage(1);
  }, [taskSearch, taskCatFilter, taskFreqFilter, taskSortField, taskSortDir]);

  const taskTotalPages = Math.ceil(sortedTasks.length / taskPageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * taskPageSize;
    return sortedTasks.slice(start, start + taskPageSize);
  }, [sortedTasks, taskPage, taskPageSize]);

  const value: AdminTareasContextValue = {
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    executions,
    metrics,
    categories,
    tasks,
    loading,
    errorMsg,
    setErrorMsg,
    armedTaskId,
    setArmedTaskId,
    handleApprove,
    handleDeleteTask,
    execSearch,
    setExecSearch,
    execStatusFilter,
    setExecStatusFilter,
    execUserFilter,
    setExecUserFilter,
    execComplianceFilter,
    setExecComplianceFilter,
    collaborators,
    execSortField,
    setExecSortField,
    execSortDir,
    setExecSortDir,
    execPage,
    setExecPage,
    execPageSize,
    setExecPageSize,
    unifiedExecutions,
    sortedExecutions,
    paginatedExecutions,
    execTotalPages,
    taskSearch,
    setTaskSearch,
    taskCatFilter,
    setTaskCatFilter,
    taskFreqFilter,
    setTaskFreqFilter,
    taskSortField,
    setTaskSortField,
    taskSortDir,
    setTaskSortDir,
    taskPage,
    setTaskPage,
    taskPageSize,
    setTaskPageSize,
    filteredTasks,
    sortedTasks,
    paginatedTasks,
    taskTotalPages,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    newCategoryName,
    setNewCategoryName,
    handleCreateCategory,
    isTaskModalOpen,
    setIsTaskModalOpen,
    openNewTaskModal,
    openEditTaskModal,
    closeTaskModal,
    editingTaskId,
    taskFormData,
    updateTaskFormData,
    handleCreateTask,
    handleUpdateTask,
  };

  return (
    <AdminTareasContext.Provider value={value}>
      {children}
    </AdminTareasContext.Provider>
  );
}
