"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Copy,
  Check,
  Key,
  ShieldCheck,
  Terminal,
  Trash2,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  createTenantApiKeyAction,
  listTenantApiKeysAction,
  revokeTenantApiKeyAction,
} from "@/lib/mcp/auth";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
}

export function McpConnectCard() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingKeys, setFetchingKeys] = useState(true);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<"claude" | "cursor" | "cli">("claude");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchKeys = async () => {
    setFetchingKeys(true);
    try {
      const res = await listTenantApiKeysAction();
      if (res.success && res.keys) {
        setKeys(res.keys as ApiKeyItem[]);
      }
    } catch {
      // Silencioso en render inicial
    } finally {
      setFetchingKeys(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await createTenantApiKeyAction("Claude / Cursor Assistant");
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.success && res.key) {
        setCreatedKey(res.key.rawKey);
        await fetchKeys();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al generar la clave");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("¿Deseas revocar esta clave de acceso? Tu asistente de IA perderá conexión.")) {
      return;
    }
    try {
      const res = await revokeTenantApiKeyAction(id);
      if (res.success) {
        if (createdKey) setCreatedKey(null);
        await fetchKeys();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al revocar la clave");
    }
  };

  const currentDisplayKey = createdKey || (keys.length > 0 ? `${keys[0].key_prefix}` : "kt_live_TU_API_KEY");

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        kittnos: {
          command: "npx",
          args: ["-y", "@trykittn/mcp"],
          env: {
            KITTN_API_KEY: currentDisplayKey,
          },
        },
      },
    },
    null,
    2,
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        kittnos: {
          command: "npx",
          args: ["-y", "@trykittn/mcp"],
          env: {
            KITTN_API_KEY: currentDisplayKey,
          },
        },
      },
    },
    null,
    2,
  );

  const cliSnippet = `KITTN_API_KEY="${currentDisplayKey}" npx -y @trykittn/mcp`;

  const getActiveSnippet = () => {
    if (activeTab === "claude") return claudeConfig;
    if (activeTab === "cursor") return cursorConfig;
    return cliSnippet;
  };

  const handleCopyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getActiveSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-light">
                Conectar con Asistentes de IA (MCP)
              </h3>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-extrabold uppercase rounded-md tracking-wider border border-primary/20">
                1-Click Setup
              </span>
            </div>
            <p className="text-xs text-text-light/60 mt-0.5">
              Conecta Claude Desktop, Cursor o ChatGPT para consultar ventas, inventario y comandas en tiempo real.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateKey}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-dark font-extrabold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition active:scale-95 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {keys.length > 0 ? "Generar Nueva Clave" : "Activar Conexión IA"}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Alerta de Clave Recién Creada */}
      {createdKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="h-4 w-4" />
            ¡Nueva clave generada con éxito!
          </div>
          <p className="text-xs text-emerald-200/70">
            Copia esta clave ahora. Por seguridad, no se volverá a mostrar completa.
          </p>
          <div className="flex items-center gap-2 bg-dark/40 border border-emerald-500/30 rounded-lg p-2.5">
            <code className="font-mono text-xs text-emerald-300 flex-1 break-all">
              {createdKey}
            </code>
            <button
              type="button"
              onClick={handleCopyKey}
              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-md transition cursor-pointer shrink-0"
              title="Copiar Clave"
            >
              {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Guía en 3 Pasos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-dark/20 border border-border/50 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
            Paso 1
          </div>
          <div className="text-xs font-bold text-text-light">Genera tu clave</div>
          <p className="text-[11px] text-text-light/50">
            Crea una API Key segura con acceso de solo lectura a tus métricas.
          </p>
        </div>

        <div className="bg-dark/20 border border-border/50 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
            Paso 2
          </div>
          <div className="text-xs font-bold text-text-light">Pega la configuración</div>
          <p className="text-[11px] text-text-light/50">
            Copia el bloque JSON para Claude Desktop o Cursor con 1 clic.
          </p>
        </div>

        <div className="bg-dark/20 border border-border/50 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
            Paso 3
          </div>
          <div className="text-xs font-bold text-text-light">Pregúntale a tu IA</div>
          <p className="text-[11px] text-text-light/50">
            Pide reportes como: &quot;¿Cuáles fueron las ventas de hoy y qué platillo se vendió más?&quot;
          </p>
        </div>
      </div>

      {/* Snippet de Configuración con Pestañas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-dark/30 p-1 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab("claude")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "claude"
                  ? "bg-primary text-dark shadow-sm"
                  : "text-text-light/60 hover:text-text-light"
              }`}
            >
              Claude Desktop
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cursor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "cursor"
                  ? "bg-primary text-dark shadow-sm"
                  : "text-text-light/60 hover:text-text-light"
              }`}
            >
              Cursor IDE
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cli")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "cli"
                  ? "bg-primary text-dark shadow-sm"
                  : "text-text-light/60 hover:text-text-light"
              }`}
            >
              Terminal / NPX
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopySnippet}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs font-bold text-text-light rounded-xl transition active:scale-95 cursor-pointer"
          >
            {copiedSnippet ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-text-light/70" />
                <span>
                  {activeTab === "claude"
                    ? "Copiar para Claude Desktop"
                    : activeTab === "cursor"
                    ? "Copiar para Cursor"
                    : "Copiar Comando"}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="relative group">
          <pre className="p-4 bg-dark/60 border border-border/80 rounded-xl font-mono text-xs text-text-light/80 overflow-x-auto selection:bg-primary/20">
            {getActiveSnippet()}
          </pre>
        </div>
      </div>

      {/* Lista de Claves Activas */}
      <div className="border-t border-border pt-5 space-y-3">
        <h4 className="text-xs font-extrabold uppercase text-text-light/60 tracking-wider flex items-center gap-2">
          <Key className="h-3.5 w-3.5" />
          Claves de Conexión Activas ({keys.length})
        </h4>

        {fetchingKeys ? (
          <div className="text-xs text-text-light/40 py-2">Cargando claves...</div>
        ) : keys.length === 0 ? (
          <div className="text-xs text-text-light/40 py-2">
            No tienes claves de IA activas. Haz clic en &quot;Activar Conexión IA&quot; para generar tu primera clave.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((k) => (
              <div
                key={k.id}
                className="py-2.5 flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-text-light flex items-center gap-2">
                    <span>{k.name}</span>
                    <code className="text-[11px] font-mono text-text-light/50 bg-dark/30 px-1.5 py-0.5 rounded">
                      {k.key_prefix}
                    </code>
                  </div>
                  <div className="text-[10px] text-text-light/40">
                    Creada el {new Date(k.created_at).toLocaleDateString()} •{" "}
                    {k.last_used_at
                      ? `Último uso: ${new Date(k.last_used_at).toLocaleDateString()}`
                      : "Aún no utilizada"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevokeKey(k.id)}
                  className="p-1.5 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                  title="Revocar Clave"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
