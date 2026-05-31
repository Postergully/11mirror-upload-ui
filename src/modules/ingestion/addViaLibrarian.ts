import { librarianBaseUrl } from "./librarianConfig";

export interface LibrarianBatchResponse {
  batch_id: string;
  tenant: string;
  status: string;
  inputs: { files: unknown[]; urls: string[]; local_paths: string[] };
  expanded_count: number;
  created_at: string;
}

async function postBatch(
  body: FormData | string,
  contentType: string | null,
  tenant: string,
  dataset?: { id?: string; name?: string },
): Promise<LibrarianBatchResponse> {
  const headers: Record<string, string> = { "X-Tenant": tenant };
  if (dataset?.name) headers["X-Dataset"] = dataset.name;
  if (contentType) headers["Content-Type"] = contentType;
  const res = await fetch(`${librarianBaseUrl()}/ingest/batch`, {
    method: "POST", headers, body,
  });
  if (res.status === 429) {
    const msg = await res.text();
    throw new Error(`Another batch is in progress for this tenant. ${msg}`);
  }
  if (!res.ok) {
    throw new Error(`Librarian batch failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function addFilesViaLibrarian(
  dataset: { id?: string; name?: string },
  files: File[],
  tenant: string,
): Promise<{ dataset_id: string | null; dataset_name: string | null; batch_id: string }> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f, f.name);
  if (dataset.name) fd.append("dataset", dataset.name);
  const r = await postBatch(fd, null, tenant, dataset);
  return { dataset_id: dataset.id ?? null, dataset_name: dataset.name ?? null, batch_id: r.batch_id };
}

export async function addUrlViaLibrarian(
  dataset: { id?: string; name?: string },
  url: string,
  tenant: string,
): Promise<{ dataset_id: string | null; dataset_name: string | null; batch_id: string }> {
  const r = await postBatch(
    JSON.stringify({ urls: [url], dataset: dataset.name }),
    "application/json",
    tenant, dataset,
  );
  return { dataset_id: dataset.id ?? null, dataset_name: dataset.name ?? null, batch_id: r.batch_id };
}
