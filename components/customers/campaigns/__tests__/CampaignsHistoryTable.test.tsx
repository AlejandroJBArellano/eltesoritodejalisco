import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CampaignsHistoryTable,
  type CampaignWithRecipients,
} from "../CampaignsHistoryTable";

describe("CampaignsHistoryTable Component", () => {
  const mockOnRefresh = vi.fn();

  const mockCampaigns: CampaignWithRecipients[] = [
    {
      id: "camp-1",
      name: "Reactivación Verano",
      subject: "¡Te extrañamos en Tacos El Pastor!",
      template_key: "te_extranamos",
      message_content: "Hola {nombre}, regresa pronto.",
      segment_filters: { inactiveDays: 30 },
      status: "SENT",
      total_recipients: 10,
      sent_count: 10,
      failed_count: 0,
      scheduled_for: null,
      sent_at: "2026-09-19T15:30:00Z",
      created_by: "user-1",
      tenant_id: "tenant-1",
      created_at: "2026-09-19T15:25:00Z",
      updated_at: "2026-09-19T15:30:00Z",
      recipients: [
        {
          id: "rec-1",
          campaign_id: "camp-1",
          tenant_id: "tenant-1",
          customer_id: "cust-1",
          customer_name: "Pedro Infante",
          customer_email: "pedro@example.com",
          loyalty_points: 150,
          status: "SENT",
          error_message: null,
          sent_at: "2026-09-19T15:30:00Z",
          created_at: "2026-09-19T15:25:00Z",
        },
      ],
    },
    {
      id: "camp-2",
      name: "Promoción Puntos VIP",
      subject: "Canjea tus 200 puntos hoy",
      template_key: "canje_puntos",
      message_content: "Tienes {puntos} puntos.",
      segment_filters: { minPoints: 100 },
      status: "FAILED",
      total_recipients: 5,
      sent_count: 3,
      failed_count: 2,
      scheduled_for: null,
      sent_at: "2026-09-18T10:00:00Z",
      created_by: "user-1",
      tenant_id: "tenant-1",
      created_at: "2026-09-18T09:55:00Z",
      updated_at: "2026-09-18T10:00:00Z",
      recipients: [
        {
          id: "rec-2",
          campaign_id: "camp-2",
          tenant_id: "tenant-1",
          customer_id: "cust-2",
          customer_name: "María Félix",
          customer_email: "maria@example.com",
          loyalty_points: 200,
          status: "FAILED",
          error_message: "Mailbox not found",
          sent_at: null,
          created_at: "2026-09-18T09:55:00Z",
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no campaigns are available", () => {
    render(
      <CampaignsHistoryTable
        campaigns={[]}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />,
    );

    expect(screen.getByText("Historial de Campañas (0)")).toBeInTheDocument();
    expect(
      screen.getByText("No se encontraron campañas registradas."),
    ).toBeInTheDocument();
  });

  it("should render campaigns, status badges and trigger refresh", () => {
    render(
      <CampaignsHistoryTable
        campaigns={mockCampaigns}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />,
    );

    expect(screen.getByText("Historial de Campañas (2)")).toBeInTheDocument();
    expect(screen.getByText("Reactivación Verano")).toBeInTheDocument();
    expect(screen.getByText("Promoción Puntos VIP")).toBeInTheDocument();

    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Te Extrañamos")).toBeInTheDocument();
    expect(screen.getByText("Canje de Puntos")).toBeInTheDocument();

    const refreshBtn = screen.getByTestId("refresh-campaigns-btn");
    fireEvent.click(refreshBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it("should filter campaigns by search input and status buttons", () => {
    render(
      <CampaignsHistoryTable
        campaigns={mockCampaigns}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por campaña o asunto/i);
    fireEvent.change(searchInput, { target: { value: "VIP" } });

    expect(screen.queryByText("Reactivación Verano")).not.toBeInTheDocument();
    expect(screen.getByText("Promoción Puntos VIP")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Reactivación Verano")).toBeInTheDocument();

    // Filter by status 'Enviadas'
    const enviadasBtn = screen.getByRole("button", { name: "Enviadas" });
    fireEvent.click(enviadasBtn);

    expect(screen.getByText("Reactivación Verano")).toBeInTheDocument();
    expect(screen.queryByText("Promoción Puntos VIP")).not.toBeInTheDocument();
  });

  it("should open recipient details modal and show recipient data", () => {
    render(
      <CampaignsHistoryTable
        campaigns={mockCampaigns}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />,
    );

    const viewDetailsBtn = screen.getByTestId("view-campaign-details-camp-1");
    fireEvent.click(viewDetailsBtn);

    expect(screen.getByText("Detalle: Reactivación Verano")).toBeInTheDocument();
    expect(screen.getByText("Pedro Infante")).toBeInTheDocument();
    expect(screen.getByText("pedro@example.com")).toBeInTheDocument();
    expect(screen.getByText("150 pts")).toBeInTheDocument();
    expect(screen.getByText("Entregado")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Detalle: Reactivación Verano")).not.toBeInTheDocument();
  });
});
