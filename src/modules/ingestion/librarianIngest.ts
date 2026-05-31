/**
 * Call the librarian_ingest MCP tool via the gateway.
 * Single-shot: takes any path (local dir, file, URL, sqlite://…) and hands it to
 * the librarian router. Returns the orchestrator's summary JSON.
 */
import { librarianBaseUrl } from "./librarianConfig";

export interface LibrarianIngestResult {
  status: "ok" | "error";
  run_id?: string;
  classified_as?: string;
  classifier_confidence?: number;
  classifier_reason?: string;
  source_uri?: string;
  source_kind?: string;
  chunks_dispatched?: number;
  engines?: {
    cognee?: { written: number };
    fbrain?: { written: number };
    skipped?: number;
  };
  error?: string;
}

export async function librarianIngest(
  path: string,
  dataset: string,
  tenant: string = "default",
  bearerToken?: string,
): Promise<LibrarianIngestResult> {
  const url = `${librarianBaseUrl()}/mcp`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

  const body = {
    jsonrpc: "2.0",
    id: `ui-librarian-ingest-${Date.now()}`,
    method: "tools/call",
    params: {
      name: "librarian_ingest",
      arguments: { path, tenant, dataset },
    },
  };

  const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await resp.text();

  // Gateway returns SSE-framed JSON for tool calls.
  let payload: any;
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    payload = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
  } else {
    payload = JSON.parse(text);
  }

  if (payload?.result?.isError) {
    return { status: "error", error: payload.result.content?.[0]?.text ?? "unknown error" };
  }
  const inner = payload?.result?.content?.[0]?.text;
  if (!inner) return { status: "error", error: "empty response from gateway" };
  try {
    return JSON.parse(inner) as LibrarianIngestResult;
  } catch {
    return { status: "error", error: `non-JSON response: ${inner.slice(0, 200)}` };
  }
}
