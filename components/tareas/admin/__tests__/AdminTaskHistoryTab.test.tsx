import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminTaskHistoryTab } from "../AdminTaskHistoryTab";
import type { TaskExecution } from "@/types";

const mockExecutions: TaskExecution[] = [
  {
    id: "exec-1",
    task_id: "t-1",
    user_id: "u-1",
    status: "COMPLETED",
    start_time: "2026-09-03T10:00:00Z",
    net_duration_minutes: 25,
    photo_url: "https://example.com/photo.jpg",
    paused_seconds: 0,
    task: {
      id: "t-1",
      name: "Cierre de Caja",
      frequency_type: "CLOSING",
      requires_photo: true,
      timeout_minutes: 30,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    user: {
      id: "u-1",
      full_name: "María López",
    },
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T10:00:00Z",
  },
  {
    id: "exec-2",
    task_id: "t-2",
    user_id: "u-2",
    status: "APPROVED",
    start_time: "2026-09-03T09:00:00Z",
    net_duration_minutes: 15,
    photo_url: undefined,
    paused_seconds: 0,
    task: {
      id: "t-2",
      name: "Recepción de Verduras",
      frequency_type: "DAILY",
      requires_photo: false,
      timeout_minutes: 20,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    user: {
      id: "u-2",
      full_name: "José Torres",
    },
    created_at: "2026-09-03T09:00:00Z",
    updated_at: "2026-09-03T09:00:00Z",
  },
];

describe("AdminTaskHistoryTab Component", () => {
  it("renders empty state when no executions are present", () => {
    render(
      <AdminTaskHistoryTab
        selectedDate="2026-09-03"
        paginatedExecutions={[]}
        sortedExecutions={[]}
      />,
    );

    expect(
      screen.getByText("Ejecución de Tareas - 2026-09-03"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No hay ejecuciones registradas."),
    ).toBeInTheDocument();
  });

  it("renders executions with status badges, evidence link, and approve button", () => {
    const onApproveMock = vi.fn();
    const onSearchMock = vi.fn();
    const onStatusFilterMock = vi.fn();
    const onSortMock = vi.fn();

    render(
      <AdminTaskHistoryTab
        selectedDate="2026-09-03"
        paginatedExecutions={mockExecutions}
        sortedExecutions={mockExecutions}
        onApprove={onApproveMock}
        onSearchChange={onSearchMock}
        onStatusFilterChange={onStatusFilterMock}
        onSort={onSortMock}
      />,
    );

    expect(screen.getByText("Cierre de Caja")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getAllByText("Listo para Aprobar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("25 min")).toBeInTheDocument();

    const photoLink = screen.getByRole("link", { name: /ver foto/i });
    expect(photoLink).toHaveAttribute(
      "href",
      "https://example.com/photo.jpg",
    );

    const approveBtn = screen.getByRole("button", { name: /aprobar/i });
    expect(approveBtn).toBeInTheDocument();
    fireEvent.click(approveBtn);
    expect(onApproveMock).toHaveBeenCalledWith("exec-1");

    expect(screen.getByText("Recepción de Verduras")).toBeInTheDocument();
    expect(screen.getByText("José Torres")).toBeInTheDocument();
    expect(screen.getAllByText("Aprobado").length).toBeGreaterThanOrEqual(1);

    // Search and filter interactions
    const searchInput = screen.getByPlaceholderText(
      /buscar por tarea o colaborador/i,
    );
    fireEvent.change(searchInput, { target: { value: "Cierre" } });
    expect(onSearchMock).toHaveBeenCalledWith("Cierre");

    const statusSelect = screen.getByDisplayValue("Todos los Estados");
    fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });
    expect(onStatusFilterMock).toHaveBeenCalledWith("COMPLETED");
  });

  it("handles compliance switch and collaborator dropdown interactions", () => {
    const onComplianceFilterMock = vi.fn();
    const onUserFilterMock = vi.fn();

    const mockCollaborators = [
      { id: "u-1", name: "María López" },
      { id: "u-2", name: "José Torres" },
    ];

    render(
      <AdminTaskHistoryTab
        selectedDate="2026-09-03"
        paginatedExecutions={mockExecutions}
        sortedExecutions={mockExecutions}
        collaborators={mockCollaborators}
        complianceFilter="ALL"
        onComplianceFilterChange={onComplianceFilterMock}
        userFilter="ALL"
        onUserFilterChange={onUserFilterMock}
      />,
    );

    // Compliance switch buttons
    const completedBtn = screen.getByRole("button", { name: "Completadas" });
    fireEvent.click(completedBtn);
    expect(onComplianceFilterMock).toHaveBeenCalledWith("COMPLETED");

    const notDoneBtn = screen.getByRole("button", { name: "No Realizadas" });
    fireEvent.click(notDoneBtn);
    expect(onComplianceFilterMock).toHaveBeenCalledWith("NOT_DONE");

    const allBtn = screen.getByRole("button", { name: "Todas" });
    fireEvent.click(allBtn);
    expect(onComplianceFilterMock).toHaveBeenCalledWith("ALL");

    // Collaborator select
    const userSelect = screen.getByDisplayValue("Todos los Colaboradores");
    fireEvent.change(userSelect, { target: { value: "u-1" } });
    expect(onUserFilterMock).toHaveBeenCalledWith("u-1");
  });

  it("renders NOT_DONE virtual task executions with badge, Sin Asignar, and dash values", () => {
    const notDoneExec: TaskExecution = {
      id: "not-done-task-99",
      task_id: "t-99",
      status: "NOT_DONE",
      paused_seconds: 0,
      created_at: "2026-09-03T00:00:00Z",
      updated_at: "2026-09-03T00:00:00Z",
      task: {
        id: "t-99",
        name: "Desinfección de Mesas",
        frequency_type: "DAILY",
        requires_photo: false,
        timeout_minutes: 15,
        is_active: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    };

    render(
      <AdminTaskHistoryTab
        selectedDate="2026-09-03"
        paginatedExecutions={[notDoneExec]}
        sortedExecutions={[notDoneExec]}
      />,
    );

    expect(screen.getByText("Desinfección de Mesas")).toBeInTheDocument();
    expect(screen.getAllByText("No Realizada").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sin Asignar").length).toBeGreaterThanOrEqual(1);
    // Verify no approve button is rendered for NOT_DONE
    expect(screen.queryByRole("button", { name: /aprobar/i })).not.toBeInTheDocument();
  });
});
