import { CogneeInstance } from "../instances/types";
import { addUrlViaLibrarian } from "./addViaLibrarian";
import { uploadFile } from "@/modules/librarian/client";

function tenantOf(instance: CogneeInstance): string {
  return (instance as any).tenant ?? "default";
}

/**
 * Phase 3 wiring: upload form goes through the new librarian POST /api/upload
 * endpoint (one file per request). The librarian fans out to both cognee and
 * fbrain engines server-side. The legacy /ingest/batch path is retained for
 * URL imports until the librarian exposes a URL-import endpoint.
 */
export default async function addData(
  dataset: { id?: string; name?: string },
  files: File[],
  _instance: CogneeInstance,
): Promise<any> {
  const datasetName = dataset.name ?? "default";
  // Submit each file to the librarian. Returns immediately with a job_id;
  // the librarian processes asynchronously and the Activity tab shows progress.
  const jobIds: string[] = [];
  for (const f of files) {
    const r = await uploadFile(f, datasetName);
    jobIds.push(r.job_id);
  }
  // Shape-compatible with old Cognee response (dataset_id, dataset_name) +
  // new job_ids field for callers that want to poll.
  return {
    dataset_id: dataset.id ?? null,
    dataset_name: dataset.name ?? null,
    job_ids: jobIds,
  };
}

export async function addUrlData(
  dataset: { id?: string; name?: string },
  url: string,
  instance: CogneeInstance,
): Promise<any> {
  const r = await addUrlViaLibrarian(dataset, url, tenantOf(instance));
  return { dataset_id: r.dataset_id, dataset_name: r.dataset_name };
}
