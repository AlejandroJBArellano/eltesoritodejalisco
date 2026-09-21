import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CampaignsContent } from "../CampaignsContent";

const mockTenant = {
  id: "tenant-123",
  name: "Tacos El Pastor",
  slug: "tacos-pastor",
  system_name: "Tacos El Pastor",
};

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
}));

describe("CampaignsContent Component", () => {
  const mockInitialCampaigns = [
    {
      id: "camp-1",
      name: "Campaña Septiembre",
      subject: "Asunto de prueba",
      template_key: "te_extranamos",
      message_content: "Mensaje",
      segment_filters: {},
      status: "SENT",
      total_recipients: 20,
      sent_count: 18,
      failed_count: 2,
      scheduled_for: null,
      sent_at: "2026-09-19T10:00:00Z",
      created_by: "user-1",
      tenant_id: "tenant-123",
      created_at: "2026-09-19T09:50:00Z",
      updated_at: "2026-09-19T10:00:00Z",
      recipients: [],
    },
  ];

  const mockInitialStats = {
    totalCampaigns: 1,
    totalSent: 18,
    totalFailed: 2,
    uniqueCustomersReached: 15,
    successRate: 90,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        campaigns: mockInitialCampaigns,
        stats: mockInitialStats,
      }),
    });
  });

  it("should render KPI cards with correct metrics and campaigns table", () => {
    render(
      <CampaignsContent
        initialCampaigns={mockInitialCampaigns}
        initialStats={mockInitialStats}
      />,
    );

    expect(screen.getByText("Campañas & Fidelización")).toBeInTheDocument();
    expect(screen.getByText("Total Campañas")).toBeInTheDocument();
    expect(screen.getByText("Correos Enviados")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("2 fallidos")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("Directorio")).toBeInTheDocument();
  });

  it("should open NewCampaignModal when clicking 'Nueva Campaña' header button", () => {
    render(
      <CampaignsContent
        initialCampaigns={mockInitialCampaigns}
        initialStats={mockInitialStats}
      />,
    );

    const newCampaignBtn = screen.getByTestId("new-campaign-header-btn");
    fireEvent.click(newCampaignBtn);

    expect(
      screen.getByText(/Nueva Campaña: Segmentación/i),
    ).toBeInTheDocument();
  });
});
