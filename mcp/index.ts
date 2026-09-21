#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKittnMcpServer } from "./server.js";

async function main() {
  const server = createKittnMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KittnOS MCP Server iniciado y escuchando en stdio");
}

main().catch((error) => {
  console.error("Error fatal en KittnOS MCP Server:", error);
  process.exit(1);
});
