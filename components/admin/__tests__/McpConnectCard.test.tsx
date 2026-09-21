import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { McpConnectCard } from "../McpConnectCard";
import * as actionsModule from "@/lib/mcp/actions";

vi.mock("@/lib/mcp/actions", () => ({
  createTenantApiKeyAction: vi.fn(),
  listTenantApiKeysAction: vi.fn(),
  revokeTenantApiKeyAction: vi.fn(),
}));

describe("McpConnectCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("should render header, 3-step guide and tabs", async () => {
    vi.mocked(actionsModule.listTenantApiKeysAction).mockResolvedValueOnce({
      success: true,
      keys: [],
    });

    render(<McpConnectCard />);

    expect(screen.getByText("Conectar con Asistentes de IA (MCP)")).toBeInTheDocument();
    expect(screen.getByText("1-Click Setup")).toBeInTheDocument();
    expect(screen.getByText("Paso 1")).toBeInTheDocument();
    expect(screen.getByText("Paso 2")).toBeInTheDocument();
    expect(screen.getByText("Paso 3")).toBeInTheDocument();
    expect(screen.getByText("Claude Desktop")).toBeInTheDocument();
    expect(screen.getByText("Cursor IDE")).toBeInTheDocument();
    expect(screen.getByText("Terminal / NPX")).toBeInTheDocument();
  });

  it("should list active keys when present", async () => {
    vi.mocked(actionsModule.listTenantApiKeysAction).mockResolvedValueOnce({
      success: true,
      keys: [
        {
          id: "key-1",
          name: "Claude Assistant",
          key_prefix: "kt_live_12345678...",
          scopes: ["analytics:read"],
          last_used_at: "2026-09-21T00:00:00.000Z",
          created_at: "2026-09-20T00:00:00.000Z",
        },
      ],
    });

    render(<McpConnectCard />);

    await waitFor(() => {
      expect(screen.getByText("Claude Assistant")).toBeInTheDocument();
      expect(screen.getByText("kt_live_12345678...")).toBeInTheDocument();
    });
  });

  it("should generate a new API key on click and show success banner", async () => {
    vi.mocked(actionsModule.listTenantApiKeysAction).mockResolvedValue({
      success: true,
      keys: [],
    });
    vi.mocked(actionsModule.createTenantApiKeyAction).mockResolvedValueOnce({
      success: true,
      key: {
        id: "key-new",
        name: "Claude / Cursor Assistant",
        keyPrefix: "kt_live_abcd1234...",
        createdAt: "2026-09-21T00:00:00.000Z",
        rawKey: "kt_live_abcd1234567890abcdef12345678",
      },
    });

    render(<McpConnectCard />);

    const generateBtn = screen.getByText("Activar Conexión IA");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("¡Nueva clave generada con éxito!")).toBeInTheDocument();
      expect(screen.getByText("kt_live_abcd1234567890abcdef12345678")).toBeInTheDocument();
    });

    // Test copy raw key
    const copyKeyBtn = screen.getByTitle("Copiar Clave");
    fireEvent.click(copyKeyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("kt_live_abcd1234567890abcdef12345678");
  });

  it("should switch tabs and copy snippet", async () => {
    vi.mocked(actionsModule.listTenantApiKeysAction).mockResolvedValueOnce({
      success: true,
      keys: [],
    });

    render(<McpConnectCard />);

    const cursorTab = screen.getByText("Cursor IDE");
    fireEvent.click(cursorTab);

    const copySnippetBtn = screen.getByText("Copiar para Cursor");
    fireEvent.click(copySnippetBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
    });
  });

  it("should revoke key when clicking delete button", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    vi.mocked(actionsModule.listTenantApiKeysAction).mockResolvedValue({
      success: true,
      keys: [
        {
          id: "key-to-del",
          name: "Old Key",
          key_prefix: "kt_live_old...",
          scopes: [],
          last_used_at: null,
          created_at: "2026-09-20",
        },
      ],
    });
    vi.mocked(actionsModule.revokeTenantApiKeyAction).mockResolvedValueOnce({
      success: true,
    });

    render(<McpConnectCard />);

    await waitFor(() => {
      expect(screen.getByText("Old Key")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle("Revocar Clave");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(actionsModule.revokeTenantApiKeyAction).toHaveBeenCalledWith("key-to-del");
    });
  });
});
